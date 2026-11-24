import { z } from "zod";
export class ErroAplicacao extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function parse<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ErroAplicacao(
      400,
      "INVALID_INPUT",
      result.error.issues
        .map((i) => `${i.path.join(".") || "dados"}: ${i.message}`)
        .join("; "),
    );
  return result.data;
}
export const idSchema = z.string().uuid("Identificador inválido.");
export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  perfil: "CLIENTE" | "OPERADOR";
};
export function operator(actor: UsuarioAutenticado) {
  if (actor.perfil !== "OPERADOR")
    throw new ErroAplicacao(403, "FORBIDDEN", "Acesso exclusivo do operador.");
}
