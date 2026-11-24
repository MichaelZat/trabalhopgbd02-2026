import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { z } from "zod";
import { prisma } from "../src/repositories/database.js";
import * as users from "../src/repositories/user.repository.js";
import { hashPassword } from "../src/services/auth.service.js";
const rl = createInterface({ input: stdin, output: stdout });
try {
  const email = z
    .string()
    .email()
    .parse((await rl.question("E-mail do operador: ")).trim().toLowerCase());
  const existing = await users.findUserByEmail(email);
  if (existing) {
    await users.setOperator(email);
    console.log("A conta existente agora possui o papel de operador.");
  } else {
    const name = (await rl.question("Nome: ")).trim();
    // Use uma variável de ambiente para não exibir a senha no terminal.
    const password = process.env.OPERATOR_PASSWORD;
    if (!name || !password)
      throw new Error(
        "Informe um nome e defina OPERATOR_PASSWORD antes de executar. A senha não será gravada no código.",
      );
    await users.createUser({
      name,
      email,
      passwordHash: await hashPassword(password),
      perfil: "OPERADOR",
    });
    console.log("Operador criado.");
  }
} finally {
  rl.close();
  await prisma.$disconnect();
}
