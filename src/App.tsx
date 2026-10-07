import { useEffect, useRef, useState } from 'react'
import { fetchFotos, fetchPedidos, saveFotos, savePedidos } from './sync'

type Order = { id: string; name: string; email: string; phone: string; device: string; problem: string; note: string; date: string; status: string; done?: string; price?: string; clientMessage?: string }
type Receipt = { orderId: string; number: string; detail: string; issuedAt: string }
type Project = { id: number; title: string; category: string; image: string; published: boolean }
type Workshop = { name: string; slogan: string }

const defaultWorkshop: Workshop = { name: 'Nexalab', slogan: 'Taller de reparación' }

const initialProjects: Project[] = [
  { id: 1, title: 'Una segunda vida para esta MacBook', category: 'Notebooks', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop', published: true },
  { id: 2, title: 'Cambio de pantalla · iPhone', category: 'Celulares', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop', published: true },
  { id: 3, title: 'Mantenimiento y puesta a punto', category: 'Computadoras', image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&auto=format&fit=crop', published: false },
]

function load<T,>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    orders: 'M8 4H5v17h14V4h-3 M8 2h8v5H8z M8 12h8 M8 16h5',
    image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M15 7h.01',
    arrow: 'M7 17L17 7 M7 7h10v10',
    chevron: 'M9 5l7 7-7 7',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    plus: 'M12 5v14 M5 12h14',
    clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    check: 'M5 12l4 4L19 6',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
    tool: 'M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 2-3-3z',
    mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
    phone: 'M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4c-9 3-19-7-16-16',
    upload: 'M12 16V3 M7 8l5-5 5 5 M3 15v6h18v-6',
    incoming: 'M16 8L8 16 M8 8v8h8',
    print: 'M6 9V3h12v6 M6 18H4v-5h16v5h-2 M6 14h12v8H6z',
    share: 'M12 16V4 M8 8l4-4 4 4 M5 13v7h14v-7',
    close: 'M6 6l12 12 M6 18L18 6',
    globe: 'M2 12h20 M12 2c6 5 6 15 0 20-6-5-6-15 0-20 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    parts: 'M6 6h12v12H6z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
    menu: 'M4 7h16 M4 12h16 M4 17h16',
    external: 'M14 4h6v6 M20 4l-9 9 M10 5H5v14h14v-5',
    download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
    sun: 'M12 4v2 M12 18v2 M4 12H2 M22 12h-2 M6 6l-1.4-1.4 M19.4 19.4L18 18 M6 18l-1.4 1.4 M19.4 4.6L18 6 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5',
    trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 14h10l1-14 M9 7V4h6v3',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>
}

const statuses = ['Nuevo', 'En diagnóstico', 'En reparación', 'Listo para retirar', 'Entregado']
const tabs = ['Todos', 'En diagnóstico', 'En reparación', 'Listo para retirar', 'Entregado']
const tabLabel: Record<string, string> = {
  'En diagnóstico': 'Diagnóstico',
  'En reparación': 'En reparación',
  'Listo para retirar': 'Listos',
  Entregado: 'Entregados',
}

const shortStatus: Record<string, string> = {
  'En diagnóstico': 'Diagnóstico',
  'En reparación': 'Reparación',
  'Listo para retirar': 'Listo',
}

function Badge({ status, compact = false }: { status: string; compact?: boolean }) {
  return <span className={`badge status-${statuses.indexOf(status)}`} title={status}><i />{compact ? shortStatus[status] ?? status : status}</span>
}

const bestPartsUrl = 'https://precialo.com.ar/'

const partGroups = [
  {
    id: 'partes-celulares',
    title: 'Celulares',
    text: 'Pantallas, baterías y módulos para el servicio técnico.',
    links: [
      { name: 'Zarpar', detail: 'Mayorista, despacho en el día y envíos a todo el país', href: 'https://www.zarpar.com.ar/', tag: 'Taller' },
      { name: 'Blistech', detail: 'Pantallas premium y originales, elegidas por talleres', href: 'https://www.blistech.com.ar/', tag: 'Calidad' },
      { name: 'Comercial Antártica', detail: 'Módulos y baterías con garantía de 90 días', href: 'https://www.comercialantartica.com/', tag: 'Mayorista' },
      { name: 'Wifix', detail: 'Calidad Silver, Gold o Black, con garantía de 6 meses', href: 'https://www.wifixargentina.com.ar/mayorista-de-repuestos-de-celulares', tag: 'Calidad' },
      { name: 'Precialo', detail: 'Precios de repuestos comparados entre muchas tiendas', href: 'https://precialo.com.ar/c/repuestos-de-celulares', tag: 'Comparar' },
      { name: 'Mercado Libre', detail: 'Varios vendedores. Ordená por menor precio', href: 'https://listado.mercadolibre.com.ar/repuestos-celulares', tag: 'Comparar' },
    ],
  },
  {
    id: 'partes-pc',
    title: 'PC',
    text: 'Componentes de escritorio, del precio más bajo entre tiendas reales.',
    links: [
      { name: 'HardGamers', detail: 'Comparador que ordena solo desde el precio más bajo', href: 'https://www.hardgamers.com.ar/', tag: 'Comparar' },
      { name: 'CompraGamer', detail: 'Placas, memorias, discos y fuentes con stock', href: 'https://compragamer.com/', tag: 'Tienda' },
      { name: 'FullH4rd', detail: 'Hardware de mostrador en el centro de Buenos Aires', href: 'https://fullh4rd.com.ar/', tag: 'Tienda' },
      { name: 'Mercado Libre', detail: 'Componentes de varios vendedores', href: 'https://listado.mercadolibre.com.ar/componentes-de-pc', tag: 'Comparar' },
    ],
  },
  {
    id: 'partes-notebooks',
    title: 'Notebooks',
    text: 'Pantallas, baterías, teclados y cargadores.',
    links: [
      { name: 'Partes de Notebooks', detail: 'Pantallas y baterías con 6 meses de garantía', href: 'https://www.partesdenotebooks.ar/', tag: 'Taller' },
      { name: 'EnergyPro', detail: 'Repuestos de notebook y MacBook', href: 'https://energypro.ar/', tag: 'Tienda' },
      { name: 'Battery World', detail: 'Baterías, pantallas y teclados', href: 'https://www.batteryworld.com.ar/repuestos/', tag: 'Calidad' },
      { name: 'Cyberdyne', detail: 'Catálogo multimarca para notebook y servidor', href: 'https://www.cyberdyne.com.ar/', tag: 'Catálogo' },
      { name: 'Mercado Libre', detail: 'Repuestos de notebook de varios vendedores', href: 'https://listado.mercadolibre.com.ar/repuestos-notebooks', tag: 'Comparar' },
    ],
  },
  {
    id: 'partes-tablets',
    title: 'Tablets',
    text: 'Módulos, baterías y flex de iPad y tablets.',
    links: [
      { name: 'TecnoLand', detail: 'Displays, táctiles y baterías de tablets', href: 'https://www.tecnoland.com.ar/repuestos-de-tablets/', tag: 'Tablets' },
      { name: 'ATID', detail: 'Repuestos de iPad para talleres, con garantía', href: 'https://www.atidtecnologia.ar/', tag: 'Apple' },
      { name: 'EnergyPro', detail: 'Baterías de iPad y pantallas Surface', href: 'https://energypro.ar/', tag: 'Tienda' },
      { name: 'Mercado Libre', detail: 'Repuestos de tablet de varios vendedores', href: 'https://listado.mercadolibre.com.ar/repuestos-tablets', tag: 'Comparar' },
    ],
  },
]

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  )

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault()
      setPromptEvent(event as InstallPrompt)
    }
    function onInstalled() {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    if (choice.outcome === 'accepted') setInstalled(true)
    return choice.outcome === 'accepted'
  }

  return { canInstall: Boolean(promptEvent) && !installed, installed, install }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : ''
  return `${first}${last}`.toLocaleUpperCase('es-AR')
}

