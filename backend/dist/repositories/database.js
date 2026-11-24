import { PrismaClient, Prisma } from "@prisma/client";
export const prisma = new PrismaClient();
export function transaction(work) {
    return prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 15000,
        timeout: 15000,
    });
}
export async function bloquearSessao(tx, id) {
    const rows = await tx.$queryRaw `SELECT id FROM public.sessoes WHERE id = ${id}::uuid FOR UPDATE`;
    return rows.length > 0;
}
export async function horarioBanco(tx) {
    const rows = await tx.$queryRaw `SELECT clock_timestamp() AS time`;
    return rows[0].time;
}
export async function health() {
    await prisma.$queryRaw `SELECT 1`;
}
//# sourceMappingURL=database.js.map