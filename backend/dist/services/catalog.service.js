import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ErroAplicacao, idSchema, operator, parse } from "../errors.js";
import { transaction } from "../repositories/database.js";
import * as repo from "../repositories/catalogo.repositorio.js";
const eventSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().default(""),
    type: z.enum(["FILME", "EVENTO"]),
});
const priceSchema = z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v), "Informe um preço não negativo com até duas casas decimais.")
    .transform((v) => new Prisma.Decimal(v));
export const events = () => repo.listEvents();
export async function createEvent(actor, input) {
    operator(actor);
    return repo.createEvent(parse(eventSchema, input));
}
export async function updateEvent(actor, id, input) {
    operator(actor);
    return repo.updateEvent(parse(idSchema, id), parse(eventSchema.partial(), input));
}
export async function rooms(actor) {
    operator(actor);
    return repo.listRooms();
}
export async function createRoom(actor, input) {
    operator(actor);
    const data = parse(z.object({
        name: z.string().trim().min(1),
        assentos: z
            .array(z.object({
            row: z.string().trim().min(1),
            number: z.number().int().positive(),
        }))
            .min(1),
    }), input);
    if (new Set(data.assentos.map((s) => `${s.row}\0${s.number}`)).size !==
        data.assentos.length)
        throw new ErroAplicacao(400, "DUPLICATE_SEAT", "A sala não pode ter fila e número repetidos.");
    return repo.createRoom(data.name, data.assentos);
}
export async function sessions(eventId) {
    return repo.listSessions(eventId ? parse(idSchema, eventId) : undefined);
}
export async function session(id) {
    const result = await repo.findSession(parse(idSchema, id));
    if (!result)
        throw new ErroAplicacao(404, "NOT_FOUND", "Sessão não encontrada.");
    return result;
}
export async function createSession(actor, input) {
    operator(actor);
    const data = parse(z.object({
        eventId: idSchema,
        roomId: idSchema,
        startsAt: z.string().datetime({ offset: true }),
        price: priceSchema,
    }), input);
    const [room, event] = await Promise.all([
        repo.findRoom(data.roomId),
        repo.findEvent(data.eventId),
    ]);
    if (!room || !event)
        throw new ErroAplicacao(400, "INVALID_REFERENCE", "Escolha um filme/evento e uma sala cadastrados.");
    return transaction((tx) => repo.createSession(tx, { ...data, startsAt: new Date(data.startsAt) }, room.seats.map((s) => s.id)));
}
export async function updateSession(actor, id, input) {
    operator(actor);
    const data = parse(z.object({
        startsAt: z.string().datetime({ offset: true }).optional(),
        price: priceSchema.optional(),
    }), input);
    return repo.updateSession(parse(idSchema, id), {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
    });
}
//# sourceMappingURL=catalog.service.js.map