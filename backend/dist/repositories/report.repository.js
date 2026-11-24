import { prisma } from "./database.js";
export async function sessionReport(from, to, sessionId) {
    const result = await prisma.$queryRaw `
    CALL sp_relatorio_sessoes(${from}::timestamptz, ${to}::timestamptz, ${sessionId}::uuid, NULL::jsonb)`;
    // A API mantém room; o alias da procedure foi traduzido para sala.
    return (result[0]?.resultado ?? []).map(({ sala, ...row }) => ({ ...row, room: sala }));
}
//# sourceMappingURL=report.repository.js.map