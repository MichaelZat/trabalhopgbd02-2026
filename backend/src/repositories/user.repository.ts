import { prisma } from "./database.js";
import type { PerfilUsuario } from "@prisma/client";
export const publicUser = { id: true, nome: true, email: true, perfil: true } as const;
export const findUserByEmail = (email: string) => prisma.usuario.findUnique({ where: { email } });
export const findUser = (id: string) => prisma.usuario.findUnique({ where: { id }, select: publicUser });
export const createUser = (data: { name: string; email: string; passwordHash: string; perfil?: PerfilUsuario }) =>
  prisma.usuario.create({
    data: { nome: data.name, email: data.email, hashSenha: data.passwordHash, perfil: data.perfil },
    select: publicUser,
  });
export const setOperator = (email: string) => prisma.usuario.update({
  where: { email }, data: { perfil: "OPERADOR" }, select: publicUser,
});
