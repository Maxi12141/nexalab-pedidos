import type { IncomingMessage, ServerResponse } from 'node:http'
import { handlePedidos } from '../server/api.ts'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handlePedidos(req, res)
}
