import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

function loadLocalEnv() {
  if (process.env.DATABASE_URL && process.env.FOTOS_DATABASE_URL) return
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq)
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1)
  }
}

loadLocalEnv()

export type OrderRow = {
  id: string
  name: string
  email: string
  phone: string
  device: string
  problem: string
  note: string
  date: string
  status: string
  done?: string
  price?: string
  clientMessage?: string
}

export type ReceiptRow = { orderId: string; number: string; detail: string; issuedAt: string }
export type ProjectRow = { id: number; title: string; category: string; image: string; published: boolean }

const statuses = ['Nuevo', 'En diagnóstico', 'En reparación', 'Listo para retirar', 'Entregado']

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function allowed(req: IncomingMessage) {
  const expected = process.env.NEXALAB_API_KEY
  if (!expected) return true
  const header = req.headers['x-nexalab-key']
  const value = Array.isArray(header) ? header[0] : header
  return value === expected
}

function readBody(req: IncomingMessage): Promise<unknown> {
  const cached = (req as IncomingMessage & { body?: unknown }).body
  if (cached && typeof cached === 'object') return Promise.resolve(cached)
  if (typeof cached === 'string' && cached) {
    try { return Promise.resolve(JSON.parse(cached)) } catch { return Promise.resolve(null) }
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve(null)
      try { resolve(JSON.parse(raw)) } catch { resolve(null) }
    })
    req.on('error', reject)
  })
}

function tipoDe(device: string) {
  const value = device.toLowerCase()
  if (/iphone|samsung|celular|motorola|xiaomi|pixel|galaxy/.test(value)) return 'Celular'
  if (/ipad|tablet/.test(value)) return 'Tablet'
  if (/macbook|notebook|ideapad|laptop|thinkpad/.test(value)) return 'Notebook'
  if (/\bpc\b|escritorio|gabinete/.test(value)) return 'PC'
  return 'Equipo'
}

function precioNumero(raw?: string) {
  if (!raw) return null
  const value = raw.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!value) return null
  const amount = value.includes(',')
    ? Number(value.replace(/\./g, '').replace(',', '.'))
    : /^\d{1,3}(\.\d{3})+$/.test(value) ? Number(value.replace(/\./g, '')) : Number(value)
  return Number.isFinite(amount) ? amount : null
}

function pedidosSql() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

function fotosSql() {
  const url = process.env.FOTOS_DATABASE_URL
  if (!url) return null
  return neon(url)
}

function asOrder(row: Record<string, unknown>): OrderRow | null {
  const id = String(row.codigo || '')
  if (!id) return null
  const priceText = row.precio_texto == null ? '' : String(row.precio_texto)
  const priceNumber = row.precio == null ? '' : String(row.precio)
  return {
    id,
    name: String(row.nombre || ''),
    email: row.email == null ? '' : String(row.email),
    phone: String(row.telefono || ''),
    device: String(row.marca_modelo || row.tipo_equipo || ''),
    problem: String(row.problema || ''),
    note: row.nota == null ? '' : String(row.nota),
    date: row.fecha_texto == null || row.fecha_texto === ''
      ? new Date(String(row.creado_en || Date.now())).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : String(row.fecha_texto),
    status: String(row.estado || 'Nuevo'),
    done: row.trabajo_realizado == null ? undefined : String(row.trabajo_realizado),
    price: priceText || priceNumber || undefined,
    clientMessage: row.mensaje_cliente == null ? undefined : String(row.mensaje_cliente),
  }
}

