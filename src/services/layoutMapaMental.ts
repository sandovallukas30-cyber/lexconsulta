/** Posiciones automáticas de un mapa mental (árbol prolijo y radial) y lado por el que sale cada conexión. Lógica pura: la
 *  usan el botón «Organizar», las plantillas y los mapas armados desde un apunte. */

/**
 * Mismo algoritmo de layout por capas (barycenter, sin IA) que
 * calcularLayoutPorCapas en ColeccionesView.tsx — cada nodo va a la fila que
 * corresponde a la ruta más larga de conexiones que llega hasta él, y dentro
 * de cada fila se ordena por el promedio de X de sus padres, para que un
 * hijo quede alineado bajo lo que lo conecta en vez de disperso en orden de
 * creación. Trabaja sobre ids + conexiones (no sobre NodoFlow completo) para
 * poder reutilizarla también al posicionar una plantilla recién creada, que
 * todavía no tiene nodos "de verdad" en el lienzo.
 */
/** Hash determinístico simple (no criptográfico) para derivar un "jitter"
 * estable a partir del id del nodo: mismo id, mismo desplazamiento siempre
 * — así "Organizar" da resultados reproducibles (no salta cada vez que se
 * lo aprieta) pero igual rompe la grilla perfecta de fila/columna. */
function semillaDesdeId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

/**
 * Árbol prolijo ("tidy tree", el mismo principio que usan d3-hierarchy o
 * Reingold-Tilford) — de IZQUIERDA A DERECHA: la raíz (el título) queda
 * pegada al margen izquierdo, centrada verticalmente respecto de todo lo
 * que cuelga de ella, y cada nivel de profundidad avanza hacia la derecha.
 * Antes este mismo árbol crecía de arriba hacia abajo (título arriba, todo
 * lo demás debajo); se invirtieron los ejes a pedido — el título queda a la
 * izquierda al medio, y el desarrollo del tema se lee de izquierda a
 * derecha, como un apunte de mano en vez de un organigrama vertical.
 *
 * Acá cada nodo se posiciona por recorrido: una HOJA (sin hijos) se lleva
 * la siguiente FILA disponible, de arriba hacia abajo, en el orden en que
 * el recorrido la encuentra; un nodo CON hijos se centra en el promedio de
 * sus hijos, una vez que esos ya tienen posición (post-order). Consecuencia
 * clave: la rama de un subárbol jamás pisa el tramo de filas de otra, sea
 * cual sea su profundidad — cada una ocupa exactamente el alto que
 * necesitan sus propias hojas, ni más ni menos.
 *
 * Se intentó (y se sacó) una variante que compactaba en grilla las ramas
 * con muchas hojas, para que no quedaran todas apiladas en una sola
 * columna. La idea era sólida pero la implementación no: medido contra el
 * DOM real, dejaba nodos superpuestos en casos reales (una rama con
 * sub-categorías propias antes de llegar a las hojas — ver "I.
 * Gubernativas" en la plantilla de Atribuciones del Presidente — porque
 * los nodos INTERMEDIOS de esa rama no tenían ningún alto mínimo
 * reservado entre hermanos, solo el promedio de sus propios hijos). Hacer
 * eso bien de verdad es básicamente reimplementar el ajuste de contornos
 * de Reingold-Tilford, no algo para apurar — se volvió a la versión
 * simple, ya probada sin superposiciones.
 */
