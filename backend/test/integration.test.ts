import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "Defina TEST_DATABASE_URL para um banco PostgreSQL dedicado aos testes.",
  );
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || randomUUID() + randomUUID();
process.env.RESERVATION_TTL_SECONDS = "600";
const { app } = await import("../src/app.js");
const { prisma } = await import("../src/repositories/database.js");
const { expirarReservas } = await import(
  "../src/services/reserva.servico.js"
);
const suffix = randomUUID();
let client: string,
  other: string,
  op: string,
  clientId: string,
  eventId: string,
  roomId: string;
const auth = (token: string) => ({ Authorization: "Bearer " + token });
async function makeSession(price = "25.00", at = "2026-11-24T22:00:00.000Z") {
  const res = await request(app)
    .post("/api/gerencia/sessoes")
    .set(auth(op))
    .send({ eventId, roomId, startsAt: at, price });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const map = await request(app)
    .get("/api/sessoes/" + res.body.id + "/assentos")
    .set(auth(client));
  return { id: res.body.id, seats: map.body.assentos as { id: string }[] };
}
async function reservarAssentos(sessionId: string, ids: string[], token = client) {
  return request(app)
    .post("/api/reservas")
    .set(auth(token))
    .send({ sessaoId: sessionId, assentosSessaoIds: ids });
}
const pagarReserva = (id: string, token = client) =>
  request(app)
    .post("/api/reservas/" + id + "/pagamento-simulado")
    .set(auth(token))
    .send({});
