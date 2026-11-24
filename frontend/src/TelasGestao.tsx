import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import {
  request,
  type Event,
  type Room,
  type Session,
  type Report,
  type Ticket,
} from "./api";
import {
  C,
  s,
  Button,
  Choice,
  Heading,
  Field,
  Tag,
  Empty,
  money,
  date,
} from "./interface";
type Notify = (text: string, error?: boolean) => void;
export function Cadastros({
  events,
  rooms,
  sessions,
  reload,
  notify,
}: {
  events: Event[];
  rooms: Room[];
  sessions: Session[];
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [tab, setTab] = useState("events"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [type, setType] = useState("FILME"),
    [roomName, setRoomName] = useState(""),
    [layout, setLayout] = useState(""),
    [eventId, setEventId] = useState(""),
    [roomId, setRoomId] = useState(""),
    [day, setDay] = useState(""),
    [hour, setHour] = useState(""),
    [price, setPrice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      if (tab === "events") {
        await request("/gerencia/eventos", "POST", {
          title,
          description,
          type,
        });
        setTitle("");
        setDescription("");
      }
      if (tab === "rooms") {
        const seats = layout
          .trim()
          .split("\n")
          .flatMap((line) => {
            const [row, numbers] = line.split(":");
            if (!row?.trim() || !numbers)
              throw new Error(
                "Use o formato A: 1,2,3, com uma fila por linha.",
              );
            return numbers
              .split(",")
              .map((n) => ({ row: row.trim(), number: Number(n.trim()) }));
          });
        await request("/gerencia/salas", "POST", { name: roomName, assentos: seats });
        setRoomName("");
        setLayout("");
      }
      if (tab === "sessions") {
        await request("/gerencia/sessoes", "POST", {
          eventId,
          roomId,
          startsAt: toISO(day, hour),
          price: price.replace(",", "."),
        });
        setDay("");
        setHour("");
        setPrice("");
      }
      notify("Cadastro realizado.");
      await reload();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="GERÊNCIA"
        title="Organize cada sessão"
        description="Cadastre filmes ou eventos, salas e sessões."
      />
      <Choice
        label="Cadastros"
        value={tab}
        onChange={setTab}
        options={[
          { value: "events", label: "Filmes e eventos" },
          { value: "rooms", label: "Salas e assentos" },
          { value: "sessions", label: "Sessões" },
        ]}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 22,
          alignItems: "flex-start",
        }}
      >
        <View style={[s.card, { padding: 26, flexGrow: 1, flexBasis: 360 }]}>
          <Text style={[s.cardTitle, { marginBottom: 22 }]}>
            {tab === "events"
              ? "Novo filme ou evento"
              : tab === "rooms"
                ? "Nova sala"
                : "Nova sessão"}
          </Text>
          {tab === "events" ? (
            <>
              <Choice
                label="Tipo"
                value={type}
                onChange={setType}
                options={[
                  { value: "FILME", label: "Filme" },
                  { value: "EVENTO", label: "Evento" },
                ]}
              />
              <Field
                label="Título"
                value={title}
                onChangeText={setTitle}
                placeholder="Nome do filme ou evento"
              />
              <Field
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Uma breve descrição"
              />
            </>
          ) : tab === "rooms" ? (
            <>
              <Field
                label="Nome da sala"
                value={roomName}
                onChangeText={setRoomName}
                placeholder="Nome para identificar a sala"
              />
              <Field
                label="Assentos por fila"
                value={layout}
                onChangeText={setLayout}
                multiline
                placeholder={"A: 1,2,3,4\nB: 1,2,3,4"}
              />
              <Text style={[s.hint, { marginBottom: 20 }]}>
                Informe uma fila por linha, seguida dos números dos assentos.
                Esse será o conjunto fixo de lugares da sala.
              </Text>
            </>
          ) : (
            <>
              <Choice
                label="Filme ou evento"
                value={eventId}
                onChange={setEventId}
                options={events.map((e) => ({ value: e.id, label: e.title }))}
              />
              <Choice
                label="Sala"
                value={roomId}
                onChange={setRoomId}
                options={rooms.map((r) => ({
                  value: r.id,
                  label: r.name + " · " + r.assentos.length + " assentos",
                }))}
              />
              <Field
                label="Data (DD/MM/AAAA)"
                value={day}
                onChangeText={setDay}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label="Horário de Brasília (HH:mm)"
                value={hour}
                onChangeText={setHour}
                placeholder="HH:mm"
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label="Preço do ingresso (R$)"
                value={price}
                onChangeText={setPrice}
                placeholder="0,00"
                keyboardType="decimal-pad"
              />
            </>
          )}
          <Button
            label={busy ? "Salvando…" : "Salvar cadastro"}
            onPress={submit}
            disabled={busy}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 320, gap: 12 }}>
          <Text style={[s.cardTitle, { marginBottom: 6 }]}>Já cadastrados</Text>
          {tab === "events"
            ? events.map((e) => (
                <View key={e.id} style={[s.card, { padding: 20, gap: 9 }]}>
                  <Text style={s.cardTitle}>{e.title}</Text>
                  <Tag
                    label={e.type === "FILME" ? "Filme" : "Evento"}
                    tone="gray"
                  />
                  {e.description ? (
                    <Text style={s.description}>{e.description}</Text>
                  ) : null}
                </View>
              ))
            : tab === "rooms"
              ? rooms.map((r) => (
                  <View key={r.id} style={[s.card, { padding: 20, gap: 9 }]}>
                    <Text style={s.cardTitle}>{r.name}</Text>
                    <Text style={s.description}>
                      {r.assentos.length} assentos · Filas{" "}
                      {[...new Set(r.assentos.map((seat) => seat.row))].join(", ")}
                    </Text>
                  </View>
                ))
              : sessions.map((ss) => (
                  <View key={ss.id} style={[s.card, { padding: 20, gap: 9 }]}>
                    <Text style={s.cardTitle}>{ss.event.title}</Text>
                    <Text style={s.description}>
                      {ss.room.name} · {date(ss.startsAt)}
                    </Text>
                    <Text style={{ color: C.teal, fontWeight: "600" }}>
                      {money(ss.price)}
                    </Text>
                  </View>
                ))}
        </View>
      </View>
    </>
  );
}
export function toISO(day: string, hour = "00:00") {
  const parts = day.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!parts || !/^\d{2}:\d{2}$/.test(hour))
    throw new Error("Informe uma data no formato DD/MM/AAAA e horário HH:mm.");
  const value = new Date(
    parts[3] + "-" + parts[2] + "-" + parts[1] + "T" + hour + ":00-03:00",
  );
  if (
    Number.isNaN(value.getTime()) ||
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
      value,
    ) !== day.trim()
  )
    throw new Error("Informe uma data e um horário válidos.");
  return value.toISOString();
}
export function Relatorios({
  sessions,
  notify,
}: {
  sessions: Session[];
  notify: Notify;
}) {
  const [rows, setRows] = useState<Report[]>([]),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [sessionId, setSessionId] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("inicio", toISO(from));
      if (to)
        params.set(
          "fim",
          new Date(
            new Date(toISO(to, "23:59")).getTime() + 59999,
          ).toISOString(),
        );
      if (sessionId) params.set("sessaoId", sessionId);
      setRows(
        await request<Report[]>(
          "/gerencia/relatorios/sessoes?" + params.toString(),
        ),
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <Heading
        eyebrow="RELATÓRIOS GERENCIAIS"
        title="Cada sessão em números"
        description="Acompanhe as vendas e a taxa de ocupação por sessão."
      />
      <View style={[s.card, { padding: 24, marginBottom: 24 }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
          <View style={{ flex: 1, minWidth: 170 }}>
            <Field
              label="Data inicial (DD/MM/AAAA)"
              value={from}
              onChangeText={setFrom}
              placeholder="Todas as datas"
            />
          </View>
          <View style={{ flex: 1, minWidth: 170 }}>
            <Field
              label="Data final (DD/MM/AAAA)"
              value={to}
              onChangeText={setTo}
              placeholder="Todas as datas"
            />
          </View>
        </View>
        <Choice
          label="Sessão"
          value={sessionId}
          onChange={setSessionId}
          options={[
            { value: "", label: "Todas as sessões" },
            ...sessions.map((ss) => ({
              value: ss.id,
              label: ss.event.title + " · " + date(ss.startsAt),
            })),
          ]}
        />
        <Button
          label={busy ? "Consultando…" : "Aplicar filtros"}
          disabled={busy}
          onPress={load}
        />
      </View>
      <View style={[s.wrap, { gap: 17, marginBottom: 25 }]}>
        {[
          { label: "SESSÕES", value: String(rows.length) },
          {
            label: "INGRESSOS VENDIDOS",
            value: String(rows.reduce((a, r) => a + r.vendidos, 0)),
          },
          {
            label: "RECEITA CONFIRMADA",
            value: money(rows.reduce((a, r) => a + Number(r.receita), 0)),
          },
        ].map((metric) => (
          <View
            key={metric.label}
            style={[s.card, { padding: 22, flex: 1, minWidth: 190 }]}
          >
            <Text style={s.hint}>{metric.label}</Text>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "500",
                color: C.text,
                marginTop: 12,
              }}
            >
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[s.card, { minWidth: 850, flex: 1 }]}>
          <View style={[s.tableRow, { backgroundColor: "#EDF2F2" }]}>
            {[
              "Sessão",
              "Sala",
              "Vendidos / lugares",
              "Utilizados",
              "Ocupação",
              "Receita",
            ].map((v, i) => (
              <Text key={v} style={[s.tableHead, { flex: i === 0 ? 2.2 : 1 }]}>
                {v}
              </Text>
            ))}
          </View>
          {rows.map((row) => (
            <View key={row.sessaoId} style={s.tableRow}>
              <View style={{ flex: 2.2, gap: 5 }}>
                <Text style={{ color: C.text, fontWeight: "600" }}>
                  {row.title}
                </Text>
                <Text style={s.hint}>{date(row.startsAt)}</Text>
              </View>
              <Text style={s.tableCell}>{row.room}</Text>
              <Text style={s.tableCell}>
                {row.vendidos} / {row.capacidade}
              </Text>
              <Text style={s.tableCell}>{row.utilizados}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.teal, fontWeight: "600" }}>
                  {Number(row.taxaOcupacao).toLocaleString("pt-BR")}%
                </Text>
                <View
                  style={{
                    height: 4,
                    backgroundColor: C.tealLight,
                    marginTop: 8,
                    marginRight: 20,
                    borderRadius: 4,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      backgroundColor: C.teal,
                      width: (Number(row.taxaOcupacao) + "%") as `${number}%`,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
              <Text style={s.tableCell}>{money(row.receita)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {!rows.length && !busy ? (
        <Empty
          title="Nenhuma sessão no período"
          description="Ajuste os filtros ou cadastre uma sessão para acompanhar os resultados."
        />
      ) : null}
      <Text style={[s.hint, { marginTop: 18 }]}>
        Ocupação = ingressos vendidos ÷ capacidade da sessão. Reservas sem
        pagamento não contam como venda.
      </Text>
    </>
  );
}
export function Validacao({ notify }: { notify: Notify }) {
  const [code, setCode] = useState(""),
    [result, setResult] = useState<Ticket | null>(null),
    [busy, setBusy] = useState(false);
  async function validate() {
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await request<Ticket>("/bilheteria/ingressos/validar", "POST", {
          codigo: code,
        }),
      );
      setCode("");
      notify("Entrada validada. O ingresso foi marcado como utilizado.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="CONTROLE DE ENTRADA"
        title="Pode entrar."
        description="Informe o código para validar o ingresso e registrar a entrada."
      />
      <View style={[s.card, { padding: 30, maxWidth: 700 }]}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            backgroundColor: C.tealLight,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          <Text style={{ color: C.teal, fontSize: 30 }}>✓</Text>
        </View>
        <Field
          label="Código do ingresso"
          placeholder="Digite o código apresentado"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          onSubmitEditing={validate}
        />
        <Button
          label={busy ? "Validando…" : "Validar ingresso"}
          onPress={validate}
          disabled={busy || !code.trim()}
        />
        <Text style={[s.hint, { marginTop: 18 }]}>
          Cada ingresso pode ser utilizado uma única vez.
        </Text>
      </View>
      {result ? (
        <View
          style={[
            s.card,
            {
              maxWidth: 700,
              padding: 28,
              marginTop: 20,
              borderColor: "#ABD2C8",
              gap: 13,
            },
          ]}
        >
          <Tag label="Entrada confirmada" />
          <Text style={s.cardTitle}>
            {result.sessionSeat.session.event.title}
          </Text>
          <Text style={s.description}>
            {result.sessionSeat.session.room.name} · Assento{" "}
            {result.sessionSeat.seat.row}
            {result.sessionSeat.seat.number}
          </Text>
          <Text style={s.hint}>
            {date(result.sessionSeat.session.startsAt)}
          </Text>
        </View>
      ) : null}
    </>
  );
}