export function calcularLayoutMapaMental(
  ids: string[],
  conexiones: { desde: string; hasta: string }[]
): Map<string, { x: number; y: number }> {
  // Roles de eje invertidos respecto de la versión anterior (arriba→abajo):
  // ESPACIO_X ahora separa NIVELES de profundidad (columnas, izquierda→
  // derecha) y necesita ser ancho porque tiene que dejar lugar al ANCHO de
  // un nodo (hasta 200px, el título); ESPACIO_Y ahora separa HOJAS
  // consecutivas (filas) y puede ser más angosto porque solo tiene que
  // dejar lugar al alto típico de un nodo de texto envuelto en 2-3 líneas.
  // Valores más chicos que antes (280/160) a pedido — más compacto — apoyado
  // en que el padding del nodo también se achicó (px-4 py-3 → px-3 py-2 en
  // CuerpoNodo) y el ancho no-título bajó de 170 a 155. Con eso, una etiqueta
  // larga real (medida: hasta 106 caracteres en las plantillas actuales) se
  // envuelve en 5-6 líneas y queda en ~100-115px de alto — ESPACIO_Y deja
  // margen sobre ese peor caso incluso restando el jitter.
  const ESPACIO_X = 240
  const ESPACIO_Y = 140
  const MARGEN = 30
  // Desplazamiento chico (mucho menor que ESPACIO_X/Y, no puede generar
  // superposición) para que el resultado se sienta más parecido a un mapa
  // mental hecho a mano y menos a un organigrama perfectamente cuadriculado.
  // JITTER_Y más chico que JITTER_X a propósito: una hoja de texto largo
  // (5-6 líneas envueltas dentro de un nodo de 155px) puede llegar a unos
  // 100-115px de alto, y las filas de hoja están más apretadas verticalmente
  // que las columnas de profundidad — un jitter grande ahí sí podía juntar
  // dos fichas vecinas de texto largo.
  const JITTER_X = 12
  const JITTER_Y = 6

  // Padre PRIMARIO de cada nodo: el primero que lo conectó (en el orden en
  // que se declaran las conexiones). Un nodo con más de un padre — dos
  // ramas que convergen en una misma conclusión, como en la plantilla del
  // checklist — solo cuenta como "hijo" del primero para ARMAR el árbol;
  // la segunda conexión igual se dibuja normal, simplemente no participa
  // del cálculo de posiciones (si contara dos veces, ese nodo se
  // reservaría dos filas de hoja en vez de una, y quedaría descentrado).
  const padrePrimario = new Map<string, string>()
  const idsValidos = new Set(ids)
  for (const cx of conexiones) {
    if (!idsValidos.has(cx.desde) || !idsValidos.has(cx.hasta)) continue
    if (!padrePrimario.has(cx.hasta)) padrePrimario.set(cx.hasta, cx.desde)
  }
  const hijosDe = new Map<string, string[]>()
  for (const [hijo, padre] of padrePrimario) {
    if (!hijosDe.has(padre)) hijosDe.set(padre, [])
    hijosDe.get(padre)!.push(hijo)
  }

  const resultado = new Map<string, { x: number; y: number }>()
  let siguienteFila = 0

  function jitterXY(id: string): { jitterX: number; jitterY: number } {
    const semilla = semillaDesdeId(id)
    return {
      jitterX: ((semilla % 1000) / 1000 - 0.5) * 2 * JITTER_X,
      jitterY: (((semilla >>> 3) % 1000) / 1000 - 0.5) * 2 * JITTER_Y,
    }
  }

  function visitar(id: string, profundidad: number, enCurso: Set<string>): number {
    // Corta un ciclo (A conecta a B que conecta de vuelta a A) en vez de
    // recursión infinita — no debería darse en un mapa mental normal, pero
    // más vale no colgar la pestaña si pasa.
    if (enCurso.has(id)) return resultado.get(id)?.y ?? 0
    enCurso.add(id)
    const hijos = hijosDe.get(id) ?? []
    let y: number
    if (hijos.length === 0) {
      y = MARGEN + siguienteFila * ESPACIO_Y
      siguienteFila++
    } else {
      const ysHijos = hijos.map((h) => visitar(h, profundidad + 1, enCurso))
      y = ysHijos.reduce((suma, v) => suma + v, 0) / ysHijos.length
    }
    const { jitterX, jitterY } = jitterXY(id)
    // y SIN jitter es lo que se guarda para que lo use el promedio del
    // padre — si el jitter de un hijo se filtrara hacia arriba, se iría
    // acumulando de generación en generación en vez de quedar como un
    // desvío chico y local de cada nodo.
    resultado.set(id, { x: profundidad * ESPACIO_X + MARGEN + jitterX, y: y + jitterY })
    return y
  }

  const raices = ids.filter((id) => !padrePrimario.has(id))
  for (const raiz of raices) visitar(raiz, 0, new Set())

  // Nodos que ninguna raíz alcanzó (no debería pasar en un mapa normal,
  // pero por las dudas: van en una columna aparte a la izquierda del todo,
  // para que nunca falte una posición y el nodo termine invisible en el
  // origen del lienzo.
  const faltantes = ids.filter((id) => !resultado.has(id))
  faltantes.forEach((id, i) => {
    resultado.set(id, { x: -ESPACIO_X, y: MARGEN + (siguienteFila + i) * ESPACIO_Y })
  })

  return resultado
}

