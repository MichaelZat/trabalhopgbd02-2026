import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  request,
  setToken,
  type User,
  type Session,
  type Event,
  type Room,
  type Reservation,
  type Ticket,
  type MapSeat,
} from "./src/api";
import { C, s, Button, Brand } from "./src/interface";
import Login from "./src/Login";
import { Catalogo, MapaAssentos, FinalizarCompra, MeusIngressos } from "./src/TelasCompra";
import { Cadastros, Relatorios, Validacao } from "./src/TelasGestao";
type Page =
  | "sessions"
  | "tickets"
  | "admin"
  | "reports"
  | "validate"
  | "map"
  | "checkout";
export default function App() {
  const { width } = useWindowDimensions(),
    wide = width >= 1000;
  const [user, setUser] = useState<User | null>(null),
    [initializing, setInitializing] = useState(true),
    [page, setPage] = useState<Page>("sessions");
  const [sessions, setSessions] = useState<Session[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [rooms, setRooms] = useState<Room[]>([]),
    [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null),
    [map, setMap] = useState<MapSeat[]>([]),
    [selection, setSelection] = useState<string[]>([]),
    [reservation, setReservation] = useState<Reservation | null>(null);
  const [clockOffset, setClockOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    );
  const isOperator = user?.perfil === "OPERADOR";
  const notify = useCallback(
    (text: string, error = false) => setNotice({ text, error }),
    [],
  );
  useEffect(() => {
    request<User>("/autenticacao/usuario-atual")
      .then(setUser)
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ss, ee] = await Promise.all([
        request<Session[]>("/sessoes"),
        request<Event[]>("/eventos"),
      ]);
      setSessions(ss);
      setEvents(ee);
      if (user.perfil === "OPERADOR")
        setRooms(await request<Room[]>("/gerencia/salas"));
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, [user, notify]);
  useEffect(() => {
    void load();
  }, [load]);
  const loadTickets = useCallback(async () => {
    try {
      setTickets(await request<Ticket[]>("/me/ingressos"));
    } catch (e) {
      notify((e as Error).message, true);
    }
  }, [notify]);
  useEffect(() => {
    if (user && page === "tickets") void loadTickets();
  }, [page, user, loadTickets]);
  const refreshMap = useCallback(async () => {
    if (!selectedSession) return;
    const data = await request<{ horarioServidor: string; assentos: MapSeat[] }>(
      "/sessoes/" + selectedSession.id + "/assentos",
    );
    setClockOffset(new Date(data.horarioServidor).getTime() - Date.now());
    setMap(data.assentos);
    setSelection((old) =>
      old.filter((id) =>
        data.assentos.some((seat) => seat.id === id && seat.status === "LIVRE"),
      ),
    );
  }, [selectedSession]);
  useEffect(() => {
    if (page !== "map" || !selectedSession) return;
    void refreshMap().catch((e) => notify(e.message, true));
    const timer = setInterval(() => void refreshMap().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [page, selectedSession, refreshMap, notify]);
  useEffect(() => {
    if (page !== "checkout" || !reservation || reservation.status !== "PENDENTE")
      return;
    const timer = setInterval(() => {
      void request<Reservation>("/reservas/" + reservation.id)
        .then(setReservation)
        .catch((e) => notify(e.message, true));
    }, 3000);
    return () => clearInterval(timer);
  }, [page, reservation?.id, reservation?.status, notify]);
  function go(p: Page) {
    setPage(p);
    setNotice(null);
  }
  function openMap(session: Session) {
    setSelectedSession(session);
    setMap([]);
    setSelection([]);
    go("map");
  }
  async function book() {
    if (!selectedSession) return;
    setBusy(true);
    try {
      const data = await request<Reservation>("/reservas", "POST", {
        sessaoId: selectedSession.id,
        assentosSessaoIds: selection,
      });
      setReservation(data);
      go("checkout");
    } catch (e) {
      notify((e as Error).message, true);
      await refreshMap().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (!reservation) return;
    setBusy(true);
    try {
      setReservation(
        await request<Reservation>(
          "/reservas/" + reservation.id + "/pagamento-simulado",
          "POST",
        ),
      );
      notify("Pagamento simulado confirmado. Seus ingressos foram emitidos.");
    } catch (e) {
      notify((e as Error).message, true);
      const current = await request<Reservation>(
        "/reservas/" + reservation.id,
      ).catch(() => null);
      if (current) setReservation(current);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await request("/auth/logout", "POST");
      setToken("");
      setUser(null);
      setReservation(null);
      setPage("sessions");
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  if (initializing)
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.teal} />
      </View>
    );
  if (!user)
    return (
      <>
        <StatusBar style="auto" />
        <Login onLogin={setUser} />
      </>
    );
  const nav = [
    {
      key: "sessions" as Page,
      label: isOperator ? "Bilheteria" : "Sessões",
      icon: "▦",
    },
    {
      key: "tickets" as Page,
      label: isOperator ? "Ingressos do balcão" : "Meus ingressos",
      icon: "▤",
    },
    ...(isOperator
      ? [
          { key: "admin" as Page, label: "Cadastros", icon: "+" },
          { key: "validate" as Page, label: "Validar ingresso", icon: "✓" },
          { key: "reports" as Page, label: "Relatórios", icon: "▥" },
        ]
      : []),
  ];
  const active = page === "map" || page === "checkout" ? "sessions" : page;
  return (
    <View style={[s.app, { flexDirection: wide ? "row" : "column" }]}>
      <StatusBar style="auto" />
      <View
        style={[
          s.sidebar,
          !wide ? { width: "100%", padding: 18, paddingBottom: 12 } : null,
        ]}
      >
        <Brand />
        {wide ? (
          <Text style={s.navLabel}>
            {isOperator ? "ÁREA DO OPERADOR" : "SUA EXPERIÊNCIA"}
          </Text>
        ) : null}
        <View
          style={[
            s.nav,
            !wide
              ? {
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 5,
                  marginTop: 17,
                }
              : null,
          ]}
        >
          {nav.map((n) => (
            <Pressable
              key={n.key}
              accessibilityRole="button"
              accessibilityLabel={n.label}
              onPress={() => go(n.key)}
              style={[
                s.navItem,
                active === n.key ? { backgroundColor: "#2A485B" } : null,
                !wide ? { paddingHorizontal: 12, paddingVertical: 10 } : null,
              ]}
            >
              <Text
                style={[
                  s.navIcon,
                  { color: active === n.key ? "#9BD6C9" : "#9CAFB9" },
                ]}
              >
                {n.icon}
              </Text>
              <Text
                style={[
                  s.navText,
                  active === n.key ? { color: C.white } : null,
                ]}
              >
                {n.label}
              </Text>
              {active === n.key && wide ? <View style={s.navDot} /> : null}
            </Pressable>
          ))}
        </View>
        {wide ? <View style={{ flex: 1 }} /> : null}
        <View
          style={[s.profile, !wide ? { marginTop: 15, paddingTop: 14 } : null]}
        >
          <View style={s.avatar}>
            <Text style={{ color: "#BDE7DD", fontWeight: "700" }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontWeight: "600", fontSize: 13 }}>
              {user.name}
            </Text>
            <Text style={{ color: "#9FAFB8", fontSize: 11, marginTop: 3 }}>
              {isOperator ? "Operador" : "Cliente"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            onPress={logout}
          >
            <Text style={{ color: "#AEBEC6", fontSize: 12 }}>Sair ↗</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[s.topbar, { paddingHorizontal: wide ? 38 : 22 }]}>
          <Text style={s.topbarText}>
            {isOperator ? "PAINEL DE OPERAÇÃO" : "BILHETERIA ONLINE"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: C.teal,
              }}
            />
            <Text style={s.topbarText}>
              Bem-vindo, {user.name.split(" ")[0]}
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: wide ? 38 : 20, paddingBottom: 60 }}
          style={{ backgroundColor: C.paper }}
        >
          {notice ? (
            <View
              accessibilityRole="alert"
              style={[
                s.notice,
                {
                  borderColor: notice.error ? "#E9BCBB" : "#ADD6CD",
                  backgroundColor: notice.error ? C.redLight : C.tealLight,
                },
              ]}
            >
              <Text
                style={{
                  flex: 1,
                  color: notice.error ? C.red : C.teal,
                  lineHeight: 20,
                }}
              >
                {notice.text}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar mensagem"
                onPress={() => setNotice(null)}
              >
                <Text style={{ color: C.muted }}>✕</Text>
              </Pressable>
            </View>
          ) : null}
          {reservation?.status === "PENDENTE" && page !== "checkout" ? (
            <Pressable
              onPress={() => go("checkout")}
              style={[
                s.notice,
                { backgroundColor: C.amberLight, borderColor: "#EED4AA" },
              ]}
            >
              <Text style={{ color: C.amber, flex: 1 }}>
                Você tem uma reserva em andamento.
              </Text>
              <Text style={{ color: C.amber, fontWeight: "700" }}>
                Continuar →
              </Text>
            </Pressable>
          ) : null}
          {page === "sessions" ? (
            <Catalogo
              sessions={sessions}
              loading={loading}
              operator={isOperator}
              onRefresh={load}
              onChoose={openMap}
            />
          ) : null}
          {page === "map" && selectedSession ? (
            <MapaAssentos
              session={selectedSession}
              seats={map}
              selected={selection}
              onSelect={(id) =>
                setSelection((old) =>
                  old.includes(id) ? old.filter((v) => v !== id) : [...old, id],
                )
              }
              onReserve={book}
              busy={busy}
              onBack={() => go("sessions")}
            />
          ) : null}
          {page === "checkout" && reservation ? (
            <FinalizarCompra
              reservation={reservation}
              offset={clockOffset}
              busy={busy}
              onPay={pay}
              onTickets={() => go("tickets")}
              onBack={() => {
                setReservation(null);
                if (selectedSession) openMap(selectedSession);
                else go("sessions");
              }}
            />
          ) : null}
          {page === "tickets" ? (
            <MeusIngressos
              tickets={tickets}
              operator={isOperator}
              onRefresh={loadTickets}
            />
          ) : null}
          {page === "admin" && isOperator ? (
            <Cadastros
              events={events}
              rooms={rooms}
              sessions={sessions}
              reload={load}
              notify={notify}
            />
          ) : null}
          {page === "reports" && isOperator ? (
            <Relatorios sessions={sessions} notify={notify} />
          ) : null}
          {page === "validate" && isOperator ? (
            <Validacao notify={notify} />
          ) : null}
          <View style={s.footer}>
            <Text style={s.hint}>bilheteria.</Text>
            <Text style={s.hint}>Sessões e ingressos em um só lugar.</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