before(async () => {
  async function signup(name: string) {
    const email = name + "-" + suffix + "@example.test";
    const result = await request(app)
      .post("/api/auth/cadastro")
      .send({
        name,
        email,
        password: "senha apenas de teste",
        perfil: "OPERADOR",
      });
    assert.equal(result.status, 201);
    assert.equal(result.body.usuario.perfil, "CLIENTE");
    assert.equal(result.body.usuario.passwordHash, undefined);
    return result.body;
  }
  const first = await signup("cliente");
  client = first.token;
  clientId = first.usuario.id;
  other = (await signup("outro")).token;
  const oper = await signup("operador");
  await prisma.usuario.update({
    where: { id: oper.usuario.id },
    data: { perfil: "OPERADOR" },
  });
  const login = await request(app)
    .post("/api/autenticacao/entrar")
    .send({ email: oper.usuario.email, password: "senha apenas de teste" });
  op = login.body.token;
  const event = await request(app)
    .post("/api/gerencia/eventos")
    .set(auth(op))
    .send({
      title: "Filme teste " + suffix,
      type: "FILME",
      description: "Dados de teste, não incluídos automaticamente em produção.",
    });
  assert.equal(event.status, 201);
  eventId = event.body.id;
  const room = await request(app)
    .post("/api/gerencia/salas")
    .set(auth(op))
    .send({
      name: "Sala teste " + suffix,
      assentos: [1, 2, 3, 4, 5, 6].map((number) => ({ row: "A", number })),
    });
  assert.equal(room.status, 201);
  roomId = room.body.id;
});
after(async () => {
  await prisma.$disconnect();
});
test("autenticação: senha incorreta é recusada; dados privados não são expostos", async () => {
  const res = await request(app)
    .post("/api/autenticacao/entrar")
    .send({
      email: "cliente-" + suffix + "@example.test",
      password: "incorreta",
    });
  assert.equal(res.status, 401);
  const me = await request(app).get("/api/autenticacao/usuario-atual").set(auth(client));
  assert.equal(me.body.id, clientId);
  assert.equal(me.body.passwordHash, undefined);
  assert.equal((await request(app).get("/api/me/ingressos")).status, 401);
});
test("cliente não cadastra conteúdo, não acessa relatório e não valida ingressos", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/gerencia/eventos")
        .set(auth(client))
        .send({ title: "x", type: "EVENTO" })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/gerencia/relatorios/sessoes")
        .set(auth(client))
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/bilheteria/ingressos/validar")
        .set(auth(client))
        .send({ codigo: "x" })
    ).status,
    403,
  );
});
test("cadastros: assentos duplicados são recusados e sessão possui o inventário da sala", async () => {
  const duplicate = await request(app)
    .post("/api/gerencia/salas")
    .set(auth(op))
    .send({
      name: "Duplicada",
      assentos: [
        { row: "A", number: 1 },
        { row: "A", number: 1 },
      ],
    });
  assert.equal(duplicate.status, 400);
  const ss = await makeSession();
  assert.equal(ss.seats.length, 6);
});
test("20 requisições de dois clientes pelo mesmo lugar: exatamente uma reserva", async () => {
  const ss = await makeSession();
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      reservarAssentos(ss.id, [ss.seats[0]!.id], i % 2 ? other : client),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(
    responses.filter((r) => r.status === 409).length,
    19,
    JSON.stringify(responses.map((r) => r.body)),
  );
  const winner = responses.find((r) => r.status === 201)!;
  const token = winner.body.userId === clientId ? client : other;
  assert.equal((await pagarReserva(winner.body.id, token)).status, 200);
  assert.equal(
    await prisma.ingresso.count({ where: { assentoSessaoId: ss.seats[0]!.id } }),
    1,
  );
});
test("reserva com vários assentos é integral e valor é calculado no servidor", async () => {
  const ss = await makeSession("12.50");
  const r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  assert.equal(r.status, 201);
  const failed = await reservarAssentos(
    ss.id,
    [ss.seats[0]!.id, ss.seats[1]!.id],
    other,
  );
  assert.equal(failed.status, 409);
  assert.equal(
    await prisma.reserva.count({ where: { sessaoId: ss.id } }),
    1,
  );
  const map = await request(app)
    .get("/api/sessoes/" + ss.id + "/assentos")
    .set(auth(other));
  assert.equal(
    map.body.assentos.find((v: any) => v.id === ss.seats[1]!.id).status,
    "LIVRE",
  );
  const total = await request(app)
    .post("/api/reservas")
    .set(auth(other))
    .send({
      sessaoId: ss.id,
      assentosSessaoIds: [ss.seats[1]!.id, ss.seats[2]!.id],
      total: "0.01",
      price: "0.01",
    });
  assert.equal(total.status, 201);
  assert.equal(total.body.total, "25");
});
test("assentos de sessões diferentes não podem ser misturados em uma reserva", async () => {
  const a = await makeSession(),
    b = await makeSession();
  assert.equal((await reservarAssentos(a.id, [b.seats[0]!.id])).status, 400);
  assert.equal(
    (await reservarAssentos(a.id, [a.seats[0]!.id, a.seats[0]!.id])).status,
    400,
  );
});
test("expiração libera assentos e mantém histórico da reserva", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  await prisma.reserva.update({
    where: { id: r.body.id },
    data: { expiraEm: new Date(0) },
  });
  await expirarReservas();
  const state = await prisma.reserva.findUniqueOrThrow({
    where: { id: r.body.id },
  });
  assert.equal(state.situacao, "EXPIRADA");
  assert.equal((await reservarAssentos(ss.id, [ss.seats[0]!.id], other)).status, 201);
  assert.equal(
    await prisma.itemReserva.count({ where: { reservaId: r.body.id } }),
    1,
  );
});
test("pagamento vencido é recusado e liberação é confirmada mesmo sem varredura", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  await prisma.reserva.update({
    where: { id: r.body.id },
    data: { expiraEm: new Date(0) },
  });
  assert.equal((await pagarReserva(r.body.id)).status, 409);
  assert.equal(
    (await prisma.reserva.findUniqueOrThrow({ where: { id: r.body.id } }))
      .situacao,
    "EXPIRADA",
  );
  assert.equal(
    await prisma.pagamento.count({ where: { reservaId: r.body.id } }),
    0,
  );
  assert.equal((await reservarAssentos(ss.id, [ss.seats[0]!.id], other)).status, 201);
});
test("pagamento e expiração simultâneos não vendem e liberam o mesmo lugar", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  await prisma.reserva.update({
    where: { id: r.body.id },
    data: { expiraEm: new Date(0) },
  });
  const [response] = await Promise.all([pagarReserva(r.body.id), expirarReservas()]);
  assert.equal(response.status, 409);
  assert.equal(
    await prisma.ingresso.count({ where: { assentoSessaoId: ss.seats[0]!.id } }),
    0,
  );
  const seat = await prisma.assentoSessao.findUniqueOrThrow({
    where: { id: ss.seats[0]!.id },
  });
  assert.equal(seat.reservaAtualId, null);
});
test("10 pagamentos simultâneos geram um pagamento e um ingresso por assento", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id, ss.seats[1]!.id]);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => pagarReserva(r.body.id)),
  );
  assert.equal(
    results.filter((v) => v.status === 200).length,
    10,
    JSON.stringify(results.map((v) => v.body)),
  );
  assert.equal(
    await prisma.pagamento.count({ where: { reservaId: r.body.id } }),
    1,
  );
  assert.equal(
    await prisma.ingresso.count({
      where: { item: { reservaId: r.body.id } },
    }),
    2,
  );
  const codes = results.map((v) =>
    v.body.items
      .map((i: any) => i.ticket.codigo)
      .sort()
      .join(","),
  );
  assert.equal(new Set(codes).size, 1);
});
test("cliente não acessa nem paga reserva ou ingresso de outra pessoa", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  assert.equal(
    (
      await request(app)
        .get("/api/reservas/" + r.body.id)
        .set(auth(other))
    ).status,
    403,
  );
  assert.equal((await pagarReserva(r.body.id, other)).status, 403);
  const paid = await pagarReserva(r.body.id);
  assert.equal(
    (
      await request(app)
        .get("/api/ingressos/" + paid.body.items[0].ticket.id)
        .set(auth(other))
    ).status,
    403,
  );
});
test("falha na emissão desfaz pagamento e ingressos da transação", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  await prisma.$executeRawUnsafe(
    'CREATE FUNCTION force_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.assento_sessao_id = \'' +
      ss.seats[0]!.id +
      "'::uuid THEN RAISE EXCEPTION 'falha de teste'; END IF; RETURN NEW; END $$",
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER fail_test_ticket BEFORE INSERT ON ingressos FOR EACH ROW EXECUTE FUNCTION force_test_failure()',
  );
  try {
    assert.equal((await pagarReserva(r.body.id)).status, 500);
    assert.equal(
      await prisma.pagamento.count({ where: { reservaId: r.body.id } }),
      0,
    );
    assert.equal(
      await prisma.ingresso.count({ where: { assentoSessaoId: ss.seats[0]!.id } }),
      0,
    );
    assert.equal(
      (await prisma.reserva.findUniqueOrThrow({ where: { id: r.body.id } }))
        .situacao,
      "PENDENTE",
    );
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_test_ticket ON ingressos');
    await prisma.$executeRawUnsafe("DROP FUNCTION force_test_failure()");
  }
});
test("validação simultânea permite um único uso e a trigger registra emissão e uso", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]),
    paid = await pagarReserva(r.body.id);
  const ticket = paid.body.items[0].ticket;
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      request(app)
        .post("/api/bilheteria/ingressos/validar")
        .set(auth(op))
        .send({ codigo: ticket.codigo }),
    ),
  );
  assert.equal(results.filter((v) => v.status === 200).length, 1);
  assert.equal(results.filter((v) => v.status === 409).length, 9);
  const logs = await prisma.auditoriaIngresso.findMany({
    where: { ingressoId: ticket.id },
    orderBy: { id: "asc" },
  });
  assert.equal(logs.length, 2);
  assert.equal(logs[0]!.acao, "INSERCAO");
  assert.equal(logs[1]!.acao, "ATUALIZACAO");
  assert.ok(logs[1]!.usoAtualEm);
  assert.equal(
    (
      await request(app)
        .post("/api/bilheteria/ingressos/validar")
        .set(auth(op))
        .send({ codigo: "INEXISTENTE" })
    ).status,
    404,
  );
});
test("mesmo assento físico pode ser vendido em sessões diferentes", async () => {
  const a = await makeSession(),
    b = await makeSession();
  const ra = await reservarAssentos(a.id, [a.seats[0]!.id]),
    rb = await reservarAssentos(b.id, [b.seats[0]!.id]);
  assert.equal((await pagarReserva(ra.body.id)).status, 200);
  assert.equal((await pagarReserva(rb.body.id)).status, 200);
});
test("venda de balcão funciona sem exigir conta ou documento adicional do comprador", async () => {
  const ss = await makeSession();
  const result = await request(app)
    .post("/api/bilheteria/vendas")
    .set(auth(op))
    .send({ sessaoId: ss.id, assentosSessaoIds: [ss.seats[0]!.id] });
  assert.equal(result.status, 201);
  assert.equal(result.body.status, "PAGA");
  assert.equal(result.body.channel, "BALCAO");
});
test("procedure e relatório calculam receita e ocupação sem multiplicar pagamentos", async () => {
  const ss = await makeSession("12.50"),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id, ss.seats[1]!.id]),
    paid = await pagarReserva(r.body.id);
  await request(app)
    .post("/api/bilheteria/ingressos/validar")
    .set(auth(op))
    .send({ codigo: paid.body.items[0].ticket.codigo });
  const response = await request(app)
    .get("/api/gerencia/relatorios/sessoes?sessaoId=" + ss.id)
    .set(auth(op));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const row = response.body[0];
  assert.equal(row.capacidade, 6);
  assert.equal(row.vendidos, 2);
  assert.equal(row.utilizados, 1);
  assert.equal(row.receita, "25.00");
  assert.equal(row.taxaOcupacao, 33.33);
  const blank = await makeSession();
  const zero = await request(app)
    .get("/api/gerencia/relatorios/sessoes?sessaoId=" + blank.id)
    .set(auth(op));
  assert.equal(zero.body[0].receita, "0.00");
  assert.equal(zero.body[0].taxaOcupacao, 0);
});
test("unicidade no banco impede duplicar ingresso e FK impede lugar de outra sala", async () => {
  const ss = await makeSession(),
    r = await reservarAssentos(ss.id, [ss.seats[0]!.id]),
    paid = await pagarReserva(r.body.id);
  await assert.rejects(
    () =>
      prisma.ingresso.create({
        data: {
          itemReservaId: paid.body.items[0].id,
          assentoSessaoId: ss.seats[0]!.id,
          codigo: randomUUID(),
        },
      }),
    (e: any) => e.code === "P2002",
  );
  const otherRoom = await prisma.sala.create({
    data: {
      nome: "Outra " + suffix,
      seats: { create: { fila: "Z", numero: 1 } },
    },
    include: { seats: true },
  });
  await assert.rejects(
    () =>
      prisma.assentoSessao.create({
        data: { sessaoId: ss.id, salaId: roomId, assentoId: otherRoom.seats[0]!.id },
      }),
    (e: any) => e.code === "P2003",
  );
});
test("não impõe horário futuro ou exclusividade de horário que o PDF não exige", async () => {
  const a = await makeSession("0.00", "2000-01-01T15:00:00.000Z"),
    b = await makeSession("0.00", "2000-01-01T15:00:00.000Z");
  assert.notEqual(a.id, b.id);
  assert.equal((await reservarAssentos(a.id, [a.seats[0]!.id])).status, 201);
});
test("saúde e especificação da API são acessíveis", async () => {
  assert.equal((await request(app).get("/api/health")).status, 200);
  const spec = await request(app).get("/api/openapi.json");
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, "3.0.3");
  assert.ok(spec.body.paths["/reservas"]);
});