/**
 * Variante RADIAL del mismo árbol prolijo de arriba: en vez de crecer hacia
 * la derecha, reparte las ramas alrededor del título, como un mapa mental
 * dibujado a mano — pensada para un árbol ancho y poco profundo (pocas
 * ramas principales, cada una con sus propias hojas), no para uno angosto y
 * profundo, donde ir agregando anillos concéntricos deja de tener sentido
 * visual. Usa un mecanismo de plantilla (MapaMentalPlantilla.layoutInicial),
 * no un botón: no es un reemplazo general de "Organizar" (que sigue siendo
 * el árbol de siempre), solo la forma en que ALGUNAS plantillas (con esa
 * forma ancha y pareja) se auto-organizan la primera vez que se usan.
 *
 * Reutiliza la MISMA combinatoria que la versión en árbol — cada hoja se
 * lleva la siguiente fracción disponible del círculo completo (en vez de
 * la siguiente fila), y un nodo con hijos queda en el ÁNGULO promedio de
 * sus hijos (en vez de la Y promedio) — así hereda la misma garantía de
 * que el subárbol de una rama nunca pisa el sector angular de otra. Lo
 * nuevo acá es solo: (a) la transformación final de coordenadas (ángulo,
 * radio) → (x, y), y (b) el cálculo del radio de cada anillo de
 * profundidad, hecho ANTES de asignar ángulos — el anillo con más nodos es
 * el que manda, porque su circunferencia (2πr) tiene que alcanzar para
 * darle a cada uno un arco mínimo sin pisar al vecino.
 */
