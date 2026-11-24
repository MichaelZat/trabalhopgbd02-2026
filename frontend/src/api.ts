import { Platform } from "react-native";
export type User = {
  id: string;
  name: string;
  email: string;
  perfil: "CLIENTE" | "OPERADOR";
};
export type Event = {
  id: string;
  title: string;
  description: string;
  type: "FILME" | "EVENTO";
  _count?: { sessions: number };
};
export type Room = {
  id: string;
  name: string;
  assentos: { id: string; row: string; number: number }[];
};
export type Session = {
  id: string;
  eventId: string;
  roomId: string;
  startsAt: string;
  price: string;
  event: Event;
  room: { name: string; _count: { assentos: number } };
};
export type MapSeat = {
  id: string;
  row: string;
  number: number;
  status: "LIVRE" | "RESERVADO" | "VENDIDO";
  minhaReserva: boolean;
};
export type IssuedTicket = {
  id: string;
  codigo: string;
  usedAt: string | null;
  issuedAt: string;
};
export type Reservation = {
  id: string;
  status: "PENDENTE" | "PAGA" | "EXPIRADA";
  expiresAt: string;
  total: string;
  session: Session;
  items: {
    id: string;
    unitPrice: string;
    sessionSeat: { seat: { row: string; number: number } };
    ticket: IssuedTicket | null;
  }[];
};
export type Ticket = IssuedTicket & {
  sessionSeat: { seat: { row: string; number: number }; session: Session };
  item: {
    unitPrice: string;
    reservation: { id: string; userId: string; channel: string };
  };
};
export type Report = {
  sessaoId: string;
  title: string;
  room: string;
  startsAt: string;
  capacidade: number;
  vendidos: number;
  utilizados: number;
  receita: string;
  taxaOcupacao: number;
};
let token = "";
export const setToken = (value: string) => {
  token = value;
};
const base =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web" ? "/api" : "http://localhost:3000/api");
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      0,
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      result?.erro?.codigo || "ERROR",
      result?.erro?.mensagem || "Não foi possível concluir a operação.",
      response.status,
    );
  return result as T;
}
