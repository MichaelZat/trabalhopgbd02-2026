import { prisma } from "./database.js";
export const publicUser = { id: true, nome: true, email: true, perfil: true };
export const findUserByEmail = (email) => prisma.usuario.findUnique({ where: { email } });
export const findUser = (id) => prisma.usuario.findUnique({ where: { id }, select: publicUser });
export const createUser = (data) => prisma.usuario.create({
    data: { nome: data.name, email: data.email, hashSenha: data.passwordHash, perfil: data.perfil },
    select: publicUser,
});
export const setOperator = (email) => prisma.usuario.update({
    where: { email }, data: { perfil: "OPERADOR" }, select: publicUser,
});
//# sourceMappingURL=user.repository.js.map