export async function readPedidos() {
  const sql = pedidosSql()
  if (!sql) return null
  const orders = await sql`SELECT codigo, nombre, telefono, email, tipo_equipo, marca_modelo, problema, nota, estado, trabajo_realizado, precio, precio_texto, mensaje_cliente, fecha_texto, creado_en FROM pedidos ORDER BY creado_en DESC`
  const receipts = await sql`SELECT codigo, numero, detalle, emitido_en FROM comprobantes`
  const reads = await sql`SELECT codigo FROM lecturas`
  const receiptMap: Record<string, ReceiptRow> = {}
  for (const row of receipts) {
    const codigo = String(row.codigo || '')
    if (!codigo) continue
    receiptMap[codigo] = {
      orderId: codigo,
      number: String(row.numero || ''),
      detail: String(row.detalle || ''),
      issuedAt: String(row.emitido_en || ''),
    }
  }
  return {
    orders: orders.map(row => asOrder(row)).filter((order): order is OrderRow => Boolean(order)),
    receipts: receiptMap,
    reads: reads.map(row => String(row.codigo || '')).filter(Boolean),
  }
}

export async function writePedidos(payload: { orders?: OrderRow[]; receipts?: Record<string, ReceiptRow>; reads?: string[] }) {
  const sql = pedidosSql()
  if (!sql) return false
  const orders = Array.from(new Map((payload.orders || []).filter(order => order.id && statuses.includes(order.status)).map(order => [order.id, order])).values())
  const codes = orders.map(order => order.id)
  const rows = orders.map(order => ({
    codigo: order.id,
    nombre: order.name || 'Sin nombre',
    telefono: order.phone || '-',
    email: order.email || null,
    tipo_equipo: tipoDe(order.device || ''),
    marca_modelo: order.device || null,
    problema: order.problem || '-',
    nota: order.note || null,
    estado: order.status,
    trabajo_realizado: order.done || null,
    precio: precioNumero(order.price),
    precio_texto: order.price || null,
    mensaje_cliente: order.clientMessage || null,
    fecha_texto: order.date || null,
  }))
  const receiptRows = Object.values(payload.receipts || {})
    .filter(receipt => codes.includes(receipt.orderId))
    .map(receipt => ({
      codigo: receipt.orderId,
      numero: receipt.number,
      detalle: receipt.detail,
      emitido_en: receipt.issuedAt,
    }))
  const readRows = (payload.reads || []).filter(code => codes.includes(code)).map(codigo => ({ codigo }))
  await sql.transaction(txn => [
    txn`DELETE FROM pedidos WHERE codigo IS NULL OR NOT (codigo = ANY(${codes}::text[]))`,
    txn`
      INSERT INTO pedidos (codigo, nombre, telefono, email, tipo_equipo, marca_modelo, problema, nota, estado, trabajo_realizado, precio, precio_texto, mensaje_cliente, origen, fecha_texto, actualizado_en)
      SELECT codigo, nombre, telefono, NULLIF(email, ''), tipo_equipo, marca_modelo, problema, nota, estado, trabajo_realizado, precio, precio_texto, mensaje_cliente, 'taller', fecha_texto, now()
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(
        codigo text,
        nombre text,
        telefono text,
        email text,
        tipo_equipo text,
        marca_modelo text,
        problema text,
        nota text,
        estado text,
        trabajo_realizado text,
        precio numeric,
        precio_texto text,
        mensaje_cliente text,
        fecha_texto text
      )
      ON CONFLICT (codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        telefono = EXCLUDED.telefono,
        email = EXCLUDED.email,
        tipo_equipo = EXCLUDED.tipo_equipo,
        marca_modelo = EXCLUDED.marca_modelo,
        problema = EXCLUDED.problema,
        nota = EXCLUDED.nota,
        estado = EXCLUDED.estado,
        trabajo_realizado = EXCLUDED.trabajo_realizado,
        precio = EXCLUDED.precio,
        precio_texto = EXCLUDED.precio_texto,
        mensaje_cliente = EXCLUDED.mensaje_cliente,
        fecha_texto = EXCLUDED.fecha_texto,
        actualizado_en = now()
    `,
    txn`DELETE FROM comprobantes`,
    txn`
      INSERT INTO comprobantes (codigo, numero, detalle, emitido_en)
      SELECT codigo, numero, detalle, emitido_en
      FROM jsonb_to_recordset(${JSON.stringify(receiptRows)}::jsonb) AS x(codigo text, numero text, detalle text, emitido_en text)
      ON CONFLICT (codigo) DO UPDATE SET numero = EXCLUDED.numero, detalle = EXCLUDED.detalle, emitido_en = EXCLUDED.emitido_en
    `,
    txn`DELETE FROM lecturas`,
    txn`
      INSERT INTO lecturas (codigo)
      SELECT codigo FROM jsonb_to_recordset(${JSON.stringify(readRows)}::jsonb) AS x(codigo text)
      ON CONFLICT (codigo) DO NOTHING
    `,
  ])
  return true
}

