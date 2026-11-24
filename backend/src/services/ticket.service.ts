import { z } from "zod";
import { ErroAplicacao, idSchema, operator, parse, type UsuarioAutenticado } from "../errors.js";
import { transaction, horarioBanco } from "../repositories/database.js";
import * as repo from "../repositories/ticket.repository.js";
export const myTickets = (actor: UsuarioAutenticado) => repo.listTickets(actor.id);
export async function detail(actor: UsuarioAutenticado, id: unknown) {
  const ticket = await repo.findTicket(parse(idSchema, id));
  if (!ticket) throw new ErroAplicacao(404, "NOT_FOUND", "Ingresso não encontrado.");
  if (ticket.item.reservation.usuarioId !== actor.id)
    throw new ErroAplicacao(
      403,
      "FORBIDDEN",
      "Você não tem acesso a este ingresso.",
    );
  return ticket;
}
export async function validate(actor: UsuarioAutenticado, input: unknown) {
  operator(actor);
  const { codigo: code } = parse(
    z.object({
      codigo: z
        .string()
        .trim()
        .min(1)
        .transform((v) => v.toUpperCase()),
    }),
    input,
  );
  return transaction(async (tx) => {
    const ticket = await repo.ticketByCode(tx, code);
    if (!ticket)
      throw new ErroAplicacao(
        404,
        "INVALID_TICKET",
        "Código de ingresso não encontrado.",
      );
    if (ticket.utilizadoEm)
      throw new ErroAplicacao(409, "TICKET_USED", "Este ingresso já foi utilizado.");
    const updated = await repo.markUsed(
      tx,
      ticket.id,
      await horarioBanco(tx),
      actor.id,
    );
    if (updated.count !== 1)
      throw new ErroAplicacao(409, "TICKET_USED", "Este ingresso já foi utilizado.");
    return repo.ticketByCode(tx, code);
  });
}
