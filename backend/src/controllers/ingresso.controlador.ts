import type { Request, Response } from "express";
import * as ticket from "../services/ticket.service.js";
import { actor } from "./auth.controller.js";
export async function list(_req: Request, res: Response) {
  res.json(await ticket.myTickets(actor(res)));
}
export async function detail(req: Request, res: Response) {
  res.json(await ticket.detail(actor(res), req.params.id));
}
export async function validate(req: Request, res: Response) {
  res.json(await ticket.validate(actor(res), req.body));
}
