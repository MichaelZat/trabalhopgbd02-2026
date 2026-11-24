import type { Request, Response } from "express";
import { report } from "../services/report.service.js";
import { actor } from "./auth.controller.js";
export async function sessions(req: Request, res: Response) {
  res.json(await report(actor(res), req.query));
}