export function calcularLayoutRadial(
  ids: string[],
  conexiones: { desde: string; hasta: string }[]
): Map<string, { x: number; y: number }> {
  const padrePrimario = new Map<string, string>()
  const idsValidos = new Set(ids)
  for (const cx of conexiones) {
    if (!idsValidos.has(cx.desde) || !idsValidos.has(cx.hasta)) continue
    if (!padrePrimario.has(cx.hasta)) padrePrimario.set(cx.hasta, cx.desde)
  }
  const hijosDe = new Map<string, string[]>()
  for (const [hijo, padre] of padrePrimario) {
    if (!hijosDe.has(padre)) hijosDe.set(padre, [])
    hijosDe.get(padre)!.push(hijo)
  }
  const raices = ids.filter((id) => !padrePrimario.has(id))

  // Profundidad de cada nodo y cantidad de nodos por profundidad (BFS
  // simple con pila — el orden de recorrido no importa acá, solo contar).
  const profundidadDe = new Map<string, number>()
  const porProfundidad = new Map<number, number>()
  {
    const pendientes: { id: string; profundidad: number }[] = raices.map((id) => ({ id, profundidad: 0 }))
    const visitados = new Set<string>()
    while (pendientes.length > 0) {
      const { id, profundidad } = pendientes.pop()!
      if (visitados.has(id)) continue
      visitados.add(id)
      profundidadDe.set(id, profundidad)
      porProfundidad.set(profundidad, (porProfundidad.get(profundidad) ?? 0) + 1)
      for (const hijo of hijosDe.get(id) ?? []) pendientes.push({ id: hijo, profundidad: profundidad + 1 })
    }
  }
  const profundidadMax = Math.max(0, ...porProfundidad.keys())

  // Arco mínimo (px sobre la circunferencia) que necesita cada nodo para no
  // pisar al de al lado — 210 cubre el peor caso real (nodo de 155-200px de
  // ancho más un margen chico). Cada anillo es progresivamente más grande
  // que el anterior (nunca menor, aunque tenga menos nodos): así el radio
  // de un anillo con pocos nodos no queda apretado contra uno más interno.
  const ARCO_MINIMO = 210
  const RADIO_MINIMO = 260
  const GAP_MINIMO_ENTRE_ANILLOS = 200
  const radioDeProfundidadMapa = new Map<number, number>([[0, 0]])
  for (let d = 1; d <= profundidadMax; d++) {
    const cantidad = porProfundidad.get(d) ?? 1
    const requerido = Math.max(RADIO_MINIMO, (ARCO_MINIMO * cantidad) / (2 * Math.PI))
    const anterior = radioDeProfundidadMapa.get(d - 1) ?? 0
    radioDeProfundidadMapa.set(d, Math.max(requerido, anterior + GAP_MINIMO_ENTRE_ANILLOS))
  }

  // Total de hojas: reparte el círculo completo (2π) entre ellas, igual que
  // el árbol reparte el alto total entre filas.
  function contarHojas(id: string, enCurso: Set<string>): number {
    if (enCurso.has(id)) return 0
    enCurso.add(id)
    const hijos = hijosDe.get(id) ?? []
    if (hijos.length === 0) return 1
    return hijos.reduce((suma, h) => suma + contarHojas(h, enCurso), 0)
  }
  const totalHojas = raices.reduce((suma, r) => suma + contarHojas(r, new Set()), 0) || 1

  const resultado = new Map<string, { x: number; y: number }>()
  let siguienteFraccion = 0

  function visitar(id: string, enCurso: Set<string>): number {
    if (enCurso.has(id)) return 0
    enCurso.add(id)
    const hijos = hijosDe.get(id) ?? []
    let angulo: number
    if (hijos.length === 0) {
      angulo = (siguienteFraccion / totalHojas) * Math.PI * 2
      siguienteFraccion++
    } else {
      const angulos = hijos.map((h) => visitar(h, enCurso))
      angulo = angulos.reduce((suma, a) => suma + a, 0) / angulos.length
    }
    const radio = radioDeProfundidadMapa.get(profundidadDe.get(id) ?? 0) ?? 0
    resultado.set(id, { x: radio * Math.cos(angulo), y: radio * Math.sin(angulo) })
    return angulo
  }

  for (const raiz of raices) visitar(raiz, new Set())

  const faltantes = ids.filter((id) => !resultado.has(id))
  faltantes.forEach((id, i) => {
    resultado.set(id, { x: -(radioDeProfundidadMapa.get(profundidadMax) ?? RADIO_MINIMO), y: i * 140 })
  })

  return resultado
}

/** De qué lado sale/entra una conexión, según dónde queda el otro nodo DE
 * VERDAD — sin esto, tanto "usar plantilla" como "Organizar automático"
 * dejaban todo enganchado por default (sale abajo, entra arriba), sea cual
 * sea la posición real. Con el layout por capas la mayoría de los vecinos
 * quedan al costado (misma fila) más que abajo, así que ese default
 * producía justo la curva "torcida"/con loops que se ve en capturas reales
 * — el fix de handles por lado (HANDLES_POR_LADO) nunca llegaba a
 * aprovecharse en nada creado por plantilla o por el organizador, solo en
 * una conexión que el usuario arrastra a mano. Heurística simple: se
 * compara qué tan lejos están en X contra en Y, y se sale/entra por el eje
 * que predomina. */
export function elegirLadosConexion(
  origen: { x: number; y: number },
  destino: { x: number; y: number }
): { desdeHandle: string; hastaHandle: string } {
  const dx = destino.x - origen.x
  const dy = destino.y - origen.y
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { desdeHandle: 'right', hastaHandle: 'left' } : { desdeHandle: 'left', hastaHandle: 'right' }
  }
  return dy >= 0 ? { desdeHandle: 'bottom', hastaHandle: 'top' } : { desdeHandle: 'top', hastaHandle: 'bottom' }
}
