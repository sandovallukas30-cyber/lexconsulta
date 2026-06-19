import type { RespuestaIA } from './anthropic'

const CACHE_KEY = 'prima-lex-query-cache'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 horas
const MAX_ENTRIES = 50

interface CacheEntry {
  respuesta: RespuestaIA
  timestamp: number
  query: string
}

interface CacheStore {
  entries: Record<string, CacheEntry>
}

function hashQuery(query: string, codigos?: string[]): string {
  const codigosStr = codigos ? codigos.slice().sort().join(',') : ''
  const normalizada = query.trim().toLowerCase().replace(/\s+/g, ' ') + '|' + codigosStr
  let hash = 0
  for (let i = 0; i < normalizada.length; i++) {
    const char = normalizada.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // 32-bit int
  }
  return Math.abs(hash).toString(36)
}

function cargarStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { entries: {} }
    return JSON.parse(raw) as CacheStore
  } catch {
    return { entries: {} }
  }
}

function guardarStore(store: CacheStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store))
  } catch {
    // localStorage lleno — limpiar y reintentar
    localStorage.removeItem(CACHE_KEY)
  }
}

function evictarExpirados(store: CacheStore): CacheStore {
  const ahora = Date.now()
  const entries = Object.fromEntries(
    Object.entries(store.entries).filter(([, v]) => ahora - v.timestamp < TTL_MS)
  )
  return { entries }
}

function evictarMasAntiguo(store: CacheStore): CacheStore {
  const sorted = Object.entries(store.entries).sort(([, a], [, b]) => a.timestamp - b.timestamp)
  const entries = Object.fromEntries(sorted.slice(1))
  return { entries }
}

export function getCached(query: string, codigos?: string[]): RespuestaIA | null {
  const store = evictarExpirados(cargarStore())
  const hash = hashQuery(query, codigos)
  const entry = store.entries[hash]
  if (!entry) return null
  return entry.respuesta
}

export function setCached(query: string, respuesta: RespuestaIA, codigos?: string[]): void {
  let store = evictarExpirados(cargarStore())

  if (Object.keys(store.entries).length >= MAX_ENTRIES) {
    store = evictarMasAntiguo(store)
  }

  const hash = hashQuery(query, codigos)
  store.entries[hash] = { respuesta, timestamp: Date.now(), query }
  guardarStore(store)
}

export function limpiarCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
