import { prisma, type Tx } from "./database.js";
import { sessionInclude } from "./catalogo.repositorio.js";
import type { CanalVenda, Prisma } from "@prisma/client";
export const reservationInclude = {
  session: { include: sessionInclude },
  items: { include: { sessionSeat: { include: { seat: true } }, ticket: true } },
  payment: true,
} as const;
export const reservationSession = (id: string) => prisma.reserva.findUnique({
  where: { id }, select: { sessaoId: true, usuarioId: true },
});
export const reservation = (tx: Tx, id: string) => tx.reserva.findUnique({ where: { id }, include: reservationInclude });
export const expired = (tx: Tx, sessionId: string, time: Date) => tx.reserva.findMany({
  where: { sessaoId: sessionId, situacao: "PENDENTE", expiraEm: { lte: time } }, select: { id: true },
});
export async function releaseExpired(tx: Tx, ids: string[]) {
  await tx.assentoSessao.updateMany({
    where: { reservaAtualId: { in: ids }, ticket: { is: null } }, data: { reservaAtualId: null },
  });
  await tx.reserva.updateMany({ where: { id: { in: ids }, situacao: "PENDENTE" }, data: { situacao: "EXPIRADA" } });
}
export const expiredSessions = (time: Date) => prisma.reserva.findMany({
  where: { situacao: "PENDENTE", expiraEm: { lte: time } }, distinct: ["sessaoId"], select: { sessaoId: true },
});
export const selectedSeats = (tx: Tx, sessionId: string, ids: string[]) => tx.assentoSessao.findMany({
  where: { sessaoId: sessionId, id: { in: ids } }, include: { ticket: { select: { id: true } } },
});
export const sessionPrice = (tx: Tx, id: string) => tx.sessao.findUniqueOrThrow({ where: { id }, select: { preco: true } });
export async function insertReservation(
  tx: Tx,
  data: { sessaoId: string; usuarioId: string; expiraEm: Date; valorTotal: Prisma.Decimal; canalVenda: CanalVenda },
  ids: string[], unitPrice: Prisma.Decimal,
) {
  const created = await tx.reserva.create({ data });
  await tx.itemReserva.createMany({ data: ids.map((sessionSeatId) => ({
    reservaId: created.id, assentoSessaoId: sessionSeatId, sessaoId: data.sessaoId, precoUnitario: unitPrice,
  })) });
  await tx.assentoSessao.updateMany({ where: { id: { in: ids } }, data: { reservaAtualId: created.id } });
  return created.id;
}
export const insertPayment = (tx: Tx, reservationId: string, amount: Prisma.Decimal) =>
  tx.pagamento.create({ data: { reservaId: reservationId, valor: amount, simulado: true } });
export const markPaid = (tx: Tx, id: string) => tx.reserva.update({ where: { id }, data: { situacao: "PAGA" } });
export const insertTicket = (tx: Tx, data: { itemReservaId: string; assentoSessaoId: string; codigo: string }) => tx.ingresso.create({ data });