export async function readFotos() {
  const sql = fotosSql()
  if (!sql) return null
  const rows = await sql`SELECT id, titulo, categoria, imagen, publicado FROM proyectos ORDER BY id DESC`
  return rows.map(row => ({
    id: Number(row.id),
    title: String(row.titulo || ''),
    category: String(row.categoria || ''),
    image: String(row.imagen || ''),
    published: Boolean(row.publicado),
  }))
}

export async function writeFotos(projects: ProjectRow[]) {
  const sql = fotosSql()
  if (!sql) return false
  const rows = Array.from(new Map(projects.filter(project => project.id && project.image).map(project => [project.id, {
    id: project.id,
    titulo: project.title || 'Sin título',
    categoria: project.category || 'Trabajo',
    imagen: project.image,
    publicado: Boolean(project.published),
  }])).values())
  const ids = rows.map(row => row.id)
  await sql.transaction(txn => [
    txn`DELETE FROM proyectos WHERE NOT (id = ANY(${ids}::bigint[]))`,
    txn`
      INSERT INTO proyectos (id, titulo, categoria, imagen, publicado, actualizado_en)
      SELECT id, titulo, categoria, imagen, publicado, now()
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(id bigint, titulo text, categoria text, imagen text, publicado boolean)
      ON CONFLICT (id) DO UPDATE SET
        titulo = EXCLUDED.titulo,
        categoria = EXCLUDED.categoria,
        imagen = EXCLUDED.imagen,
        publicado = EXCLUDED.publicado,
        actualizado_en = now()
    `,
  ])
  return true
}

async function route(kind: 'pedidos' | 'fotos', req: IncomingMessage, res: ServerResponse) {
  if (!allowed(req)) return send(res, 401, { error: 'No autorizado' })
  try {
    if (req.method === 'GET' && kind === 'pedidos') {
      const data = await readPedidos()
      if (!data) return send(res, 503, { error: 'Base de pedidos no disponible' })
      return send(res, 200, data)
    }
    if (req.method === 'PUT' && kind === 'pedidos') {
      const body = await readBody(req) as { orders?: OrderRow[]; receipts?: Record<string, ReceiptRow>; reads?: string[] } | null
      if (!body) return send(res, 400, { error: 'Pedido inválido' })
      const ok = await writePedidos(body)
      if (!ok) return send(res, 503, { error: 'Base de pedidos no disponible' })
      return send(res, 200, { ok: true })
    }
    if (req.method === 'GET' && kind === 'fotos') {
      const projects = await readFotos()
      if (!projects) return send(res, 503, { error: 'Base de fotos no disponible' })
      return send(res, 200, { projects })
    }
    if (req.method === 'PUT' && kind === 'fotos') {
      const body = await readBody(req) as { projects?: ProjectRow[] } | null
      if (!body) return send(res, 400, { error: 'Proyecto inválido' })
      const ok = await writeFotos(body.projects || [])
      if (!ok) return send(res, 503, { error: 'Base de fotos no disponible' })
      return send(res, 200, { ok: true })
    }
    return send(res, 405, { error: 'Método no permitido' })
  } catch {
    return send(res, 500, { error: 'No se pudo guardar' })
  }
}

export function handlePedidos(req: IncomingMessage, res: ServerResponse) {
  return route('pedidos', req, res)
}

export function handleFotos(req: IncomingMessage, res: ServerResponse) {
  return route('fotos', req, res)
}
