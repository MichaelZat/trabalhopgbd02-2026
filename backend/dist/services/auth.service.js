import { randomBytes, scrypt as scryptCallback, timingSafeEqual, } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { ErroAplicacao, parse } from "../errors.js";
import * as users from "../repositories/user.repository.js";
const scrypt = promisify(scryptCallback);
const credentials = z.object({
    email: z
        .string()
        .trim()
        .email()
        .transform((v) => v.toLowerCase()),
    password: z.string().min(1),
});
export async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
async function verify(password, stored) {
    const [salt, hex] = stored.split(":");
    if (!salt || !hex)
        return false;
    const key = (await scrypt(password, salt, 64));
    const expected = Buffer.from(hex, "hex");
    return key.length === expected.length && timingSafeEqual(key, expected);
}
export async function register(input) {
    const data = parse(credentials.extend({ name: z.string().trim().min(1) }), input);
    if (await users.findUserByEmail(data.email))
        throw new ErroAplicacao(409, "EMAIL_EXISTS", "Este e-mail já está cadastrado.");
    const user = await users.createUser({
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
    });
    return session(user);
}
function session(user) {
    return {
        user,
        token: jwt.sign({ sub: user.id }, config.JWT_SECRET, {
            expiresIn: "8h",
            issuer: "bilheteria",
        }),
    };
}
export async function login(input) {
    const data = parse(credentials, input);
    const user = await users.findUserByEmail(data.email);
    // A derivação também ocorre quando não há conta, evitando uma resposta trivialmente mais rápida.
    const valid = await verify(data.password, user?.hashSenha ?? "00000000000000000000000000000000:" + "0".repeat(128));
    if (!user || !valid)
        throw new ErroAplicacao(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    return session({
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
    });
}
export async function authenticate(token) {
    if (!token)
        throw new ErroAplicacao(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.");
    let id;
    try {
        const payload = jwt.verify(token, config.JWT_SECRET, {
            issuer: "bilheteria",
            algorithms: ["HS256"],
        });
        if (typeof payload === "string" || !payload.sub)
            throw new Error();
        id = payload.sub;
    }
    catch {
        throw new ErroAplicacao(401, "INVALID_TOKEN", "Sua sessão expirou. Entre novamente.");
    }
    const user = await users.findUser(id);
    if (!user)
        throw new ErroAplicacao(401, "INVALID_TOKEN", "Conta não encontrada.");
    return user;
}
//# sourceMappingURL=auth.service.js.map