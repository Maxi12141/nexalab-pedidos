import type { IncomingMessage, ServerResponse } from "node:http";
import { handlePedidos } from "../api";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handlePedidos(req, res);
}
