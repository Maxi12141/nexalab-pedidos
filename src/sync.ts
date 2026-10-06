export type RemoteOrder = {
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

export type RemoteReceipt = { orderId: string; number: string; detail: string; issuedAt: string }
export type RemoteProject = { id: number; title: string; category: string; image: string; published: boolean }

export type PedidosSnapshot = {
  orders: RemoteOrder[]
  receipts: Record<string, RemoteReceipt>
  reads: string[]
}

const key = import.meta.env.VITE_NEXALAB_KEY || ''

async function request(path: string, body?: unknown) {
  const headers = new Headers()
  if (key) headers.set('x-nexalab-key', key)
  if (body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'PUT',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) return null
  return response.json()
}

export async function fetchPedidos(): Promise<PedidosSnapshot | null> {
  const data = await request('/api/pedidos').catch(() => null) as PedidosSnapshot | null
  if (!data || !Array.isArray(data.orders)) return null
  return { orders: data.orders, receipts: data.receipts || {}, reads: data.reads || [] }
}

export async function savePedidos(snapshot: PedidosSnapshot) {
  const data = await request('/api/pedidos', snapshot).catch(() => null)
  return Boolean(data)
}

export async function fetchFotos(): Promise<RemoteProject[] | null> {
  const data = await request('/api/fotos').catch(() => null) as { projects?: RemoteProject[] } | null
  if (!data || !Array.isArray(data.projects)) return null
  return data.projects
}

export async function saveFotos(projects: RemoteProject[]) {
  const data = await request('/api/fotos', { projects }).catch(() => null)
  return Boolean(data)
}
