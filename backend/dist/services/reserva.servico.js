import { randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { ErroAplicacao, idSchema, operator, parse } from "../errors.js";
import { transaction, bloquearSessao, horarioBanco, } from "../repositories/database.js";
import * as repo from "../repositories/booking.repository.js";
import * as catalog from "../repositories/catalogo.repositorio.js";
const selection = z.object({
    sessaoId: idSchema,
    assentosSessaoIds: z.array(idSchema).min(1),
});
async function locked(sessionId, work) {
    return transaction(async (tx) => {
        if (!(await bloquearSessao(tx, sessionId)))
            throw new ErroAplicacao(404, "NOT_FOUND", "Sessão não encontrada.");
        const time = await horarioBanco(tx);
        const expired = await repo.expired(tx, sessionId, time);
        if (expired.length)
            await repo.releaseExpired(tx, expired.map((r) => r.id));
        return work(tx, time);
    });
}
function own(actor, ownerId) {
    if (actor.id !== ownerId)
        throw new ErroAplicacao(403, "FORBIDDEN", "Você não tem acesso a esta reserva.");
}
export async function seatMap(actor, id) {
    const sessionId = parse(idSchema, id);
    return locked(sessionId, async (tx, time) => ({
        serverTime: time.toISOString(),
        seats: (await catalog.mapSeats(tx, sessionId)).map((s) => ({
            id: s.id,
            row: s.seat.fila,
            number: s.seat.numero,
            status: s.ticket ? "VENDIDO" : s.currentReservation ? "RESERVADO" : "LIVRE",
            mine: s.currentReservation?.usuarioId === actor.id,
        })),
    }));
}
async function createInTransaction(tx, time, actor, sessionId, ids, channel) {
    if (new Set(ids).size !== ids.length)
        throw new ErroAplicacao(400, "DUPLICATE_SEAT", "Selecione cada assento uma única vez.");
    const seats = await repo.selectedSeats(tx, sessionId, ids);
    if (seats.length !== ids.length)
        throw new ErroAplicacao(400, "INVALID_SEAT", "Todos os assentos devem pertencer à sessão escolhida.");
    if (seats.some((s) => s.ticket || s.reservaAtualId))
        throw new ErroAplicacao(409, "SEAT_UNAVAILABLE", "Um dos assentos já está reservado ou vendido. Atualize o mapa e escolha novamente.");
    const { preco: price } = await repo.sessionPrice(tx, sessionId);
    const expiresAt = new Date(time.getTime() + config.RESERVATION_TTL_SECONDS * 1000);
    return repo.insertReservation(tx, {
        sessaoId: sessionId,
        usuarioId: actor.id,
        canalVenda: channel,
        expiraEm: expiresAt,
        valorTotal: price.mul(ids.length),
    }, ids, price);
}
export async function reservarAssentos(actor, input) {
    const data = parse(selection, input);
    return locked(data.sessaoId, async (tx, time) => {
        const id = await createInTransaction(tx, time, actor, data.sessaoId, data.assentosSessaoIds, actor.perfil === "OPERADOR" ? "BALCAO" : "INTERNET");
        return repo.reservation(tx, id);
    });
}
export async function getReservation(actor, id) {
    const reservationId = parse(idSchema, id), ref = await repo.reservationSession(reservationId);
    if (!ref)
        throw new ErroAplicacao(404, "NOT_FOUND", "Reserva não encontrada.");
    own(actor, ref.usuarioId);
    return locked(ref.sessaoId, (tx) => repo.reservation(tx, reservationId));
}
async function payInTransaction(tx, actor, id) {
    const res = await repo.reservation(tx, id);
    if (!res)
        throw new ErroAplicacao(404, "NOT_FOUND", "Reserva não encontrada.");
    own(actor, res.usuarioId);
    if (res.situacao === "PAGA")
        return res;
    if (res.situacao === "EXPIRADA")
        return null;
    // A hora é conferida novamente, após o lock, imediatamente antes da decisão de pagar.
    if (res.expiraEm <= (await horarioBanco(tx))) {
        await repo.releaseExpired(tx, [id]);
        return null;
    }
    await repo.insertPayment(tx, id, res.valorTotal);
    for (const item of res.items)
        await repo.insertTicket(tx, {
            itemReservaId: item.id,
            assentoSessaoId: item.assentoSessaoId,
            codigo: randomBytes(12).toString("hex").toUpperCase(),
        });
    await repo.markPaid(tx, id);
    return repo.reservation(tx, id);
}
export async function pagarReserva(actor, id) {
    const reservationId = parse(idSchema, id), ref = await repo.reservationSession(reservationId);
    if (!ref)
        throw new ErroAplicacao(404, "NOT_FOUND", "Reserva não encontrada.");
    own(actor, ref.usuarioId);
    const result = await locked(ref.sessaoId, (tx) => payInTransaction(tx, actor, reservationId));
    // Responder fora da transação permite confirmar a liberação de uma reserva vencida.
    if (!result)
        throw new ErroAplicacao(409, "RESERVATION_EXPIRED", "Esta reserva expirou. Escolha os assentos novamente.");
    return result;
}
export async function counterSale(actor, input) {
    operator(actor);
    const data = parse(selection, input);
    const result = await locked(data.sessaoId, async (tx, time) => {
        const id = await createInTransaction(tx, time, actor, data.sessaoId, data.assentosSessaoIds, "BALCAO");
        return payInTransaction(tx, actor, id);
    });
    if (!result)
        throw new ErroAplicacao(409, "RESERVATION_EXPIRED", "A reserva expirou antes da confirmação da venda.");
    return result;
}
export async function expirarReservas() {
    // O relógio local serve apenas para encontrar candidatos. O prazo é decidido pelo relógio do banco sob lock.
    const sessions = await repo.expiredSessions(new Date());
    for (const s of sessions)
        await locked(s.sessaoId, async () => undefined);
}
//# sourceMappingURL=reserva.servico.js.map