function takeIn(order: Order): Order {
  return order.status === 'Nuevo' ? { ...order, status: 'En diagnóstico' } : order
}

function splitBrand(name: string) {
  const value = name.trim() || defaultWorkshop.name
  if (/^nexalab$/i.test(value.replace(/\s+/g, ''))) return { lead: 'Nexa', tail: 'lab' }
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { lead: value, tail: '' }
  return { lead: `${parts.slice(0, -1).join(' ')} `, tail: parts[parts.length - 1] }
}

function Brand({ name, className = '' }: { name: string; className?: string }) {
  const { lead, tail } = splitBrand(name)
  return <span className={className} translate="no">{lead}{tail ? <span className="brand-accent">{tail}</span> : null}</span>
}

function formatPesos(raw: string) {
  const value = raw.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!value) return ''
  const amount = value.includes(',')
    ? Number(value.replace(/\./g, '').replace(',', '.'))
    : /^\d{1,3}(\.\d{3})+$/.test(value) ? Number(value.replace(/\./g, '')) : Number(value)
  if (!Number.isFinite(amount)) return raw.trim()
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

function readyText(order: Order, done: string, price: string) {
  const total = formatPesos(price) || 'a confirmar'
  return `Hola ${order.name.split(' ')[0]}, tu ${order.device} ya está listo para retirar.\n\n${done.trim() || 'Trabajo finalizado.'}\n\nTotal: ${total}`
}

