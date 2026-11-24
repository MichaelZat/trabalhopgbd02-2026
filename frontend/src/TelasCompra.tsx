import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import type { Session, MapSeat, Reservation, Ticket } from "./api";
import {
  C,
  s,
  Heading,
  Button,
  Tag,
  Empty,
  money,
  date,
  day,
  time,
} from "./interface";
export function Catalogo({
  sessions,
  operator,
  loading,
  onRefresh,
  onChoose,
}: {
  sessions: Session[];
  operator: boolean;
  loading: boolean;
  onRefresh: () => void;
  onChoose: (v: Session) => void;
}) {
  const { width } = useWindowDimensions();
  return (
    <>
      <Heading
        eyebrow={
          operator
            ? "ATENDIMENTO PRESENCIAL"
            : "PROGRAME SUA PRÓXIMA EXPERIÊNCIA"
        }
        title={operator ? "Bilheteria" : "Escolha sua sessão"}
        description={
          operator
            ? "Selecione a sessão para iniciar uma venda no balcão."
            : "Encontre a sessão e escolha o lugar que combina com você."
        }
        action={
          <Button
            small
            secondary
            label="Atualizar"
            onPress={onRefresh}
            disabled={loading}
          />
        }
      />
      <View style={s.heroStrip}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text
            style={{
              color: "#98D1C5",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.5,
            }}
          >
            SEU LUGAR ESTÁ AQUI
          </Text>
          <Text
            style={{
              color: C.white,
              fontSize: 25,
              fontWeight: "600",
              marginTop: 9,
              lineHeight: 33,
            }}
          >
            Uma boa experiência{"\n"}começa pela escolha.
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 9 }}>
          <Text style={{ color: C.white, fontSize: 38, fontWeight: "300" }}>
            {String(sessions.length).padStart(2, "0")}
          </Text>
          <Text style={{ color: "#B4C4CD", fontSize: 12 }}>
            sessões cadastradas
          </Text>
        </View>
      </View>
      <View style={[s.sectionLabel, { marginTop: 27 }]}>
        <Text style={s.cardTitle}>Sessões disponíveis</Text>
        <Text style={s.hint}>Horário de Brasília</Text>
      </View>
      {loading && !sessions.length ? (
        <ActivityIndicator color={C.teal} style={{ padding: 40 }} />
      ) : null}
      <View style={s.sessionGrid}>
        {sessions.map((ss, i) => (
          <View
            key={ss.id}
            style={[
              s.sessionCard,
              {
                width:
                  width >= 1360 ? "31.8%" : width >= 720 ? "48.5%" : "100%",
              },
            ]}
          >
            <View
              style={[
                s.cardArt,
                {
                  backgroundColor:
                    i % 3 === 0
                      ? "#DBE9E5"
                      : i % 3 === 1
                        ? "#E9E3D8"
                        : "#E0E6EE",
                },
              ]}
            >
              <View style={s.artCircle} />
              <View style={s.artFrame}>
                <Text
                  style={{ fontSize: 20, color: C.navy, fontWeight: "500" }}
                >
                  {ss.event.title.charAt(0)}
                </Text>
              </View>
              <View style={{ position: "absolute", top: 16, left: 16 }}>
                <Tag
                  label={ss.event.type === "FILME" ? "FILME" : "EVENTO"}
                  tone="gray"
                />
              </View>
              <View style={{ position: "absolute", bottom: 15, left: 18 }}>
                <Text
                  style={{ fontSize: 12, color: C.navy, fontWeight: "600" }}
                >
                  {ss.room.name}
                </Text>
              </View>
            </View>
            <View style={{ padding: 21, gap: 12 }}>
              <Text style={s.cardTitle}>{ss.event.title}</Text>
              {ss.event.description ? (
                <Text numberOfLines={2} style={s.description}>
                  {ss.event.description}
                </Text>
              ) : null}
              <View style={s.sessionMeta}>
                <View>
                  <Text style={s.hint}>DATA</Text>
                  <Text style={s.metaValue}>{day(ss.startsAt)}</Text>
                </View>
                <View>
                  <Text style={s.hint}>HORÁRIO</Text>
                  <Text style={s.metaValue}>{time(ss.startsAt)}</Text>
                </View>
                <View>
                  <Text style={s.hint}>INGRESSO</Text>
                  <Text style={[s.metaValue, { color: C.teal }]}>
                    {money(ss.price)}
                  </Text>
                </View>
              </View>
              <Button
                label={operator ? "Iniciar venda →" : "Escolher assentos →"}
                secondary
                onPress={() => onChoose(ss)}
              />
            </View>
          </View>
        ))}
      </View>
      {!loading && !sessions.length ? (
        <Empty
          title="Nenhuma sessão cadastrada"
          description={
            operator
              ? "Acesse Cadastros para criar o conteúdo, a sala e a primeira sessão."
              : "As sessões aparecerão aqui assim que forem cadastradas."
          }
        />
      ) : null}
    </>
  );
}
export function MapaAssentos({
  session,
  seats,
  selected,
  onSelect,
  onReserve,
  busy,
  onBack,
}: {
  session: Session;
  seats: MapSeat[];
  selected: string[];
  onSelect: (id: string) => void;
  onReserve: () => void;
  busy: boolean;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  return (
    <>
      <Heading
        eyebrow="RESERVA DE ASSENTOS"
        title="Qual vai ser o seu lugar?"
        description={
          session.event.title +
          " · " +
          session.room.name +
          " · " +
          date(session.startsAt)
        }
        action={<Button secondary small label="Voltar" onPress={onBack} />}
      />
      <View
        style={[
          s.mapLayout,
          { flexDirection: width >= 1200 ? "row" : "column" },
        ]}
      >
        <View
          style={[
            s.card,
            {
              flex: width >= 1200 ? 1 : undefined,
              width: width >= 1200 ? undefined : "100%",
              padding: width > 700 ? 30 : 18,
            },
          ]}
        >
          <View style={s.screenLine} />
          <Text
            style={{
              textAlign: "center",
              fontSize: 10,
              letterSpacing: 3,
              color: "#8E9FA7",
              marginTop: 11,
              marginBottom: 34,
            }}
          >
            FRENTE DA SALA
          </Text>
          <ScrollView
            horizontal
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingBottom: 15,
            }}
          >
            <View style={{ gap: 12 }}>
              {[...new Set(seats.map((seat) => seat.row))].map((row) => (
                <View
                  key={row}
                  style={{ flexDirection: "row", gap: 9, alignItems: "center" }}
                >
                  <Text
                    style={{
                      width: 22,
                      fontSize: 12,
                      color: C.muted,
                      fontWeight: "600",
                    }}
                  >
                    {row}
                  </Text>
                  {seats
                    .filter((seat) => seat.row === row)
                    .map((seat) => {
                      const chosen = selected.includes(seat.id);
                      return (
                        <Pressable
                          key={seat.id}
                          accessibilityRole="button"
                          accessibilityLabel={
                            "Assento " +
                            seat.row +
                            seat.number +
                            ", " +
                            (chosen
                              ? "selecionado"
                              : seat.status === "LIVRE"
                                ? "livre"
                                : seat.status === "RESERVADO"
                                  ? "reservado"
                                  : "vendido")
                          }
                          disabled={seat.status !== "LIVRE" || busy}
                          onPress={() => onSelect(seat.id)}
                          style={[
                            s.seat,
                            seat.status === "RESERVADO"
                              ? {
                                  backgroundColor: C.amberLight,
                                  borderColor: "#EBCF9D",
                                }
                              : seat.status === "VENDIDO"
                                ? {
                                    backgroundColor: "#E5E9EB",
                                    borderColor: "#D4DDE1",
                                  }
                                : null,
                            chosen
                              ? { backgroundColor: C.teal, borderColor: C.teal }
                              : null,
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: chosen
                                ? "white"
                                : seat.status === "VENDIDO"
                                  ? "#9AA6AC"
                                  : seat.status === "RESERVADO"
                                    ? C.amber
                                    : C.teal,
                              fontWeight: "600",
                            }}
                          >
                            {seat.number}
                          </Text>
                          {seat.status !== "LIVRE" ? (
                            <Text style={{position:"absolute",top:0,right:3,fontSize:8,color:seat.status === "VENDIDO" ? C.muted : C.amber}}>
                              {seat.status === "VENDIDO" ? "×" : "–"}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  <Text style={{ width: 19, fontSize: 12, color: C.muted }}>
                    {row}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          {!seats.length ? (
            <ActivityIndicator color={C.teal} style={{ margin: 20 }} />
          ) : null}
          <View
            style={[
              s.wrap,
              {
                justifyContent: "center",
                marginTop: 30,
                paddingTop: 22,
                borderTopWidth: 1,
                borderColor: C.line,
              },
            ]}
          >
            {[
              { label: "Livre", bg: C.tealLight },
              { label: "Selecionado", bg: C.teal },
              { label: "Reservado", bg: C.amberLight },
              { label: "Vendido", bg: "#DDE4E8" },
            ].map((l) => (
              <View
                key={l.label}
                style={{
                  flexDirection: "row",
                  gap: 7,
                  alignItems: "center",
                  marginRight: 8,
                }}
              >
                <View
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    backgroundColor: l.bg,
                  }}
                />
                <Text style={{ fontSize: 11, color: C.muted }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View
          style={[
            s.card,
            { width: width >= 1200 ? 290 : "100%", padding: 24, gap: 15 },
          ]}
        >
          <Text style={s.cardTitle}>Sua seleção</Text>
          <Text style={s.description}>
            Escolha um ou mais assentos livres no mapa.
          </Text>
          <View style={[s.wrap, { minHeight: 44 }]}>
            {seats
              .filter((seat) => selected.includes(seat.id))
              .map((seat) => (
                <Tag key={seat.id} label={seat.row + seat.number} />
              ))}
            {!selected.length ? (
              <Text style={s.hint}>Nenhum assento selecionado</Text>
            ) : null}
          </View>
          <View style={s.divider} />
          <View style={s.between}>
            <Text style={s.description}>Valor por assento</Text>
            <Text style={s.cardTitle}>{money(session.price)}</Text>
          </View>
          <Button
            label={busy ? "Reservando…" : "Reservar assentos"}
            disabled={!selected.length || busy}
            onPress={onReserve}
          />
          <Text style={s.hint}>
            A disponibilidade será confirmada ao reservar.
          </Text>
        </View>
      </View>
    </>
  );
}
export function FinalizarCompra({
  reservation,
  offset,
  busy,
  onPay,
  onTickets,
  onBack,
}: {
  reservation: Reservation;
  offset: number;
  busy: boolean;
  onPay: () => void;
  onTickets: () => void;
  onBack: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(
    0,
    Math.ceil(
      (new Date(reservation.expiresAt).getTime() - now - offset) / 1000,
    ),
  );
  return (
    <>
      <Heading
        eyebrow={
          reservation.status === "PAGA" ? "TUDO PRONTO" : "FINALIZAR COMPRA"
        }
        title={
          reservation.status === "PAGA"
            ? "Seus ingressos estão aqui"
            : reservation.status === "EXPIRADA"
              ? "O prazo da reserva terminou"
              : "Confira sua reserva"
        }
        description={reservation.session.event.title}
      />
      <View style={[s.card, { padding: 28, maxWidth: 800, gap: 20 }]}>
        <View style={s.between}>
          <Tag
            label={
              reservation.status === "PAGA"
                ? "Pagamento confirmado"
                : reservation.status === "EXPIRADA"
                  ? "Reserva expirada"
                  : "Aguardando pagamento"
            }
            tone={
              reservation.status === "PAGA"
                ? "teal"
                : reservation.status === "EXPIRADA"
                  ? "red"
                  : "amber"
            }
          />
          {reservation.status === "PENDENTE" ? (
            <Text
              style={{
                fontWeight: "600",
                color: C.amber,
                fontSize: 18,
                fontVariant: ["tabular-nums"],
              }}
            >
              {String(Math.floor(left / 60)).padStart(2, "0")}:
              {String(left % 60).padStart(2, "0")}
            </Text>
          ) : null}
        </View>
        <Text style={s.description}>
          {reservation.session.room.name} · {date(reservation.session.startsAt)}
        </Text>
        <View style={s.wrap}>
          {reservation.items.map((item) => (
            <Tag
              key={item.id}
              label={item.sessionSeat.seat.row + item.sessionSeat.seat.number}
            />
          ))}
        </View>
        <View style={s.divider} />
        <View style={s.between}>
          <Text style={s.description}>Total da reserva</Text>
          <Text style={{ fontSize: 29, fontWeight: "600", color: C.text }}>
            {money(reservation.total)}
          </Text>
        </View>
        {reservation.status === "PENDENTE" ? (
          <>
            <Text style={s.hint}>
              O pagamento é simulado. Não informe dados bancários ou de cartão.
            </Text>
            <Button
              label={
                busy
                  ? "Confirmando…"
                  : left > 0
                    ? "Confirmar pagamento simulado"
                    : "Conferindo prazo da reserva…"
              }
              onPress={onPay}
              disabled={busy || left === 0}
            />
          </>
        ) : reservation.status === "EXPIRADA" ? (
          <>
            <Text style={s.description}>
              Os assentos foram liberados. Consulte o mapa para fazer uma nova
              seleção.
            </Text>
            <Button label="Voltar ao mapa" onPress={onBack} />
          </>
        ) : (
          <>
            <View style={s.divider} />
            {reservation.items.map((item) =>
              item.ticket ? (
                <View key={item.id} style={s.miniTicket}>
                  <View style={s.between}>
                    <Text style={s.cardTitle}>
                      Assento {item.sessionSeat.seat.row}
                      {item.sessionSeat.seat.number}
                    </Text>
                    <Text style={{ color: C.teal, fontSize: 20 }}>✓</Text>
                  </View>
                  <Text selectable style={s.code}>
                    {item.ticket.codigo}
                  </Text>
                </View>
              ) : null,
            )}
            <Button secondary label="Ver meus ingressos" onPress={onTickets} />
          </>
        )}
      </View>
    </>
  );
}
export function MeusIngressos({
  tickets,
  operator,
  onRefresh,
}: {
  tickets: Ticket[];
  operator: boolean;
  onRefresh: () => void;
}) {
  return (
    <>
      <Heading
        eyebrow="SEUS INGRESSOS"
        title={
          operator ? "Ingressos do balcão" : "Pronto para a próxima sessão?"
        }
        description={
          operator
            ? "Ingressos emitidos nas vendas realizadas por você."
            : "Apresente o código do ingresso na entrada."
        }
        action={
          <Button small secondary label="Atualizar" onPress={onRefresh} />
        }
      />
      <View style={{ gap: 18 }}>
        {tickets.map((t) => (
          <View key={t.id} style={[s.card, { padding: 25, maxWidth: 850 }]}>
            <View style={s.between}>
              <View style={{ flex: 1, gap: 9 }}>
                <Text style={s.cardTitle}>
                  {t.sessionSeat.session.event.title}
                </Text>
                <Text style={s.description}>
                  {date(t.sessionSeat.session.startsAt)}
                </Text>
              </View>
              <Tag
                label={t.usedAt ? "Utilizado" : "Disponível"}
                tone={t.usedAt ? "gray" : "teal"}
              />
            </View>
            <View
              style={[s.wrap, { marginTop: 22, marginBottom: 20, gap: 24 }]}
            >
              <View>
                <Text style={s.hint}>SALA</Text>
                <Text style={s.metaValue}>
                  {t.sessionSeat.session.room.name}
                </Text>
              </View>
              <View>
                <Text style={s.hint}>ASSENTO</Text>
                <Text style={s.metaValue}>
                  {t.sessionSeat.seat.row}
                  {t.sessionSeat.seat.number}
                </Text>
              </View>
              <View>
                <Text style={s.hint}>VALOR</Text>
                <Text style={s.metaValue}>{money(t.item.unitPrice)}</Text>
              </View>
            </View>
            <View style={[s.divider, { borderStyle: "dashed" }]} />
            <Text style={[s.hint, { marginTop: 15, marginBottom: 6 }]}>
              CÓDIGO DO INGRESSO
            </Text>
            <Text selectable style={s.code}>
              {t.codigo}
            </Text>
            {t.usedAt ? (
              <Text style={[s.hint, { marginTop: 9 }]}>
                Utilizado em {date(t.usedAt)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {!tickets.length ? (
        <Empty
          title="Seus ingressos aparecerão aqui"
          description="Após a confirmação do pagamento simulado, cada assento recebe um ingresso com código único."
        />
      ) : null}
    </>
  );
}
