import { prisma } from "./database.js";
import { sessionInclude } from "./catalogo.repositorio.js";
export const reservationInclude = {
    session: { include: sessionInclude },
    items: { include: { sessionSeat: { include: { seat: true } }, ticket: true } },
    payment: true,
};
export const reservationSession = (id) => prisma.reserva.findUnique({
    where: { id }, select: { sessaoId: true, usuarioId: true },
});
export const reservation = (tx, id) => tx.reserva.findUnique({ where: { id }, include: reservationInclude });
export const expired = (tx, sessionId, time) => tx.reserva.findMany({
    where: { sessaoId: sessionId, situacao: "PENDENTE", expiraEm: { lte: time } }, select: { id: true },
});
export async function releaseExpired(tx, ids) {
    await tx.assentoSessao.updateMany({
        where: { reservaAtualId: { in: ids }, ticket: { is: null } }, data: { reservaAtualId: null },
    });
    await tx.reserva.updateMany({ where: { id: { in: ids }, situacao: "PENDENTE" }, data: { situacao: "EXPIRADA" } });
}
export const expiredSessions = (time) => prisma.reserva.findMany({
    where: { situacao: "PENDENTE", expiraEm: { lte: time } }, distinct: ["sessaoId"], select: { sessaoId: true },
});
export const selectedSeats = (tx, sessionId, ids) => tx.assentoSessao.findMany({
    where: { sessaoId: sessionId, id: { in: ids } }, include: { ticket: { select: { id: true } } },
});
export const sessionPrice = (tx, id) => tx.sessao.findUniqueOrThrow({ where: { id }, select: { preco: true } });
export async function insertReservation(tx, data, ids, unitPrice) {
    const created = await tx.reserva.create({ data });
    await tx.itemReserva.createMany({ data: ids.map((sessionSeatId) => ({
            reservaId: created.id, assentoSessaoId: sessionSeatId, sessaoId: data.sessaoId, precoUnitario: unitPrice,
        })) });
    await tx.assentoSessao.updateMany({ where: { id: { in: ids } }, data: { reservaAtualId: created.id } });
    return created.id;
}
export const insertPayment = (tx, reservationId, amount) => tx.pagamento.create({ data: { reservaId: reservationId, valor: amount, simulado: true } });
export const markPaid = (tx, id) => tx.reserva.update({ where: { id }, data: { situacao: "PAGA" } });
export const insertTicket = (tx, data) => tx.ingresso.create({ data });
//# sourceMappingURL=booking.repository.js.map