test("plano revisado: rotas, cookie e campos não listados são preservados", async () => {
  for (const path of ["/api/auth/me", "/api/auth/login"])
    assert.equal((await request(app)[path.endsWith("login") ? "post" : "get"](path).set(auth(op))).status, 404);
  const me = await request(app).get("/api/autenticacao/usuario-atual").set(auth(client));
  assert.equal(me.status, 200);
  assert.equal(me.body.perfil, "CLIENTE");
  assert.equal(typeof me.body.name, "string");
  assert.equal(me.body.nome, undefined);
  const denied = await request(app).get("/api/autenticacao/usuario-atual");
  assert.equal(denied.status, 401);
  assert.equal(denied.body.erro.codigo, "UNAUTHENTICATED");
  assert.equal(typeof denied.body.erro.mensagem, "string");
  assert.equal(denied.body.error, undefined);
  const ss = await makeSession("12.50");
  const session = await request(app).get("/api/sessoes/" + ss.id);
  assert.equal(Number(session.body.price), 12.5);
  assert.equal(typeof session.body.startsAt, "string");
  assert.equal(typeof session.body.room.name, "string");
  assert.equal(session.body.preco, undefined);
  const map = await request(app).get("/api/sessoes/" + ss.id + "/assentos").set(auth(client));
  assert.equal(typeof map.body.horarioServidor, "string");
  assert.equal(map.body.assentos[0].status, "LIVRE");
  assert.equal(typeof map.body.assentos[0].minhaReserva, "boolean");
  assert.equal(typeof map.body.assentos[0].row, "string");
  assert.equal(map.body.seats, undefined);
  const reservation = await reservarAssentos(ss.id, [ss.seats[0]!.id]);
  assert.equal(reservation.body.status, "PENDENTE");
  assert.equal(Number(reservation.body.total), 12.5);
  assert.equal(reservation.body.sessaoId, ss.id);
  assert.equal(reservation.body.valorTotal, undefined);
  const invalidPeriod = await request(app)
    .get("/api/gerencia/relatorios/sessoes?inicio=2026-12-01T00:00:00.000Z&fim=2026-11-01T00:00:00.000Z")
    .set(auth(op));
  assert.equal(invalidPeriod.status, 400);
  assert.equal(invalidPeriod.body.erro.codigo, "INVALID_PERIOD");
  const loggedOut = await request(app).post("/api/auth/logout").set(auth(client));
  assert.equal(loggedOut.status, 200);
  assert.ok(String(loggedOut.headers["set-cookie"]).startsWith("session="));
});
