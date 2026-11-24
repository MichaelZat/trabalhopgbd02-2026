import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./repositories/database.js";
import { expirarReservas } from "./services/reserva.servico.js";
await prisma.$connect();
await expirarReservas();
const server = app.listen(config.PORT, "0.0.0.0", () =>
  console.log(`API disponível na porta ${config.PORT}.`),
);
let sweeping = false;
const interval = setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try {
    await expirarReservas();
  } catch {
    console.error("A varredura de reservas será repetida.");
  } finally {
    sweeping = false;
  }
}, 5000);
interval.unref();
async function stop() {
  clearInterval(interval);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
