import type { ApunteModulo, EstadoTarjetaRepaso } from '../types'
import { normalizarTexto, quitarMarcas } from './apunteFormato'

/** Tarjetas de repaso generadas POR REGLAS a partir del texto de un apunte
 *  (B5) -- sin IA, igual que el resto del formato de apuntes:
 *
 *  - Cada viñeta o punto numerado que empieza con `**Término:** definición`
 *    (o `**Término**: definición`) es una tarjeta: frente = término,
 *    reverso = definición.
 *  - Cada recuadro `> 🎯 …` o `> 💡 …` es una tarjeta de "idea clave":
 *    frente = el título de la sección en que está, reverso = el recuadro.
 *
 *  El id de cada tarjeta sale del apunte + tipo + frente (no de su posición),
 *  para que reordenar o editar el resto del apunte no borre el progreso. */

export interface TarjetaRepaso {
  id: string
  tipo: 'termino' | 'idea'
  frente: string
  reverso: string
  /** Sección (último título) donde aparece, para dar contexto. */
  seccion?: string
}

const RE_TERMINO = /^\t*(?:-\s*|\d{1,3}[.)]\s+)\*\*([^*\n]+?)\*\*\s*:?\s*(.+)$/
const RE_IDEA = /^>\s*(🎯|💡)️?\s*(.*)$/u

function hash(texto: string): string {
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function generarTarjetas(apunte: Pick<ApunteModulo, 'id' | 'contenido'>): TarjetaRepaso[] {
  const lineas = normalizarTexto(apunte.contenido).split('\n')
  const tarjetas: TarjetaRepaso[] = []
  const vistos = new Set<string>()
  let seccion: string | undefined

  const agregar = (t: Omit<TarjetaRepaso, 'id'>) => {
    if (!t.frente.trim() || !t.reverso.trim()) return
    let id = `${apunte.id}:${t.tipo}:${hash(t.frente.toLowerCase())}`
    // mismo término repetido en el apunte: se desambigua con el reverso
    if (vistos.has(id)) id = `${id}-${hash(t.reverso)}`
    if (vistos.has(id)) return
    vistos.add(id)
    tarjetas.push({ ...t, id })
  }

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]
    const t = linea.trim()
    const h = /^#{1,3}\s+(.+)$/.exec(t)
    if (h) {
      seccion = quitarMarcas(h[1]).trim()
      continue
    }
    const idea = RE_IDEA.exec(t)
    if (idea) {
      // el recuadro sigue en las líneas siguientes que empiezan con ">"
      const partes = [idea[2]]
      while (i + 1 < lineas.length && lineas[i + 1].trim().startsWith('>')) {
        i++
        partes.push(lineas[i].trim().replace(/^>\s?/, ''))
      }
      const reverso = quitarMarcas(partes.join('\n')).trim()
      agregar({
        tipo: 'idea',
        frente: seccion ? `Idea clave: ${seccion}` : 'Idea clave',
        reverso,
        seccion,
      })
      continue
    }
    const termino = RE_TERMINO.exec(linea)
    if (termino) {
      const frente = quitarMarcas(termino[1]).replace(/:\s*$/, '').trim()
      // la definición puede seguir en líneas con sangría que no son otro punto
      const tabs = /^\t*/.exec(linea)?.[0].length ?? 0
      const partes = [termino[2]]
      while (
        i + 1 < lineas.length &&
        lineas[i + 1].trim() &&
        (/^\t*/.exec(lineas[i + 1])?.[0].length ?? 0) > tabs &&
        !/^\t*(?:-|\d{1,3}[.)]\s)/.test(lineas[i + 1])
      ) {
        i++
        partes.push(lineas[i].trim())
      }
      const reverso = quitarMarcas(partes.join('\n')).replace(/^:\s*/, '').trim()
      agregar({ tipo: 'termino', frente, reverso, seccion })
    }
  }
  return tarjetas
}

// ---------------------------------------------------------------------------
// Programación (Leitner de 5 cajas, igual que el repaso de Colecciones)
// ---------------------------------------------------------------------------

const DIAS_POR_CAJA: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }
const DIA_MS = 24 * 60 * 60 * 1000

export function siguienteEstado(previo: EstadoTarjetaRepaso | undefined, resultado: 'sabia' | 'no_sabia', ahora = Date.now()): EstadoTarjetaRepaso {
  const caja = resultado === 'sabia' ? Math.min(5, (previo?.caja ?? 0) + 1) : 1
  return {
    caja,
    // "no la sabía" vuelve mañana (y además antes, dentro de la misma sesión)
    proximo: ahora + (DIAS_POR_CAJA[caja] ?? 1) * DIA_MS,
    aciertos: (previo?.aciertos ?? 0) + (resultado === 'sabia' ? 1 : 0),
    fallos: (previo?.fallos ?? 0) + (resultado === 'no_sabia' ? 1 : 0),
    ultimo: ahora,
  }
}

export function estaPendiente(estado: EstadoTarjetaRepaso | undefined, ahora = Date.now()): boolean {
  return !estado || estado.proximo <= ahora
}

/** Orden de una sesión: primero las pendientes, y entre ellas las que más
 *  se han fallado; después (si se pide repasar todo) el resto. */
export function ordenarParaSesion(
  tarjetas: TarjetaRepaso[],
  estados: Record<string, EstadoTarjetaRepaso>,
  soloPendientes: boolean,
  ahora = Date.now()
): TarjetaRepaso[] {
  const pendientes = tarjetas.filter((t) => estaPendiente(estados[t.id], ahora))
  const base = soloPendientes && pendientes.length > 0 ? pendientes : tarjetas
  return [...base].sort((a, b) => {
    const ea = estados[a.id]
    const eb = estados[b.id]
    const pa = estaPendiente(ea, ahora) ? 0 : 1
    const pb = estaPendiente(eb, ahora) ? 0 : 1
    if (pa !== pb) return pa - pb
    return (eb?.fallos ?? 0) - (ea?.fallos ?? 0) || (ea?.caja ?? 0) - (eb?.caja ?? 0)
  })
}

/** Posición a la que vuelve una tarjeta fallada dentro de la sesión: unas
 *  pocas tarjetas más adelante (no al final), para reforzarla pronto. */
export const REINSERTAR_FALLADA_EN = 3