function receiptText(order: Order, receipt: Receipt, company: string) {
  return [
    `Turno ${receipt.number} · ${company}`,
    `Fecha: ${receipt.issuedAt}`,
    `Cliente: ${order.name}`,
    `WhatsApp: ${order.phone}`,
    `Equipo: ${order.device}`,
    `Descripción: ${receipt.detail}`,
  ].join('\n')
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>(() => load('nexalab-orders', []))
  const [projects, setProjects] = useState(() => load('nexalab-projects', initialProjects))
  const [page, setPage] = useState('Pedidos')
  const [selected, setSelected] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [readyOpen, setReadyOpen] = useState(false)
  const [doneText, setDoneText] = useState('')
  const [priceText, setPriceText] = useState('')
  const [messageText, setMessageText] = useState('')
  const [messageEdited, setMessageEdited] = useState(false)
  const [receipts, setReceipts] = useState<Record<string, Receipt>>(() => load('nexalab-receipts', {} as Record<string, Receipt>))
  const [draftDetail, setDraftDetail] = useState('')
  const [readIds, setReadIds] = useState<string[]>(() => load('nexalab-reads', [] as string[]))
  const [filter, setFilter] = useState('Todos')
  const chipsRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'order' | 'project' | null>(null)
  const [toast, setToast] = useState('')
  const [photo, setPhoto] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [partTarget, setPartTarget] = useState('')
  const [theme, setTheme] = useState(() => load('nexalab-theme', 'dark'))
  const [workshop, setWorkshop] = useState<Workshop>(() => load('nexalab-workshop', defaultWorkshop))
  const [booting, setBooting] = useState(true)
  const [updateReady, setUpdateReady] = useState(false)
  const [deleteAsk, setDeleteAsk] = useState(false)
  const removedIds = useRef(new Set<string>())
  const synced = useRef(false)
  const snapshotRef = useRef({ orders, receipts, readIds })
  snapshotRef.current = { orders, receipts, readIds }
  const { canInstall, installed, install } = useInstallApp()

  const active = orders.find(order => order.id === selected)
  const filtered = orders.filter(order => {
    const matchesFilter = filter === 'Todos'
      || (filter === 'En proceso' && ['En diagnóstico', 'En reparación'].includes(order.status))
      || order.status === filter
    return matchesFilter && `${order.name} ${order.id} ${order.device}`.toLowerCase().includes(search.toLowerCase())
  })
  const inProgress = orders.filter(order => ['En diagnóstico', 'En reparación'].includes(order.status)).length
  const readyCount = orders.filter(order => order.status === 'Listo para retirar').length
  const doneCount = orders.filter(order => order.status === 'Entregado').length
  const freshOrders = orders.filter(order => order.status !== 'Entregado' && !readIds.includes(order.id))
  const unreadCount = freshOrders.length

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('nexalab-theme', next)
  }
  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }
  async function askInstall() {
    if (canInstall) {
      try {
        if (await install()) notify('Acceso directo creado')
      } catch {
        notify('Abrí el menú del navegador y tocá Instalar y crear acceso directo.')
      }
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    notify(ios
      ? 'Tocá Compartir y después Agregar a inicio.'
      : 'Abrí el menú del navegador y tocá Instalar y crear acceso directo.')
  }
  function pushPedidos(nextOrders: Order[], nextReceipts: Record<string, Receipt>, nextReads: string[], removed: string[] = []) {
    if (!synced.current) return
    void savePedidos({ orders: nextOrders, receipts: nextReceipts, reads: nextReads, removed }).then(ok => {
      if (!ok) notify('No se pudo guardar el pedido en la base. Quedó en este teléfono.')
    })
  }
  function saveOrders(next: Order[]) {
    setOrders(next)
    localStorage.setItem('nexalab-orders', JSON.stringify(next))
    pushPedidos(next, receipts, readIds)
  }
  function saveWorkshop(next: Workshop) {
    const value = {
      name: next.name.trim() || defaultWorkshop.name,
      slogan: next.slogan.trim() || defaultWorkshop.slogan,
    }
    setWorkshop(value)
    localStorage.setItem('nexalab-workshop', JSON.stringify(value))
  }
  function removeOrder(id: string, message = 'Pedido eliminado') {
    removedIds.current.add(id)
    const next = orders.filter(order => order.id !== id)
    const nextReceipts = { ...receipts }
    delete nextReceipts[id]
    const nextReads = readIds.filter(item => item !== id)
    setOrders(next)
    setReceipts(nextReceipts)
    setReadIds(nextReads)
    localStorage.setItem('nexalab-orders', JSON.stringify(next))
    localStorage.setItem('nexalab-receipts', JSON.stringify(nextReceipts))
    localStorage.setItem('nexalab-reads', JSON.stringify(nextReads))
    pushPedidos(next, nextReceipts, nextReads, [id])
    if (selected === id) {
      setDetailOpen(false)
      setDeleteAsk(false)
      setSelected(next[0]?.id || '')
    }
    notify(message)
  }
  function saveProjects(next: Project[]) {
    let stored = true
    try { localStorage.setItem('nexalab-projects', JSON.stringify(next)) } catch { stored = false }
    setProjects(next)
    if (synced.current) {
      void saveFotos(next).then(ok => {
        if (ok) return
        notify(stored
          ? 'La foto quedó en este teléfono, pero no se guardó en la base.'
          : 'No se pudo guardar la foto. Probá con una más chica.')
      })
    }
    if (!stored && !synced.current) {
      setUploadError('No se pudo guardar la foto. Probá con una más chica.')
      return false
    }
    return true
  }
  function openReady(order: Order) {
    const done = order.done || 'Revisión y reparación.'
    const price = order.price || ''
    setDoneText(done)
    setPriceText(price)
    setMessageEdited(Boolean(order.clientMessage))
    setMessageText(order.clientMessage || readyText(order, done, price))
    setReadyOpen(true)
  }
  function applyReady(done: string, price: string, edited: boolean) {
    if (!active || edited) return
    setMessageText(readyText(active, done, price))
  }
  function saveReadyMessage() {
    saveOrders(orders.map(order => order.id === selected ? { ...order, done: doneText, price: priceText, clientMessage: messageText, status: order.status === 'Listo para retirar' || order.status === 'Entregado' ? order.status : 'Listo para retirar' } : order))
  }
  function sendReadyMessage() {
    if (!active) return
    saveReadyMessage()
    const phone = active.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener')
  }
  function changeStatus(status: string) {
    const next = orders.map(order => order.id === selected ? { ...order, status } : order)
    saveOrders(next)
    notify('Estado del pedido actualizado')
    if (status === 'Listo para retirar') {
      const order = next.find(item => item.id === selected)
      if (order) openReady(order)
    }
  }
  function openReceipt() {
    if (!active) return
    const saved = receipts[active.id]
    setDraftDetail(saved?.detail || active.problem)
    setReceiptOpen(true)
  }
  function buildReceipt() {
    if (!active) return null
    const previous = receipts[active.id]
    const receipt: Receipt = {
      orderId: active.id,
      number: `T-${active.id.replace('NX-', '')}`,
      detail: draftDetail.trim() || active.problem,
      issuedAt: previous?.issuedAt || new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
    }
    const next = { ...receipts, [active.id]: receipt }
    setReceipts(next)
    localStorage.setItem('nexalab-receipts', JSON.stringify(next))
    pushPedidos(orders, next, readIds)
    return receipt
  }
  function printReceipt() {
    if (!buildReceipt()) return
    window.print()
  }
  async function shareReceipt() {
    if (!active) return
    const receipt = buildReceipt()
    if (!receipt) return
    const text = receiptText(active, receipt, workshop.name)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Turno ${receipt.number}`, text })
        return
      } catch { /* el usuario canceló o el navegador no completó el envío */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  function openOrder(id: string) {
    const nextReads = Array.from(new Set([...readIds, id]))
    if (nextReads.length !== readIds.length) {
      setReadIds(nextReads)
      localStorage.setItem('nexalab-reads', JSON.stringify(nextReads))
      pushPedidos(orders, receipts, nextReads)
    }
    setSelected(id)
    setNotesOpen(false)
    setDeleteAsk(false)
    setDetailOpen(true)
  }
  function openNotes() {
    setDetailOpen(false)
    setModal(null)
    setNotesOpen(true)
  }
  function markAllRead() {
    const next = Array.from(new Set([...readIds, ...freshOrders.map(order => order.id)]))
    setReadIds(next)
    localStorage.setItem('nexalab-reads', JSON.stringify(next))
    pushPedidos(orders, receipts, next)
  }
  function chooseFilter(status: string) {
    const chipsLeft = chipsRef.current?.scrollLeft ?? 0
    setFilter(status)
    requestAnimationFrame(() => {
      if (chipsRef.current) chipsRef.current.scrollLeft = chipsLeft
      const card = document.querySelector<HTMLElement>('.phone-order, .phone-empty')
      const nav = document.querySelector<HTMLElement>('.phone-nav')
      if (!card || !nav) return
      const limit = nav.getBoundingClientRect().top - 16
      const bottom = card.getBoundingClientRect().bottom
      if (bottom > limit) document.scrollingElement?.scrollBy(0, bottom - limit)
    })
  }
  function openModal(kind: 'order' | 'project') {
    setPhoto('')
    setUploadError('')
    setMenuOpen(false)
    setModal(kind)
  }
  function go(next: string, partId = '') {
    setPage(next)
    setDetailOpen(false)
    setMenuOpen(false)
    if (partId) setPartTarget(partId)
  }

  useEffect(() => {
    if (page !== 'Repuestos' || !partTarget) return
    const node = document.getElementById(partTarget)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPartTarget('')
  }, [page, partTarget])

  useEffect(() => {
    document.title = workshop.name
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', workshop.name)
  }, [workshop.name])

  useEffect(() => {
    let cancel = false
    const started = Date.now()
    let hideTimer = 0
    function openApp() {
      if (cancel) return
      synced.current = true
      setBooting(false)
    }
    const failsafe = window.setTimeout(openApp, 2500)
    ;(async () => {
      try {
        const [pedidos, fotos] = await Promise.all([fetchPedidos(), fetchFotos()])
        if (cancel) return
        if (pedidos && pedidos.orders.length > 0) {
          const nextOrders = pedidos.orders.map(takeIn)
          setOrders(nextOrders)
          setReceipts(pedidos.receipts)
          setReadIds(pedidos.reads)
          localStorage.setItem('nexalab-orders', JSON.stringify(nextOrders))
          localStorage.setItem('nexalab-receipts', JSON.stringify(pedidos.receipts))
          localStorage.setItem('nexalab-reads', JSON.stringify(pedidos.reads))
          setSelected(nextOrders[0].id)
          if (nextOrders.some((order, index) => order.status !== pedidos.orders[index].status)) {
            void savePedidos({ orders: nextOrders, receipts: pedidos.receipts, reads: pedidos.reads })
          }
        } else if (pedidos) {
          setOrders([])
          setReceipts({})
          setReadIds([])
          localStorage.setItem('nexalab-orders', '[]')
          localStorage.setItem('nexalab-receipts', '{}')
          localStorage.setItem('nexalab-reads', '[]')
          setSelected('')
        }
        if (fotos && fotos.length > 0) {
          setProjects(fotos)
          localStorage.setItem('nexalab-projects', JSON.stringify(fotos))
        } else if (fotos) {
          void saveFotos(load('nexalab-projects', initialProjects))
        }
      } catch { /* si la base no responde, sigue lo guardado en el teléfono */ }
      const wait = Math.max(0, 700 - (Date.now() - started))
      hideTimer = window.setTimeout(() => {
        window.clearTimeout(failsafe)
        openApp()
      }, wait)
    })()
    return () => {
      cancel = true
      window.clearTimeout(hideTimer)
      window.clearTimeout(failsafe)
    }
  }, [])

  useEffect(() => {
    if (booting) return
    const timer = window.setInterval(() => {
      void fetchPedidos().then(pedidos => {
        if (!pedidos) return
        setOrders(current => {
          const known = new Set(current.map(order => order.id))
          const incoming = pedidos.orders
            .filter(order => !known.has(order.id) && !removedIds.current.has(order.id))
            .map(takeIn)
          if (!incoming.length) return current
          const next = [...incoming, ...current]
          localStorage.setItem('nexalab-orders', JSON.stringify(next))
          const snap = snapshotRef.current
          void savePedidos({ orders: next, receipts: snap.receipts, reads: snap.readIds })
          return next
        })
      })
    }, 8000)
    return () => window.clearInterval(timer)
  }, [booting])

  useEffect(() => {
    if (__APP_BUILD__ === 'dev') return
    let stop = false
    async function check() {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json() as { id?: string }
        if (!stop && data.id && data.id !== __APP_BUILD__) setUpdateReady(true)
      } catch { /* sin conexión no hay aviso */ }
    }
    void check()
    const timer = window.setInterval(() => void check(), 30000)
    function onVisible() {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stop = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const titles: Record<string, { title: string; text: string }> = {
    Pedidos: { title: 'Pedidos', text: 'Revisá el listado y abrí un pedido cuando quieras ver el detalle.' },
    Proyectos: { title: 'Proyectos', text: 'Fotos de los trabajos del taller.' },
    Repuestos: { title: 'Repuestos', text: 'Enlaces separados para comprar al mejor precio.' },
    Configuración: { title: 'Ajustes', text: 'Nombre de la empresa y cómo se guarda la información.' },
  }
  const heading = titles[page] ?? titles.Pedidos
  const stats = [
    { label: 'Pedidos totales', value: orders.length, caption: 'En este taller', icon: 'orders', filter: 'Todos' },
    { label: 'En proceso', value: inProgress, caption: 'Diagnóstico y reparación', icon: 'tool', filter: 'En proceso' },
    { label: 'Listos', value: readyCount, caption: 'Para retirar', icon: 'check', filter: 'Listo para retirar' },
    { label: 'Entregados', value: doneCount, caption: 'Ya retirados', icon: 'arrow', filter: 'Entregado' },
  ]

  return <div className={`app-shell${theme === 'light' ? ' theme-light' : ''}${detailOpen || modal || receiptOpen || readyOpen ? ' sheet-open' : ''}`}>
    {booting && (
      <div className="boot-screen" role="status" aria-live="polite" aria-label={`Cargando ${workshop.name}`}>
        <div className="boot-card">
          <span className="boot-spinner" aria-hidden="true" />
          <p className="boot-caption">Cargando</p>
          <p className="boot-name"><Brand name={workshop.name} /></p>
        </div>
      </div>
    )}
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setPage('Pedidos'); setDetailOpen(false) }}>
        <span className="brand-icon"><Icon name="tool" /></span>
        <span className="brand-copy"><strong><Brand name={workshop.name} /></strong><small>{workshop.slogan}</small></span>
      </a>
      <nav className="main-nav">
        {[['Pedidos', 'orders'], ['Proyectos', 'image'], ['Repuestos', 'parts']].map(([label, icon]) => (
          <button key={label} className={page === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}>
            <span className="nav-icon"><Icon name={icon} /></span>
            {label}
            {label === 'Pedidos' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className={page === 'Configuración' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('Configuración'); setDetailOpen(false) }}>
          <span className="nav-icon"><Icon name="settings" /></span>Configuración
        </button>
        <div className="profile">
          <span className="avatar">AD</span>
          <div><strong>Administrador</strong><small><i className="live-dot" /> Taller operativo</small></div>
        </div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div><Brand name={workshop.name} /> <span>/</span> <strong>{page === 'Configuración' ? 'Ajustes' : page}</strong></div>
        <div className="topbar-right">
          {!installed && (
            <button className="install-button" onClick={askInstall}>
              <Icon name="download" size={16} />Instalar
            </button>
          )}
          <span className="connection"><i /><span>Taller operativo</span></span>
          <button className="icon-button" aria-label="Ver notificaciones" onClick={openNotes}>
            <Icon name="bell" />{unreadCount > 0 && <span className="notification-dot" />}
          </button>
          <span className="avatar small">AD</span>
        </div>
      </header>

      <main>
        <header className="phone-top phone-only">
          <button className="phone-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <div className="phone-brand">
            <span className="phone-mark">{initials(workshop.name)}</span>
            <div>
              <strong className="phone-logo"><Brand name={workshop.name} /></strong>
              <small>{workshop.slogan}</small>
            </div>
          </div>
          <button className="phone-theme" aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'} onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <button className="phone-bell" aria-label="Ver notificaciones" onClick={openNotes}>
            <Icon name="bell" size={18} />
            {unreadCount > 0 && <span>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </header>

        {page !== 'Pedidos' && page !== 'Configuración' && (
          <div className="phone-page-title phone-only">
            <h1>{heading.title}</h1>
            <p>{heading.text}</p>
          </div>
        )}

        <div className="page-heading">
          <div>
            <div className="eyebrow">{workshop.name.toUpperCase()}</div>
            <h1>{heading.title}</h1>
            <p>{heading.text}</p>
          </div>
          {page !== 'Configuración' && page !== 'Repuestos' && (
            <button className="primary-button" onClick={() => openModal(page === 'Proyectos' ? 'project' : 'order')}>
              <Icon name="plus" size={18} />
              {page === 'Proyectos' ? 'Subir proyecto' : 'Nuevo pedido'}
            </button>
          )}
        </div>

        {page === 'Pedidos' && <>
          <section className="phone-home phone-only">
            <div className="phone-toolbar">
              <div>
                <h1>Pedidos</h1>
                <p>{orders.length} en el taller</p>
              </div>
              <button type="button" className="phone-new" onClick={() => openModal('order')}>
                <Icon name="plus" size={16} />Nuevo
              </button>
            </div>
            <div className="phone-metrics">
              <button type="button" className={filter === 'En proceso' ? 'on' : ''} onClick={() => chooseFilter('En proceso')}>
                <strong>{inProgress}</strong>
                <span>En proceso</span>
              </button>
              <button type="button" className={filter === 'Listo para retirar' ? 'on' : ''} onClick={() => chooseFilter('Listo para retirar')}>
                <strong>{readyCount}</strong>
                <span>Listos</span>
              </button>
              <button type="button" className={filter === 'Entregado' ? 'on' : ''} onClick={() => chooseFilter('Entregado')}>
                <strong>{doneCount}</strong>
                <span>Entregados</span>
              </button>
            </div>
            <div className="phone-chips" ref={chipsRef}>
              {tabs.map(status => (
                <button
                  key={status}
                  type="button"
                  className={filter === status ? 'selected' : ''}
                  onPointerDown={event => event.preventDefault()}
                  onClick={() => chooseFilter(status)}
                >
                  {tabLabel[status] ?? status}
                </button>
              ))}
            </div>
            <label className="phone-search">
              <Icon name="search" size={16} />
              <input placeholder="Buscar cliente o equipo" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <div className="phone-list">
            {filtered.map(order => (
              <button type="button" className={`phone-order accent-${statuses.indexOf(order.status)}`} key={order.id} onClick={() => openOrder(order.id)}>
                <span className={`client-avatar color-${orders.indexOf(order) % 4}`}>{initials(order.name)}</span>
                <span className="phone-order-copy">
                  <strong>{order.device}</strong>
                  <em>{order.name}</em>
                  <small>{order.date}</small>
                </span>
                <span className="phone-order-side">
                  <Badge status={order.status} compact />
                  <Icon name="chevron" size={16} />
                </span>
              </button>
            ))}
            </div>
            {!filtered.length && <div className="phone-empty">No hay pedidos con ese filtro.</div>}
          </section>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <button className={`stat-card stat-${index}${filter === stat.filter ? ' active' : ''}`} key={stat.label} onClick={() => setFilter(stat.filter)}>
                <div className="stat-label">{stat.label}<span className="stat-icon"><Icon name={stat.icon} size={18} /></span></div>
                <div className="stat-value">{String(stat.value).padStart(2, '0')}</div>
                <small>{stat.caption}</small>
              </button>
            ))}
          </div>

          <section className="orders-panel">
            <div className="panel-heading">
              <div>
                <h2>Listado <span>{filtered.length}</span></h2>
                <p>Elegí una fila para ver cliente, problema y estado.</p>
              </div>
              <span className="panel-kicker"><Icon name="orders" size={18} /></span>
            </div>
            <div className="table-tools">
              <div className="tabs">
                {tabs.map(status => (
                  <button key={status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>
                    {tabLabel[status] ?? status}
                  </button>
                ))}
              </div>
              <label className="search">
                <Icon name="search" size={18} />
                <input placeholder="Buscar cliente, equipo o pedido" value={search} onChange={event => setSearch(event.target.value)} />
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Equipo</th><th>Estado</th><th>Recibido</th><th /></tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className={detailOpen && selected === order.id ? 'row-selected' : ''} onClick={() => openOrder(order.id)}>
                      <td>
                        <div className="client-cell">
                          <span className={`client-avatar color-${orders.indexOf(order) % 4}`}>{initials(order.name)}</span>
                          <div><strong>{order.name}</strong><small>#{order.id}</small></div>
                        </div>
                      </td>
                      <td>{order.device}</td>
                      <td><Badge status={order.status} /></td>
                      <td className="date-cell">{order.date}</td>
                      <td>
                        <button className="row-button" aria-label={`Ver pedido de ${order.name}`}><Icon name="chevron" size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div className="empty">No hay pedidos con ese filtro.</div>}
            </div>
            <div className="table-footer">
              <span>Mostrando {filtered.length} de {orders.length}</span>
              <span className="demo-label">Taller</span>
            </div>
          </section>
        </>}

        {page === 'Proyectos' && <>
          <button className="add-photo phone-only" onClick={() => openModal('project')}>
            <Icon name="plus" size={18} />Agregar imagen
          </button>
          <div className="gallery-heading">
            <span className="published-pill"><i className="live-dot" />{projects.filter(project => project.published).length} publicados</span>
          </div>
          <div className="project-grid">
            {projects.map(project => (
              <article className="project-card" key={project.id}>
                <div className="project-photo">
                  <img src={project.image} alt={project.title} />
                  <span className="photo-label">{project.category}</span>
                </div>
                <div className="project-info">
                  <h2>{project.title}</h2>
                  <p>Reparación documentada del taller.</p>
                  <div className="publish-row">
                    <span>{project.published ? 'Publicado' : 'Borrador'}</span>
                    <button className={`toggle ${project.published ? 'on' : ''}`} aria-label={`Publicar ${project.title}`} aria-pressed={project.published} onClick={() => {
                      if (saveProjects(projects.map(item => item.id === project.id ? { ...item, published: !item.published } : item))) {
                        notify(project.published ? 'Proyecto pasado a borrador' : 'Proyecto publicado')
                      }
                    }}><span /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="local-info">Los proyectos se guardan en este navegador.</div>
        </>}

        {page === 'Repuestos' && (
          <section className="parts-page">
            <div className="parts-jumps">
              {partGroups.map(group => (
                <a key={group.id} href={`#${group.id}`}>{group.title}</a>
              ))}
            </div>
            <div className="parts-grid">
              {partGroups.map(group => (
                <article className="parts-card" id={group.id} key={group.id}>
                  <header>
                    <h2>{group.title}</h2>
                    <p>{group.text}</p>
                  </header>
                  <div className="parts-links">
                    {group.links.map(link => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                        <span>
                          <strong>{link.name}</strong>
                          <em>{link.detail}</em>
                        </span>
                        <small>{link.tag}</small>
                        <Icon name="external" size={16} />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <a className="parts-buy" href={bestPartsUrl} target="_blank" rel="noreferrer">
              <span>
                <strong>Comprar repuestos</strong>
                <em>Precialo compara más de 80 tiendas y el historial de cada precio.</em>
              </span>
              <Icon name="arrow" size={18} />
            </a>
            <p className="parts-note">Para PC, HardGamers lista el precio más bajo de cada componente. Para celulares, los mayoristas de arriba suelen convenir más que una tienda suelta.</p>
          </section>
        )}

        {page === 'Configuración' && (
          <section className="settings-panel">
            <div className="settings-card">
              <h2>Empresa</h2>
              <p>Este nombre se ve en la app, en los turnos y en los mensajes de WhatsApp.</p>
              <label>
                Nombre de la empresa
                <input
                  value={workshop.name}
                  maxLength={40}
                  autoComplete="organization"
                  onChange={event => setWorkshop({ ...workshop, name: event.target.value })}
                  onBlur={event => saveWorkshop({ ...workshop, name: event.target.value })}
                />
              </label>
              <label>
                Texto corto
                <input
                  value={workshop.slogan}
                  maxLength={48}
                  onChange={event => setWorkshop({ ...workshop, slogan: event.target.value })}
                  onBlur={event => saveWorkshop({ ...workshop, slogan: event.target.value })}
                />
              </label>
            </div>
            <div className="settings-card">
              <h2>Pedidos web</h2>
              <p>Los pedidos que llegan desde la página entran directo al taller, en diagnóstico. Si más adelante te arrepentís, podés eliminarlos desde el detalle.</p>
            </div>
          </section>
        )}

        <footer className="main-footer">
          <span><Brand name={workshop.name} /> <span>ADMIN</span></span>
          <span>Tecnología en buenas manos.</span>
          <span><i className="live-dot" /> Espacio local</span>
        </footer>
      </main>
    </div>

    {detailOpen && active && <>
      <div className="drawer-backdrop" onClick={() => setDetailOpen(false)} />
      <aside className="detail-panel" role="dialog" aria-label="Detalle del pedido">
        <div className="detail-top">
          <span>PEDIDO</span>
          <div className="detail-actions">
            <span className="detail-id">#{active.id}</span>
            <button className="icon-button" aria-label="Cerrar detalle" onClick={() => setDetailOpen(false)}><Icon name="close" size={18} /></button>
          </div>
        </div>
        <div className="detail-title">
          <h2>{active.device}</h2>
          <Badge status={active.status} />
        </div>
        <div className="received"><Icon name="clock" size={16} />Recibido {active.date.toLowerCase()}</div>
        <div className="detail-section">
          <h3>CLIENTE</h3>
          <div className="detail-client">
            <span className="client-avatar color-0">{initials(active.name)}</span>
            <div><strong>{active.name}</strong><small>Cliente del taller</small></div>
          </div>
          <a className="contact-line" href={`mailto:${active.email}`}><Icon name="mail" size={16} />{active.email}</a>
          <a className="contact-line" href={`tel:${active.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={16} />{active.phone}</a>
        </div>
        <div className="detail-section">
          <h3>PROBLEMA</h3>
          <p className="problem">{active.problem}</p>
        </div>
        <div className="note-box">
          <h3><Icon name="orders" size={15} /> NOTA</h3>
          <p>{active.note || 'Sin nota adicional.'}</p>
        </div>
        <div className="status-control">
          <label htmlFor="order-status">Estado del pedido</label>
          <select id="order-status" value={active.status} onChange={event => changeStatus(event.target.value)}>
            {statuses.map(status => <option key={status}>{status}</option>)}
          </select>
        </div>
        {(active.status === 'Listo para retirar' || active.status === 'Entregado') && (
          <button type="button" className="receipt-launch" onClick={() => openReady(active)}><Icon name="mail" size={16} />{active.clientMessage ? 'Editar mensaje' : 'Mensaje al cliente'}</button>
        )}
        <button type="button" className="receipt-launch" onClick={openReceipt}><Icon name="orders" size={16} />{receipts[active.id] ? 'Ver turno' : 'Hacer turno'}</button>
        <a className="whatsapp-button" target="_blank" rel="noreferrer" href={`https://wa.me/${active.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${active.name.split(' ')[0]}, te contactamos desde ${workshop.name} por tu ${active.device}.`)}`}>
          <Icon name="phone" size={17} />Contactar por WhatsApp<Icon name="arrow" size={15} />
        </a>
        {deleteAsk ? (
          <div className="delete-confirm">
            <p>¿Eliminar este pedido? No se puede deshacer.</p>
            <div>
              <button type="button" className="secondary-button" onClick={() => setDeleteAsk(false)}>Cancelar</button>
              <button type="button" className="danger-button" onClick={() => removeOrder(active.id)}>Sí, eliminar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setDeleteAsk(true)}><Icon name="trash" size={16} />Eliminar pedido</button>
        )}
        <div className="detail-foot"><Icon name="globe" size={14} /> Recibido desde la web</div>
      </aside>
    </>}

    {receiptOpen && active && (
      <div className="receipt-screen">
        <div className="receipt-toolbar">
          <button type="button" className="icon-button" aria-label="Cerrar turno" onClick={() => setReceiptOpen(false)}><Icon name="close" size={18} /></button>
          <strong>Turno</strong>
          <span />
        </div>
        <div className="receipt-layout">
          <form className="receipt-form" onSubmit={event => { event.preventDefault(); printReceipt() }}>
            <label>Descripción de lo que tiene
              <textarea rows={3} value={draftDetail} onChange={event => setDraftDetail(event.target.value)} />
            </label>
            <div className="receipt-actions">
              <button type="submit" className="bank-fill"><Icon name="print" size={16} />Imprimir</button>
              <button type="button" className="bank-outline" onClick={shareReceipt}><Icon name="share" size={16} />Compartir</button>
            </div>
          </form>
          <article className="receipt-paper">
            <header>
              <div>
                <strong>{workshop.name.toUpperCase()}</strong>
                <span>{workshop.slogan}</span>
              </div>
              <div className="receipt-id">
                <em>TURNO</em>
                <b>T-{active.id.replace('NX-', '')}</b>
                <small>{receipts[active.id]?.issuedAt || 'Se fecha al imprimir'}</small>
              </div>
            </header>
            <section>
              <h3>Cliente</h3>
              <p>{active.name}</p>
            </section>
            <section>
              <h3>WhatsApp</h3>
              <p>{active.phone}</p>
            </section>
            <section>
              <h3>Equipo</h3>
              <p>{active.device}</p>
            </section>
            <section>
              <h3>Descripción</h3>
              <p>{draftDetail.trim() || active.problem}</p>
            </section>
            <div className="receipt-signs">
              <span><i />Firma del cliente</span>
              <span><i />Firma del taller</span>
            </div>
            <p className="receipt-legal">Comprobante de ingreso. Conservar hasta el retiro del equipo.</p>
          </article>
        </div>
      </div>
    )}

    {readyOpen && active && (
      <div className="receipt-screen">
        <div className="receipt-toolbar">
          <button type="button" className="icon-button" aria-label="Cerrar mensaje" onClick={() => { saveReadyMessage(); setReadyOpen(false) }}><Icon name="close" size={18} /></button>
          <strong>Listo para retirar</strong>
          <span />
        </div>
        <div className="receipt-layout">
          <form className="receipt-form" onSubmit={event => { event.preventDefault(); sendReadyMessage() }}>
            <p className="ready-hint">El cliente dijo: {active.problem}</p>
            <label>Qué se hizo
              <textarea rows={3} value={doneText} onChange={event => { const value = event.target.value; setDoneText(value); applyReady(value, priceText, messageEdited) }} />
            </label>
            <label>Precio total
              <input inputMode="decimal" placeholder="25000" value={priceText} onChange={event => { const value = event.target.value; setPriceText(value); applyReady(doneText, value, messageEdited) }} />
            </label>
            <label>Mensaje
              <textarea rows={6} value={messageText} onChange={event => { setMessageText(event.target.value); setMessageEdited(true) }} />
            </label>
            {messageEdited && <button type="button" className="notes-read ready-reset" onClick={() => { setMessageEdited(false); setMessageText(readyText(active, doneText, priceText)) }}>Volver al texto automático</button>}
            <button type="submit" className="bank-fill receipt-send"><Icon name="phone" size={16} />Enviar por WhatsApp</button>
          </form>
        </div>
      </div>
    )}

    {notesOpen && <>
      <button className="notes-backdrop" aria-label="Cerrar notificaciones" onClick={() => setNotesOpen(false)} />
      <section className="notes-panel" role="dialog" aria-label="Notificaciones">
        <div className="notes-head">
          <h2>Notificaciones</h2>
          <button type="button" className="notes-read" onClick={markAllRead}><Icon name="check" size={15} />Marcar leídas</button>
        </div>
        <div className="notes-list">
          {freshOrders.map(order => (
            <button className="notes-item" key={order.id} onClick={() => openOrder(order.id)}>
              <span className="notes-dot"><Icon name="incoming" size={16} /></span>
              <span className="notes-copy">
                <strong>{order.device}</strong>
                <em>{order.date}</em>
              </span>
              <span className="notes-side">{shortStatus[order.status] ?? order.status}</span>
            </button>
          ))}
          {!freshOrders.length && <div className="notes-empty">No hay avisos pendientes.</div>}
        </div>
      </section>
    </>}

    {menuOpen && <>
      <button className="drawer-backdrop phone-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
      <aside className="phone-drawer" role="dialog" aria-label="Menú">
        <div className="phone-drawer-head">
          <strong><Brand name={workshop.name} /></strong>
          <button className="icon-button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><Icon name="close" size={18} /></button>
        </div>
        {!installed && (
          <button className="install-row" onClick={askInstall}><Icon name="download" size={18} />Instalar acceso directo</button>
        )}
        <nav>
          {[['Pedidos', 'orders'], ['Proyectos', 'image'], ['Repuestos', 'parts'], ['Configuración', 'settings']].map(([label, icon]) => (
            <button key={label} className={page === label ? 'on' : ''} onClick={() => go(label)}>
              <Icon name={icon} size={18} />
              {label === 'Configuración' ? 'Ajustes' : label}
            </button>
          ))}
        </nav>
        <div className="phone-drawer-label">Repuestos</div>
        {partGroups.map(group => (
          <button key={group.id} className="phone-drawer-sub" onClick={() => go('Repuestos', group.id)}>{group.title}</button>
        ))}
        <div className="phone-drawer-label">Crear</div>
        <button onClick={() => openModal('order')}><Icon name="plus" size={18} />Nuevo pedido</button>
        <button onClick={() => openModal('project')}><Icon name="upload" size={18} />Nuevo proyecto</button>
      </aside>
    </>}

    <nav className="phone-nav phone-only" aria-label="Navegación">
      <button className={page === 'Pedidos' ? 'on' : ''} onClick={() => go('Pedidos')}>
        <Icon name="orders" size={20} /><span>Pedidos</span>
      </button>
      <button className={page === 'Proyectos' ? 'on' : ''} onClick={() => go('Proyectos')}>
        <Icon name="image" size={20} /><span>Proyectos</span>
      </button>
      <button className={page === 'Repuestos' ? 'on' : ''} onClick={() => go('Repuestos')}>
        <Icon name="parts" size={20} /><span>Repuestos</span>
      </button>
      <button className={page === 'Configuración' ? 'on' : ''} onClick={() => go('Configuración')}>
        <Icon name="settings" size={20} /><span>Ajustes</span>
      </button>
    </nav>

    {updateReady && (
      <div className="update-alert" role="status" translate="no">
        <span>Cambios nuevos</span>
        <button type="button" onClick={() => window.location.reload()}>actualizar</button>
      </div>
    )}

    {toast && <div className="toast" role="status"><Icon name="check" size={18} />{toast}</div>}

    {modal && (
      <div className="modal-backdrop" onClick={() => setModal(null)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label={modal === 'order' ? 'Nuevo pedido' : 'Subir proyecto'} onClick={event => event.stopPropagation()}>
          <div className="modal-heading">
            <div>
              <span className="modal-kicker">{modal === 'order' ? 'Ingreso' : 'Trabajo'}</span>
              <h2>{modal === 'order' ? 'Nuevo pedido' : 'Nuevo proyecto'}</h2>
            </div>
            <button className="icon-button" aria-label="Cerrar" onClick={() => setModal(null)}><Icon name="close" /></button>
          </div>
          <div className="modal-body">
          <p>{modal === 'order' ? 'Cliente, equipo y qué hay que revisar.' : 'Elegí la foto y los datos del trabajo.'}</p>
          <form onSubmit={event => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            if (modal === 'order') {
              const id = `NX-${Date.now().toString().slice(-6)}`
              saveOrders([{ id, name: String(data.get('name')), email: String(data.get('email')), phone: String(data.get('phone')), device: String(data.get('device')), problem: String(data.get('problem')), note: String(data.get('note')), date: 'Hoy, ' + new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), status: 'En diagnóstico' }, ...orders])
              setSelected(id)
              setPage('Pedidos')
              setFilter('Todos')
              setSearch('')
              setDetailOpen(true)
              notify('Pedido registrado correctamente')
            } else {
              if (!photo) { setUploadError('Seleccioná una foto para continuar.'); return }
              if (!saveProjects([{ id: Date.now(), title: String(data.get('title')), category: String(data.get('category')), image: photo, published: data.get('publish') === 'on' }, ...projects])) return
              notify('Proyecto guardado en tu galería local')
            }
            setModal(null)
          }}>
            <div className="modal-fields">
            {modal === 'order' ? <>
              <label className="field field-teal">Nombre completo<input name="name" required placeholder="Nombre y apellido" /></label>
              <div className="form-columns">
                <label className="field field-blue">Correo electrónico<input name="email" type="email" required placeholder="cliente@email.com" /></label>
                <label className="field field-green">Teléfono / WhatsApp<input name="phone" type="tel" required placeholder="+54 9 11..." /></label>
              </div>
              <label className="field field-amber">Equipo<input name="device" required placeholder="Marca y modelo del equipo" /></label>
              <label className="field field-coral">Problema<textarea name="problem" required rows={2} placeholder="Qué le pasa al equipo" /></label>
              <label className="field field-violet">Nota<textarea name="note" rows={2} placeholder="Algo más para tener en cuenta" /></label>
            </> : <>
              <label className="upload-zone">
                <Icon name="upload" size={28} />
                {photo ? <img src={photo} alt="Vista previa del proyecto" /> : <><strong>Elegí la foto</strong><span>JPG, PNG o WEBP · hasta 3 MB</span></>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  if (file.size > 3 * 1024 * 1024) { setUploadError('La imagen debe pesar menos de 3 MB.'); return }
                  const reader = new FileReader()
                  reader.onload = () => { setPhoto(String(reader.result)); setUploadError('') }
                  reader.readAsDataURL(file)
                }} />
              </label>
              <label className="field field-teal">Título<input name="title" required placeholder="Por ejemplo: Reparación de MacBook Pro" /></label>
              <label className="field field-amber">Categoría
                <select name="category"><option>Notebooks</option><option>Celulares</option><option>Computadoras</option><option>Tablets</option></select>
              </label>
              <label className="checkbox-label"><input name="publish" type="checkbox" defaultChecked />Publicar</label>
              {uploadError && <p className="error" role="alert">{uploadError}</p>}
            </>}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="primary-button"><Icon name={modal === 'order' ? 'plus' : 'upload'} size={16} />{modal === 'order' ? 'Crear pedido' : 'Guardar proyecto'}</button>
            </div>
          </form>
          </div>
        </section>
      </div>
    )}
  </div>
}
