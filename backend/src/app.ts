import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { readFileSync } from "node:fs";
import { parse as yaml } from "yaml";
import { Prisma } from "@prisma/client";
import { config } from "./config.js";
import { ErroAplicacao } from "./errors.js";
import { health } from "./repositories/database.js";
import * as auth from "./controllers/auth.controller.js";
import * as catalog from "./controllers/catalog.controller.js";
import * as booking from "./controllers/booking.controller.js";
import * as ticket from "./controllers/ingresso.controlador.js";
import * as report from "./controllers/report.controller.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
const origins = config.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) =>
      cb(null, Boolean(origin && origins.includes(origin))),
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use((_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body: unknown) => json(auth.toPublic(body));
  next();
});
app.use(cookieParser());
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.get("/api/health", async (_req, res) => {
  await health();
  res.json({ status: "ok" });
});
app.get("/api/openapi.json", (_req, res) =>
  res.json(
    yaml(readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8")),
  ),
);
app.post("/api/auth/cadastro", auth.register);
app.post("/api/autenticacao/entrar", auth.login);
app.get("/api/eventos", catalog.events);
app.get("/api/sessoes", catalog.sessions);
app.get("/api/sessoes/:id", catalog.session);
app.use("/api", auth.requireAuth);
app.get("/api/autenticacao/usuario-atual", auth.me);
app.post("/api/auth/logout", auth.logout);
app.get("/api/sessoes/:id/assentos", booking.map);
app.post("/api/reservas", booking.reservarAssentos);
app.get("/api/reservas/:id", booking.reservation);
app.post("/api/reservas/:id/pagamento-simulado", booking.pagarReserva);
app.get("/api/me/ingressos", ticket.list);
app.get("/api/ingressos/:id", ticket.detail);
app.post("/api/bilheteria/vendas", booking.counter);
app.post("/api/bilheteria/ingressos/validar", ticket.validate);
app.post("/api/gerencia/eventos", catalog.createEvent);
app.patch("/api/gerencia/eventos/:id", catalog.updateEvent);
app.get("/api/gerencia/salas", catalog.rooms);
app.post("/api/gerencia/salas", catalog.createRoom);
app.post("/api/gerencia/sessoes", catalog.createSession);
app.patch("/api/gerencia/sessoes/:id", catalog.updateSession);
app.get("/api/gerencia/relatorios/sessoes", report.sessions);
app.use((_req, res) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } }),
);
const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErroAplicacao) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res
        .status(409)
        .json({
          error: {
            code: "CONFLICT",
            message: "Este registro já existe ou a operação já foi concluída.",
          },
        });
      return;
    }
    if (error.code === "P2025") {
      res
        .status(404)
        .json({
          error: { code: "NOT_FOUND", message: "Registro não encontrado." },
        });
      return;
    }
    if (error.code === "P2003") {
      res
        .status(400)
        .json({
          error: {
            code: "INVALID_REFERENCE",
            message: "Uma referência informada não existe.",
          },
        });
      return;
    }
  }
  if (error instanceof SyntaxError) {
    res
      .status(400)
      .json({
        error: {
          code: "INVALID_JSON",
          message: "Envie os dados em JSON válido.",
        },
      });
    return;
  }
  console.error("Falha interna na requisição.", {
    kind: error instanceof Error ? error.name : "Unknown",
  });
  res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Não foi possível concluir a operação. Tente novamente.",
      },
    });
};
app.use(errorHandler);
