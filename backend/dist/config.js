import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    RESERVATION_TTL_SECONDS: z.coerce.number().int().positive(),
    CORS_ORIGINS: z.string().default("http://localhost:8081"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    throw new Error("Configuração ausente ou inválida: " +
        parsed.error.issues.map((i) => i.path.join(".")).join(", "));
}
export const config = parsed.data;
//# sourceMappingURL=config.js.map