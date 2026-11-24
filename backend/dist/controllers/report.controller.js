import { report } from "../services/report.service.js";
import { actor } from "./auth.controller.js";
export async function sessions(req, res) {
    res.json(await report(actor(res), req.query));
}
//# sourceMappingURL=report.controller.js.map