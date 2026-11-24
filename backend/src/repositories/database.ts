import { PrismaClient, Prisma } from "@prisma/client";
export const prisma = new PrismaClient();
export type Tx = Prisma.TransactionClient;
export function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(work, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 15000,
    timeout: 15000,
  });
}
export async function bloquearSessao(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM public.sessoes WHERE id = ${id}::uuid FOR UPDATE`;
  return rows.length > 0;
}
export async function horarioBanco(tx: Tx) {
  const rows = await tx.$queryRaw<
    { time: Date }[]
  >`SELECT clock_timestamp() AS time`;
  return rows[0]!.time;
}
export async function health() {
  await prisma.$queryRaw`SELECT 1`;
}
