import type { IncomingMessage, ServerResponse } from "node:http";
import { handleFotos } from "../api";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleFotos(req, res);
}
