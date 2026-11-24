import { prisma } from "./database.js";
export const sessionInclude = {
    event: true,
    room: { include: { _count: { select: { seats: true } } } },
};
export const listEvents = () => prisma.evento.findMany({
    orderBy: { titulo: "asc" }, include: { _count: { select: { sessions: true } } },
});
export const createEvent = (data) => prisma.evento.create({ data: { titulo: data.title, descricao: data.description, tipo: data.type } });
export const updateEvent = (id, data) => prisma.evento.update({ where: { id }, data: { titulo: data.title, descricao: data.description, tipo: data.type } });
export const listRooms = () => prisma.sala.findMany({
    orderBy: { nome: "asc" }, include: { seats: { orderBy: [{ fila: "asc" }, { numero: "asc" }] } },
});
export const findRoom = (id) => prisma.sala.findUnique({ where: { id }, include: { seats: true } });
export const findEvent = (id) => prisma.evento.findUnique({ where: { id } });
export const createRoom = (name, seats) => prisma.sala.create({
    data: { nome: name, seats: { create: seats.map((seat) => ({ fila: seat.row, numero: seat.number })) } },
    include: { seats: true },
});
export const listSessions = (eventId) => prisma.sessao.findMany({
    where: eventId ? { eventoId: eventId } : {}, orderBy: { inicioEm: "asc" }, include: sessionInclude,
});
export const findSession = (id) => prisma.sessao.findUnique({ where: { id }, include: sessionInclude });
export async function createSession(tx, data, assentosIds) {
    const session = await tx.sessao.create({
        data: { eventoId: data.eventId, salaId: data.roomId, inicioEm: data.startsAt, preco: data.price },
        include: sessionInclude,
    });
    await tx.assentoSessao.createMany({ data: assentosIds.map((seatId) => ({
            sessaoId: session.id, assentoId: seatId, salaId: data.roomId,
        })) });
    return session;
}
export const updateSession = (id, data) => prisma.sessao.update({ where: { id }, data: { inicioEm: data.startsAt, preco: data.price }, include: sessionInclude });
export const mapSeats = (tx, sessionId) => tx.assentoSessao.findMany({
    where: { sessaoId: sessionId },
    orderBy: [{ seat: { fila: "asc" } }, { seat: { numero: "asc" } }],
    include: { seat: true, ticket: { select: { id: true } }, currentReservation: { select: { situacao: true, expiraEm: true, usuarioId: true } } },
});
//# sourceMappingURL=catalogo.repositorio.js.map