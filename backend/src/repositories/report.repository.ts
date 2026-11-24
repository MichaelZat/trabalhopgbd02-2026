import { prisma } from "./database.js";
export type SessionReport = {
  sessaoId: string; titulo: string; sala: string; inicioEm: string;
  capacidade: number; vendidos: number; utilizados: number; receita: string; taxaOcupacao: number;
};
export async function sessionReport(from: Date | null, to: Date | null, sessionId: string | null) {
  const result = await prisma.$queryRaw<{ resultado: SessionReport[] }[]>`
    CALL sp_relatorio_sessoes(${from}::timestamptz, ${to}::timestamptz, ${sessionId}::uuid, NULL::jsonb)`;
  // A API mantém room; o alias da procedure foi traduzido para sala.
  return (result[0]?.resultado ?? []).map(({ sala, ...row }) => ({ ...row, room: sala }));
}
