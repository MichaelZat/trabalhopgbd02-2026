import type { Request, Response } from "express";
import * as catalog from "../services/catalog.service.js";
import { actor } from "./auth.controller.js";
export async function events(_req: Request, res: Response) {
  res.json(await catalog.events());
}
export async function createEvent(req: Request, res: Response) {
  res.status(201).json(await catalog.createEvent(actor(res), req.body));
}
export async function updateEvent(req: Request, res: Response) {
  res.json(await catalog.updateEvent(actor(res), req.params.id, req.body));
}
export async function rooms(_req: Request, res: Response) {
  res.json(await catalog.rooms(actor(res)));
}
export async function createRoom(req: Request, res: Response) {
  res.status(201).json(await catalog.createRoom(actor(res), req.body));
}
export async function sessions(req: Request, res: Response) {
  res.json(await catalog.sessions(req.query.eventId));
}
export async function session(req: Request, res: Response) {
  res.json(await catalog.session(req.params.id));
}
export async function createSession(req: Request, res: Response) {
  res.status(201).json(await catalog.createSession(actor(res), req.body));
}
export async function updateSession(req: Request, res: Response) {
  res.json(await catalog.updateSession(actor(res), req.params.id, req.body));
}
