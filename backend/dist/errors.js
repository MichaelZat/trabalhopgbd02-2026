import { z } from "zod";
export class ErroAplicacao extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export function parse(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success)
        throw new ErroAplicacao(400, "INVALID_INPUT", result.error.issues
            .map((i) => `${i.path.join(".") || "dados"}: ${i.message}`)
            .join("; "));
    return result.data;
}
export const idSchema = z.string().uuid("Identificador inválido.");
export function operator(actor) {
    if (actor.perfil !== "OPERADOR")
        throw new ErroAplicacao(403, "FORBIDDEN", "Acesso exclusivo do operador.");
}
//# sourceMappingURL=errors.js.map