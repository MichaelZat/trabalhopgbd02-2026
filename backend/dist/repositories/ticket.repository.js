import { prisma } from "./database.js";
import { sessionInclude } from "./catalogo.repositorio.js";
export const ticketInclude = {
    sessionSeat: { include: { seat: true, session: { include: sessionInclude } } },
    item: { include: { reservation: { select: { id: true, usuarioId: true, canalVenda: true } } } },
};
export const listTickets = (userId) => prisma.ingresso.findMany({
    where: { item: { reservation: { usuarioId: userId } } }, include: ticketInclude, orderBy: { emitidoEm: "desc" },
});
export const findTicket = (id) => prisma.ingresso.findUnique({ where: { id }, include: ticketInclude });
export const ticketByCode = (tx, code) => tx.ingresso.findUnique({ where: { codigo: code }, include: ticketInclude });
export const markUsed = (tx, id, time, userId) => tx.ingresso.updateMany({
    where: { id, utilizadoEm: null }, data: { utilizadoEm: time, validadoPorId: userId },
});
//# sourceMappingURL=ticket.repository.js.map