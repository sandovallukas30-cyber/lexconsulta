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

export type UnidadPlazo = 'horas' | 'dias' | 'meses' | 'anios'
export type TipoConteo = 'corridos' | 'habiles'

// ------------------------------------------------------------------
// Regímenes de cómputo por norma (informe "Plazos en la legislación
// chilena indexada en Prima Lex"): "hábil" no significa lo mismo en todos
// los cuerpos legales, y un motor de cómputo no puede usar una sola tabla
// de feriados para todos ellos. Ver REGIMENES_INFO para el detalle de cada
// uno y qué cuerpos legales lo usan.
// ------------------------------------------------------------------
export type RegimenComputo = 'civil' | 'judicial' | 'penal' | 'administrativo' | 'util'

export const REGIMENES_INFO: Record<RegimenComputo, { nombre: string; regla: string; cuerpos: string }> = {
  civil: {
    nombre: 'Civil (corridos)',
    regla: 'Cuenta todos los días, incluidos feriados, salvo que la norma diga expresamente "días útiles".',
    cuerpos: 'Código Civil (Art. 50) y, por defecto, los plazos sustantivos que no fijan una regla propia.',
  },
  judicial: {
    nombre: 'Judicial (hábil)',
    regla: 'Días hábiles excluyendo domingo y festivos — la definición histórica, que no excluye el sábado.',
    cuerpos: 'Código de Procedimiento Civil, Código Orgánico de Tribunales, procedimientos judiciales en general.',
  },
  penal: {
    nombre: 'Penal (sin inhábiles)',
    regla: 'No existen días inhábiles: se cuenta todo, pero si el plazo vence justo en un feriado, el vencimiento se corre al día siguiente que no sea feriado.',
    cuerpos: 'Código Procesal Penal (Art. 14) y la Ley de Responsabilidad Penal Adolescente.',
  },
  administrativo: {
    nombre: 'Administrativo (hábil)',
    regla: 'Días hábiles excluyendo sábado, domingo y festivos.',
    cuerpos: 'Ley 19.880, Código Tributario (Art. 10), Código Sanitario y, en general, actuaciones ante órganos de la Administración.',
  },
  util: {
    nombre: 'Útil',
    regla: 'Un cuarto vocabulario, textualmente distinto de "hábil", aunque hoy funcionalmente equivalente a él.',
    cuerpos: 'Art. 459 del Código de Procedimiento Civil (oposición en el juicio ejecutivo).',
  },
}

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

function sumarHoras(fecha: Date, n: number): Date {
  const r = new Date(fecha)
  r.setHours(r.getHours() + n)
  return r
}

export function calcularPlazo(params: {
  fechaInicio: Date
  cantidad: number
  unidad: UnidadPlazo
  tipo: TipoConteo
  excluirSabados: boolean
}): ResultadoPlazo {
  const { fechaInicio, cantidad, unidad, tipo, excluirSabados } = params

  // Los plazos de horas corren de forma continua, sin pausar de noche ni en
  // inhábiles (Art. 15 CPP) -- no hay "hábil/corrido" que aplicar aquí.
  if (unidad === 'horas') return { fechaFin: sumarHoras(fechaInicio, cantidad), diasSaltados: [] }
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

/** Solo un día FERIADO detiene el cómputo penal (Art. 14 CPP: "no se
 *  suspenderán los plazos por la interposición de días feriados" no exime
 *  el domingo de contarse, solo el feriado propiamente tal) -- por eso NO
 *  reutiliza motivoNoHabil (que trata domingo como inhábil en todos los
 *  demás regímenes). */
function esFeriado(fecha: Date): boolean {
  return nombreFeriado(fecha) !== null
}

/** Calcula un plazo a partir del régimen de cómputo de una norma concreta
 *  (ver RegimenComputo / REGIMENES_INFO), no de un tipo de conteo genérico
 *  "hábil/corrido" que el usuario tenga que adivinar. Cubre los cinco
 *  regímenes catalogados en el informe de plazos: civil, judicial, penal,
 *  administrativo y útil. */
export function calcularPlazoPorRegimen(params: {
  fechaInicio: Date
  cantidad: number
  unidad: UnidadPlazo
  regimen: RegimenComputo
}): ResultadoPlazo {
  const { fechaInicio, cantidad, unidad, regimen } = params

  if (unidad === 'horas') return { fechaFin: sumarHoras(fechaInicio, cantidad), diasSaltados: [] }

  if (regimen === 'judicial' || regimen === 'util') {
    return calcularPlazo({ fechaInicio, cantidad, unidad, tipo: unidad === 'dias' ? 'habiles' : 'corridos', excluirSabados: false })
  }
  if (regimen === 'administrativo') {
    const base = calcularPlazo({ fechaInicio, cantidad, unidad, tipo: unidad === 'dias' ? 'habiles' : 'corridos', excluirSabados: true })
    // Días hábiles ya cae en día hábil por construcción; solo los plazos de
    // mes/año necesitan la prórroga expresa del Art. 25 Ley 19.880 / Art. 10
    // CT si el vencimiento cae en inhábil.
    if (unidad === 'dias') return base
    let fechaFin = base.fechaFin
    while (motivoNoHabil(fechaFin, true)) fechaFin = sumarDias(fechaFin, 1)
    return { fechaFin, diasSaltados: [] }
  }
  if (regimen === 'penal') {
    // No hay días inhábiles (Art. 14 CPP): se cuentan TODOS los días como
    // corridos, y solo al final, si el vencimiento cae en un feriado (no en
    // domingo, que sí se cuenta y sí puede ser el día de vencimiento), se
    // corre al día siguiente que no sea feriado.
    const base = calcularPlazo({ fechaInicio, cantidad, unidad, tipo: 'corridos', excluirSabados: false })
    let fechaFin = base.fechaFin
    while (esFeriado(fechaFin)) fechaFin = sumarDias(fechaFin, 1)
    return { fechaFin, diasSaltados: [] }
  }
  // regimen === 'civil': la regla por defecto del Código Civil, sin prórroga
  // de vencimiento (el Art. 48 no la contempla para plazos de días).
  return calcularPlazo({ fechaInicio, cantidad, unidad, tipo: 'corridos', excluirSabados: false })
}
