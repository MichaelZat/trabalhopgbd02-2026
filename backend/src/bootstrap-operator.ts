import { z } from "zod";
import * as users from "./repositories/user.repository.js";
import { hashPassword } from "./services/auth.service.js";
import { prisma } from "./repositories/database.js";
const raw = process.env.BOOTSTRAP_OPERATOR_CREDENTIALS;
if (raw) {
  const data = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(1),
    })
    .parse(JSON.parse(raw));
  const email = data.email.trim().toLowerCase();
  const existing = await users.findUserByEmail(email);
  if (existing && existing.perfil !== "OPERADOR")
    throw new Error(
      "O e-mail configurado para operador já pertence a uma conta de cliente.",
    );
  if (!existing)
    await users.createUser({
      name: data.name,
      email,
      passwordHash: await hashPassword(data.password),
      perfil: "OPERADOR",
    });
  console.log("Operador inicial disponível.");
}
await prisma.$disconnect();
