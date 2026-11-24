import * as booking from "../services/reserva.servico.js";
import { actor } from "./auth.controller.js";
export async function map(req, res) {
    res.json(await booking.seatMap(actor(res), req.params.id));
}
export async function reservarAssentos(req, res) {
    res.status(201).json(await booking.reservarAssentos(actor(res), req.body));
}
export async function reservation(req, res) {
    res.json(await booking.getReservation(actor(res), req.params.id));
}
export async function pagarReserva(req, res) {
    res.json(await booking.pagarReserva(actor(res), req.params.id));
}
export async function counter(req, res) {
    res.status(201).json(await booking.counterSale(actor(res), req.body));
}
//# sourceMappingURL=booking.controller.js.map