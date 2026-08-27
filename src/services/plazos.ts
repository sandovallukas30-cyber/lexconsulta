// Calculadora de plazos legales, basada en las reglas generales del Código
// Civil (Art. 48, 49 y 50) — la fuente aplicable por defecto a "cualesquiera
// plazos o términos prescritos en las leyes" (Art. 48 inc. 4), salvo que la
// ley específica del trámite diga otra cosa. Por eso el resultado siempre
// muestra qué regla aplicó y un aviso de que un trámite judicial concreto
// puede tener su propia norma (ej. Art. 66 CPC).
//
// Reglas que implementamos, tal como las dice el propio Código:
// - Art. 48 inc. 2-3: un plazo de MESES o AÑOS termina el mismo número de día
//   en el mes de destino; si ese mes no tiene ese día (ej. 31 de enero + 1 mes
//   -> febrero no tiene 31), termina el ÚLTIMO día de ese mes.
// - Art. 50: un plazo se cuenta por días CORRIDOS (incluye feriados) salvo
//   que se exprese "de días hábiles/útiles", caso en que los feriados no se
//   cuentan. El propio día de inicio no se cuenta (se empieza a contar desde
//   el día siguiente) -- convención general de cómputo de plazos, no
//   textual de este artículo puntual, así que se explicita en el resultado.
//
// Lo que NO cubre (y se avisa en la UI): algunos feriados (San Pedro y San
// Pablo, Encuentro de Dos Mundos) pueden trasladarse a un lunes cercano por
// ley cuando no caen lunes, y pueden decretarse feriados puntuales para un
// año específico (plebiscitos, censos, etc.) -- ninguno de los dos es
// predecible de antemano sin una fuente oficial año a año.

export type UnidadPlazo = 'dias' | 'meses' | 'anios'
export type TipoConteo = 'corridos' | 'habiles'

export interface FeriadoInfo {
  fecha: Date
  motivo: 'domingo' | 'sabado' | 'feriado'
  nombreFeriado?: string
}

export interface ResultadoPlazo {
  fechaFin: Date
  /** Solo poblado cuando unidad='dias' y tipo='habiles': cada día no hábil
   *  que se saltó al contar, con el motivo -- para mostrar el detalle. */
  diasSaltados: FeriadoInfo[]
}

const FERIADOS_FIJOS: { mes: number; dia: number; nombre: string; trasladable?: boolean }[] = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día Nacional del Trabajo' },
  { mes: 5, dia: 21, nombre: 'Glorias Navales' },
  { mes: 6, dia: 29, nombre: 'San Pedro y San Pablo', trasladable: true },
  { mes: 7, dia: 16, nombre: 'Virgen del Carmen' },
  { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
  { mes: 9, dia: 18, nombre: 'Independencia Nacional' },
  { mes: 9, dia: 19, nombre: 'Glorias del Ejército' },
  { mes: 10, dia: 12, nombre: 'Encuentro de Dos Mundos', trasladable: true },
  { mes: 10, dia: 31, nombre: 'Iglesias Evangélicas y Protestantes' },
  { mes: 11, dia: 1, nombre: 'Todos los Santos' },
  { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
  { mes: 12, dia: 25, nombre: 'Navidad' },
]

/** Domingo de Resurrección (algoritmo de Gauss/Meeus, calendario gregoriano):
 *  determinístico y exacto para cualquier año, a diferencia de los feriados
 *  "trasladables" de la lista fija de arriba. */
function domingoDePascua(anio: number): Date {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function sumarDias(fecha: Date, n: number): Date {
  const r = new Date(fecha)
  r.setDate(r.getDate() + n)
  return r
}

/** Nombre del feriado fijo/móvil que cae en `fecha`, si corresponde. */
export function nombreFeriado(fecha: Date): string | null {
  const pascua = domingoDePascua(fecha.getFullYear())
  if (mismoDia(fecha, sumarDias(pascua, -2))) return 'Viernes Santo'
  if (mismoDia(fecha, sumarDias(pascua, -1))) return 'Sábado Santo'
  const fijo = FERIADOS_FIJOS.find((f) => f.mes === fecha.getMonth() + 1 && f.dia === fecha.getDate())
  return fijo ? fijo.nombre : null
}

/** Clasifica un día: por qué no sería hábil (domingo, sábado si se pide
 *  excluirlo, o feriado), o null si es hábil. */
function motivoNoHabil(fecha: Date, excluirSabados: boolean): FeriadoInfo | null {
  const diaSemana = fecha.getDay() // 0 = domingo, 6 = sábado
  if (diaSemana === 0) return { fecha, motivo: 'domingo' }
  if (excluirSabados && diaSemana === 6) return { fecha, motivo: 'sabado' }
  const feriado = nombreFeriado(fecha)
  if (feriado) return { fecha, motivo: 'feriado', nombreFeriado: feriado }
  return null
}

/** Suma N meses (o años, con n*12) respetando la regla del Art. 48 inc. 2-3:
 *  mismo número de día en el mes de destino, o el último día de ese mes si
 *  no llega a tener ese número (31 de enero + 1 mes -> 28/29 de febrero). */
function sumarMeses(fecha: Date, n: number): Date {
  const diaOriginal = fecha.getDate()
  const resultado = new Date(fecha.getFullYear(), fecha.getMonth() + n, 1)
  const ultimoDiaDestino = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate()
  resultado.setDate(Math.min(diaOriginal, ultimoDiaDestino))
  return resultado
}

export function calcularPlazo(params: {
  fechaInicio: Date
  cantidad: number
  unidad: UnidadPlazo
  tipo: TipoConteo
  excluirSabados: boolean
}): ResultadoPlazo {
  const { fechaInicio, cantidad, unidad, tipo, excluirSabados } = params

  if (unidad === 'meses') return { fechaFin: sumarMeses(fechaInicio, cantidad), diasSaltados: [] }
  if (unidad === 'anios') return { fechaFin: sumarMeses(fechaInicio, cantidad * 12), diasSaltados: [] }

  // unidad === 'dias'. El día de inicio no se cuenta (el plazo corre desde
  // el día siguiente) -- convención general de cómputo de plazos.
  if (tipo === 'corridos') {
    return { fechaFin: sumarDias(fechaInicio, cantidad), diasSaltados: [] }
  }

  // Días hábiles/útiles (Art. 50): se cuentan solo los días hábiles hasta
  // completar `cantidad`; los que se saltan quedan registrados para mostrar
  // el detalle.
  const diasSaltados: FeriadoInfo[] = []
  let cursor = fechaInicio
  let contados = 0
  // Tope de seguridad generoso (10 años calendario) para no colgar el hilo
  // si algún día llegara cantidad absurda por error de input.
  const limite = sumarDias(fechaInicio, 3660)
  while (contados < cantidad) {
    cursor = sumarDias(cursor, 1)
    const motivo = motivoNoHabil(cursor, excluirSabados)
    if (motivo) {
      diasSaltados.push(motivo)
      continue
    }
    contados++
    if (cursor > limite) break
  }
  return { fechaFin: cursor, diasSaltados }
}
