import { prisma, type Tx } from "./database.js";
import { sessionInclude } from "./catalogo.repositorio.js";
export const ticketInclude = {
  sessionSeat: { include: { seat: true, session: { include: sessionInclude } } },
  item: { include: { reservation: { select: { id: true, usuarioId: true, canalVenda: true } } } },
} as const;
export const listTickets = (userId: string) => prisma.ingresso.findMany({
  where: { item: { reservation: { usuarioId: userId } } }, include: ticketInclude, orderBy: { emitidoEm: "desc" },
});
export const findTicket = (id: string) => prisma.ingresso.findUnique({ where: { id }, include: ticketInclude });
export const ticketByCode = (tx: Tx, code: string) => tx.ingresso.findUnique({ where: { codigo: code }, include: ticketInclude });
export const markUsed = (tx: Tx, id: string, time: Date, userId: string) => tx.ingresso.updateMany({
  where: { id, utilizadoEm: null }, data: { utilizadoEm: time, validadoPorId: userId },
});
