import * as auth from "../services/auth.service.js";
import { config } from "../config.js";
const cookie = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 8 * 60 * 60 * 1000,
};
export const actor = (res) => res.locals.actor;
export async function requireAuth(req, res, next) {
    res.locals.actor = await auth.authenticate(req.headers.authorization?.replace(/^Bearer /i, "") || req.cookies?.session);
    next();
}
export async function register(req, res) {
    const result = await auth.register(req.body);
    res.cookie("session", result.token, cookie).status(201).json(result);
}
export async function login(req, res) {
    const result = await auth.login(req.body);
    res.cookie("session", result.token, cookie).json(result);
}
export function me(_req, res) {
    res.json(actor(res));
}
export function logout(_req, res) {
    res.clearCookie("session", { ...cookie, maxAge: 0 }).json({ ok: true });
}
// Contrato público: traduz somente os nomes aprovados e preserva os demais campos.
const publicKeys = {
    nome: "name", titulo: "title", descricao: "description", tipo: "type", criadoEm: "createdAt",
    eventoId: "eventId", salaId: "roomId", inicioEm: "startsAt", preco: "price", assentoId: "seatId",
    reservaAtualId: "currentReservationId", usuarioId: "userId", situacao: "status", canalVenda: "channel",
    expiraEm: "expiresAt", valorTotal: "total", reservaId: "reservationId", assentoSessaoId: "sessionSeatId",
    precoUnitario: "unitPrice", valor: "amount", pagoEm: "paidAt", simulado: "simulated",
    itemReservaId: "reservationItemId", emitidoEm: "issuedAt", utilizadoEm: "usedAt", validadoPorId: "validatedById",
    ingressoId: "ticketId", acao: "action", registradoEm: "recordedAt", usoAnteriorEm: "previousUsedAt",
    usoAtualEm: "newUsedAt", responsavelId: "actorId", fila: "row", numero: "number",
    user: "usuario", role: "perfil", sessionId: "sessaoId", sessionSeatIds: "assentosSessaoIds", seatIds: "assentosIds",
    serverTime: "horarioServidor", seats: "assentos", mine: "minhaReserva", error: "erro", code: "codigo", message: "mensagem",
    from: "inicio", to: "fim", capacity: "capacidade", sold: "vendidos", used: "utilizados", revenue: "receita", occupancy: "taxaOcupacao",
};
export function toPublic(value) {
    if (value === null || value === undefined)
        return value;
    if (typeof value === "bigint")
        return value.toString();
    if (typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.map(toPublic);
    if (value instanceof Date)
        return value.toJSON();
    const serializable = value;
    if (typeof serializable.toJSON === "function")
        return toPublic(serializable.toJSON());
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "passwordHash" && key !== "hashSenha")
        .map(([key, item]) => [Object.hasOwn(publicKeys, key) ? publicKeys[key] : key, toPublic(item)]));
}
//# sourceMappingURL=auth.controller.js.map