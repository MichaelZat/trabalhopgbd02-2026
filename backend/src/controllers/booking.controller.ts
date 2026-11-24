import type { Request, Response } from "express";
import * as booking from "../services/reserva.servico.js";
import { actor } from "./auth.controller.js";
export async function map(req: Request, res: Response) {
  res.json(await booking.seatMap(actor(res), req.params.id));
}
export async function reservarAssentos(req: Request, res: Response) {
  res.status(201).json(await booking.reservarAssentos(actor(res), req.body));
}
export async function reservation(req: Request, res: Response) {
  res.json(await booking.getReservation(actor(res), req.params.id));
}
export async function pagarReserva(req: Request, res: Response) {
  res.json(await booking.pagarReserva(actor(res), req.params.id));
}
export async function counter(req: Request, res: Response) {
  res.status(201).json(await booking.counterSale(actor(res), req.body));
}
