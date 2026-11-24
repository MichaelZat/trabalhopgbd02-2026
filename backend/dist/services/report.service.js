import { z } from "zod";
import { ErroAplicacao, idSchema, operator, parse } from "../errors.js";
import { sessionReport } from "../repositories/report.repository.js";
export async function report(actor, query) {
    operator(actor);
    const input = parse(z.object({
        inicio: z.string().datetime({ offset: true }).optional(),
        fim: z.string().datetime({ offset: true }).optional(),
        sessaoId: idSchema.optional(),
    }), query);
    const from = input.inicio ? new Date(input.inicio) : null, to = input.fim ? new Date(input.fim) : null;
    if (from && to && from > to)
        throw new ErroAplicacao(400, "INVALID_PERIOD", "A data final deve ser igual ou posterior à inicial.");
    return sessionReport(from, to, input.sessaoId ?? null);
}
//# sourceMappingURL=report.service.js.map