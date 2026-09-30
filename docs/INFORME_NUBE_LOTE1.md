# Informe — Lote 1 en la nube (Prima Lex)

**Fecha:** 30-09-2026 · **Rama:** `claude/hopeful-clarke-sg3odq`. El entorno fijó esta rama en lugar de `nube/lote-1`; partió igual a `main`. · **PR:** borrador hacia `main`, sin merge.

Cada commit pasó `npx tsc -b` y `npm run build`. Con el lint pasó algo que hay que saber:

- La línea base de `main` ya tenía problemas de lint.
- Hasta C5, la comparación de lint "sin errores nuevos" usaba el formateador `unix` de ESLint. Ese formateador ya no existe en ESLint 9, así que la comparación salía vacía y no medía nada.
- Desde C7 se compara con `-f json` contra `main` (archivo, regla y mensaje) todos los archivos tocados por la rama, incluidos los de C4 y C5. Resultado: **0 problemas nuevos**. La última medición, tras el pase de accesibilidad, da 142 problemas antes y 139 después.

No se tocaron `.env`, la configuración de Vercel ni secretos. No se agregó backend, APIs de pago ni IA a los Apuntes: repaso, formato, búsqueda y exportación son por reglas.

---

## 1. Resumen: qué se hizo y qué no

| Ítem | Estado | Dónde está el detalle |
|---|---|---|
| **A** — 30 leyes desde la BCN + pipeline + control de calidad | ✅ Hecho (una ley de la lista reemplazada por su reserva, ver §2) | `docs/mejoras/A-leyes.md` |
| **B0** — Auditoría del área académica | ✅ 16 problemas | `docs/AUDITORIA_ACADEMICA.md` |
| **B1** — Respaldo (exportar/importar, combinar/reemplazar) | ✅ | `docs/mejoras/B1-respaldo.md` |
| **B2** — Buscador de apuntes (Omnibar) | ✅ | `docs/mejoras/B2-buscador-apuntes.md` |
| **B3** — Próximas evaluaciones | ✅ | `docs/mejoras/B3-proximas-evaluaciones.md` |
| **B4** — Duplicar / mover / exportar .md reversible | ✅ | `docs/mejoras/B4-acciones-apunte.md` |
| **B5** — Repaso por reglas (Leitner) | ✅ | `docs/mejoras/B5-repaso.md` |
| **B6** — Refactor de ModuloDetalle + memo + escritura agrupada | ✅ | `docs/mejoras/B6-rendimiento.md` |
| **C0** — Auditoría UI/UX | ✅ 22 problemas | `docs/AUDITORIA_UIUX.md` |
| **C1** — Progreso de lectura y posición | ✅ | `docs/mejoras/C1-progreso-lectura.md` |
| **C2** — Avisos y Deshacer (8 s) | ✅ | `docs/mejoras/C2-avisos.md` |
| **C3** — Guardando/Guardado, Ctrl+S, cambios sin guardar | ✅ | `docs/mejoras/C3-editor.md` |
| **C4** — Skeletons, estados vacíos con acción, errores con Reintentar | ✅ | `docs/mejoras/C4-estados.md` |
| **C5** — Tokens, estados idénticos, 3 pantallas, reduced-motion | ✅ | `docs/mejoras/C5-consistencia.md` |
| **C6** — Móvil 375 px sin scroll horizontal | ✅ | `docs/mejoras/C6-movil.md` |
| **C7** — Memoria de vista/scroll, volver, atajos `?`, ir al artículo, copiar con cita | ✅ | `docs/mejoras/C7-navegacion.md` |
| **C8** — Precarga, saltos de layout, Lighthouse antes/después | ✅ | `docs/mejoras/C8-rendimiento.md` |
| **C9** — Imprimir apunte y artículo | ✅ | `docs/mejoras/C9-impresion.md` |
| Accesibilidad básica | ✅ (axe-core en 12 pantallas × 2 temas) | `docs/mejoras/A11y-accesibilidad.md` |

**No hecho / no verificado**

- **Ley 19.913 (Unidad de Análisis Financiero)**: `obtxml` de la BCN devuelve una página HTML en vez del XML (idNorma 219119). No se inventó texto: se cargó la reserva **Ley 18.918** y queda pendiente. La segunda reserva (Ley 20.730) quedó descargada, pero no se cargó.
- **Respuesta real de Consultar**: no se verificó, porque no hay clave de API en el entorno. Se probaron el camino de error, "Reintentar" y la precarga de los códigos.
- **Íconos (CDN de Tabler) y fuente Inter**: no se ven en las capturas, porque el contenedor no alcanza la CDN. El diseño se verificó sin íconos.
- **Lector de pantalla real y dispositivos físicos** (iOS/Android): no se probaron; solo emulación de Chromium (375 px, táctil) y reglas automáticas.

---

## 2. Leyes cargadas (A)

Fuente: XML oficial de la BCN (`https://www.bcn.cl/leychile/consulta/obtxml?opt=7&idNorma=N`), convertido con `scripts/bcn_xml_a_json.mjs` y regenerable con `scripts/leyes_lote1.mjs`.

- **Control de calidad** (`scripts/verificar_leyes.mjs src/data`): 54 normas, **0 errores**, 9 avisos, todos de normas anteriores a este lote.
- **Muestra manual**: 150 de 150 artículos (5 por ley) coinciden con el XML.
- **Última versión**: la `fechaVersion` más reciente que no sea posterior a hoy. Las vigencias diferidas quedan anotadas como NOTA en el artículo; p. ej. el art. 4 bis de la Ley 18.045 rige desde el 01-04-2027.

| Ley | N° | idNorma BCN | URL fuente | Última versión | Artículos | Tipo |
|---|---|---|---|---|---|---|
| Protección de los Derechos de los Consumidores (texto refundido DFL 3/2019) | 19.496 | 1160403 | https://www.bcn.cl/leychile/navegar?idNorma=1160403 | 11-JUL-2025 | 149 + 15 trans. | `cns` |
| Nueva Ley de Matrimonio Civil | 19.947 | 225128 | https://www.bcn.cl/leychile/navegar?idNorma=225128 | 19-JUN-2024 | 102 + 8 trans. | `mat` |
| Abandono de Familia y Pago de Pensiones Alimenticias (DFL 1/2000 Justicia, art. 7°) | 14.908 | 172986 | https://www.bcn.cl/leychile/navegar?idNorma=172986 | 28-AGO-2025 | 50 + 1 trans. | `ali` |
| Violencia Intrafamiliar | 20.066 | 242648 | https://www.bcn.cl/leychile/navegar?idNorma=242648 | 22-JUL-2026 | 35 | `vif` |
| Filiación (modifica el Código Civil) | 19.585 | 126366 | https://www.bcn.cl/leychile/navegar?idNorma=126366 | 26-OCT-1998 | 9 + 6 trans. | `fil` |
| Sociedades Anónimas | 18.046 | 29473 | https://www.bcn.cl/leychile/navegar?idNorma=29473 | 01-ENE-2026 | 166 + 10 trans. | `soc` |
| Mercado de Valores | 18.045 | 29472 | https://www.bcn.cl/leychile/navegar?idNorma=29472 | 30-DIC-2023 | 263 + 3 trans. | `mvl` |
| Protección de la Vida Privada (sin la reforma de la Ley 21.719, de vigencia diferida) | 19.628 | 141599 | https://www.bcn.cl/leychile/navegar?idNorma=141599 | 10-NOV-2022 | 24 + 3 trans. | `pvp` |
| Responsabilidad Penal de las Personas Jurídicas | 20.393 | 1008668 | https://www.bcn.cl/leychile/navegar?idNorma=1008668 | 17-AGO-2023 | 40 | `rpj` |
| Delitos Económicos | 21.595 | 1195119 | https://www.bcn.cl/leychile/navegar?idNorma=1195119 | 29-SEP-2025 | 68 | `dec` |
| Penas Sustitutivas | 18.216 | 29636 | https://www.bcn.cl/leychile/navegar?idNorma=29636 | 12-FEB-2025 | 58 + 2 trans. | `pns` |
| Medidas contra la Discriminación | 20.609 | 1042092 | https://www.bcn.cl/leychile/navegar?idNorma=1042092 | 14-JUN-2024 | 18 | `dsc` |
| Tenencia Responsable de Mascotas | 21.020 | 1106037 | https://www.bcn.cl/leychile/navegar?idNorma=1106037 | 02-AGO-2017 | 38 + 4 trans. | `mas` |
| Seguro Obligatorio de Accidentes Personales (SOAP) | 18.490 | 29893 | https://www.bcn.cl/leychile/navegar?idNorma=29893 | 07-FEB-2026 | 46 | `soa` |
| Ley de Tránsito (DFL 1/2007) | 18.290 | 1007469 | https://www.bcn.cl/leychile/navegar?idNorma=1007469 | 27-AGO-2026 | 253 + 7 trans. | `trt` |
| Bases Generales del Medio Ambiente | 19.300 | 30667 | https://www.bcn.cl/leychile/navegar?idNorma=30667 | 10-ABR-2024 | 118 + 7 trans. | `amb` |
| Tribunales Ambientales | 20.600 | 1041361 | https://www.bcn.cl/leychile/navegar?idNorma=1041361 | 13-JUN-2022 | 48 + 7 trans. | `tam` |
| LOC de Bases Generales de la Administración del Estado (DFL 1/19.653) | 18.575 | 191865 | https://www.bcn.cl/leychile/navegar?idNorma=191865 | 15-ENE-2024 | 82 + 2 trans. | `bga` |
| Estatuto Administrativo (DFL 29/2004) | 18.834 | 236392 | https://www.bcn.cl/leychile/navegar?idNorma=236392 | 24-AGO-2024 | 168 + 19 trans. | `est` |
| Estatuto Administrativo de Funcionarios Municipales | 18.883 | 30256 | https://www.bcn.cl/leychile/navegar?idNorma=30256 | 24-AGO-2024 | 165 + 17 trans. | `emu` |
| LOC de Municipalidades (DFL 1/2006) | 18.695 | 251693 | https://www.bcn.cl/leychile/navegar?idNorma=251693 | 12-AGO-2026 | 178 + 8 trans. | `mun` |
| Arrendamiento de Predios Urbanos | 18.101 | 29526 | https://www.bcn.cl/leychile/navegar?idNorma=29526 | 30-JUN-2022 | 42 + 2 trans. | `arr` |
| Nueva Ley de Copropiedad Inmobiliaria | 21.442 | 1174663 | https://www.bcn.cl/leychile/navegar?idNorma=1174663 | 23-SEP-2026 | 105 + 11 trans. | `cop` |
| Propiedad Intelectual | 17.336 | 28933 | https://www.bcn.cl/leychile/navegar?idNorma=28933 | 03-NOV-2017 | 161 | `pin` |
| Propiedad Industrial (DFL 4/2022) | 19.039 | 1179684 | https://www.bcn.cl/leychile/navegar?idNorma=1179684 | 06-AGO-2022 | 189 + 10 trans. | `pid` |
| Inclusión Social de Personas con Discapacidad | 20.422 | 1010903 | https://www.bcn.cl/leychile/navegar?idNorma=1010903 | 16-FEB-2026 | 87 + 6 trans. | `dis` |
| Documentos Electrónicos y Firma Electrónica | 19.799 | 196640 | https://www.bcn.cl/leychile/navegar?idNorma=196640 | 09-FEB-2024 | 25 + 1 trans. | `fel` |
| Transformación Digital del Estado | 21.180 | 1138479 | https://www.bcn.cl/leychile/navegar?idNorma=1138479 | 09-JUN-2022 | 17 | `tde` |
| Protección, Fomento y Desarrollo de los Indígenas | 19.253 | 30620 | https://www.bcn.cl/leychile/navegar?idNorma=30620 | 29-SEP-2025 | 81 + 18 trans. | `ind` |
| LOC del Congreso Nacional (reserva, en lugar de la 19.913) | 18.918 | 30289 | https://www.bcn.cl/leychile/navegar?idNorma=30289 | 17-DIC-2016 | 83 + 3 trans. | `cng` |

**Total: 3.038 artículos.** La ficha de cada ley (metadatos) enlaza a `https://www.bcn.cl/leychile/navegar?idNorma=N`, con fecha de indexación 30-09-2026.

---

## 3. Persistencia (store `prima-lex-storage-v3`)

| Versión | Cambio | Ítem |
|---|---|---|
| — | **Bug corregido**: los bloques de `migrate` hacían `return` temprano; quien venía de una versión vieja recibía solo la primera migración aplicable. Ahora se encadenan, con el helper `resincronizarCodigos`. | B0/B1 |
| v29 | Resincroniza `codigos` para incluir las 30 leyes, conservando el activo/inactivo que el usuario había elegido. | A |
| v30 | `repasoApuntes` (estado Leitner de cada tarjeta). | B5 |
| v31 | `posicionLectura` al store: trae y borra las claves antiguas `prima-lex-apunte-scroll:*` de `localStorage`. | C1 |
| v32 | Se persisten `vistaActiva`, `moduloActivoId`, `codigoExploradorActivo` y `ultimoArticuloExplorador`. No hay nada que transformar: las claves faltantes toman el valor inicial. | C7 |

Otros cambios de almacenamiento:

- `crearAlmacenamiento` agrupa las escrituras en 400 ms y serializa solo al escribir.
- Escribe de inmediato en `pagehide`, al ocultar la página o con Ctrl+S.
- Con la cuota llena muestra un aviso y no lanza error; el respaldo revierte si no cabe.

Fuera del store: el scroll de cada vista va en `sessionStorage` (`prima-lex-scroll-vistas`) y el borrador del formulario de apunte en `prima-lex-borrador-apunte:<módulo>`.

---

## 4. Decisiones

1. **Leyes activas por defecto**: la v29 las agrega activas, así Consultar las usa sin configurar nada. El costo es que la primera consulta construye más índices (~1,3 s en dev; propuesta: Web Worker).
2. **Un solo commit de datos para las 30 leyes**, separado del commit del pipeline: se revisa el código sin ruido y los JSON se regeneran con el script.
3. **Texto vigente por DFL**: cuando una ley tiene texto refundido se usa el `idNorma` del DFL, porque la ficha de la ley original deja de actualizarse. En Consumidor, Tránsito y Propiedad Industrial se quita el artículo "envoltorio" del DFL (`--sin-envoltorio`).
4. **19.628 sin la reforma de la 21.719**: esa reforma aún no está vigente. Queda anotado en la fuente del JSON.
5. **Códigos por `fetch` en vez de `import()`** (C4): Chromium deja en caché un `import()` fallido, así que "Reintentar" no servía. Los JSON se publican como assets con hash; en bruto pesan ~14 % más que los chunks JS (con gzip/brotli, casi igual).
6. **Vistas bajo demanda** (C8): 12 chunks con precarga por intención (cursor, foco o dedo). El JS inicial baja de 434 KB a 208 KB comprimido. Un límite de error por vista recarga sola una vez si un chunk de un deploy anterior ya no existe.
7. **Tema en `<html data-tema>`** además del `div.dark`: los modales y avisos se montan por portal fuera de ese div. Con esto funcionan los tokens (`.boton`, `--accent-texto`, anillo de foco) en toda la app.
8. **"Volver" con `useStore.subscribe`** y no dentro de cada acción: la vista cambia desde muchas acciones distintas y así ninguna queda fuera.
9. **Pruebas**: Playwright con Chromium del entorno (claro/oscuro, 375 y 1280 px, táctil emulado), Lighthouse 13.5, axe-core 4 y PyMuPDF para revisar los PDF de impresión. Todo en carpetas temporales, **nada de eso entra al repo**.

---

## 5. Auto-revisión por ítem

Cada ítem tiene su archivo en `docs/mejoras/` con las preguntas críticas, los casos límite y 3 o más mejoras con su costo. Resumen:

| Ítem | Qué encontró la revisión | Qué se corrigió | Propuestas que quedan |
|---|---|---|---|
| A | Artículo "envoltorio" del DFL; cabeceras sin quitar (Ñ, caracteres dañados); notas al margen partidas; selector sin búsqueda; filtro por subcadena con falsos positivos | `--sin-envoltorio`, cabecera según el número del artículo, reparación de caracteres antes de limpiar, búsqueda por inicio de palabra, precarga | Índices de búsqueda en un Web Worker |
| B1 | La cuota llena dejaba la memoria distinta de lo guardado; avisos tapando botones en móvil; ceros en el resumen | Almacenamiento a prueba de cuota con reversión; avisos arriba en móvil; fecha del último respaldo | Respaldo automático a una carpeta |
| B2 | Varias palabras saltaban a la primera; búsqueda en cada tecla; Omnibar pegado a los bordes | Prioridad a la frase completa, debounce de 120 ms, márgenes, scroll al resultado activo | Filtros por tipo; índice en un worker |
| B3 | Nota sin validar (70, −3); contraste en oscuro; clases sin ramo | Validación 1–7; se abre directo la evaluación; colores por tema | Exportar a .ics; notificaciones |
| B4 | Menú cortado al pie; sin teclado; botones de 28 px; .md no reversible en el lector | Menú hacia arriba, flechas, 40–44 px, una sola función de exportar | Selección múltiple; metadatos en el .md |
| B5 | Fallar y luego acertar en la misma sesión subía de caja; reverso sin término; definición de una sola línea | Solo cuenta la primera respuesta; frente y reverso juntos; continuación con sangría; sesiones de 20 | Repaso por ramo; tarjetas cloze |
| B6 | ~64 ms por tecla; tarjetas recalculadas en cada autoguardado; archivo de 1.499 líneas | Memo + caché WeakMap; pestañas en archivos propios; escritura agrupada (p50 64 → 16 ms) | IndexedDB |
| C1 | Encabezado del lector saturado a 375 px; restauración de la posición sin avisar | Fila de progreso en móvil; "Retomar donde quedaste" | Índice fijo en pantallas anchas; sincronizar entre dispositivos |
| C2 | 5 `alert()` bloqueantes; acciones sin aviso; Deshacer imposible de alcanzar en táctil | Avisos consistentes, pausa al tocar, deslizar para cerrar | Historial de deshacer (Ctrl+Z global) |
| C3 | Se podía perder lo escrito al cerrar; sin indicador en móvil; el formulario no autoguardaba | Vaciado de la escritura al salir, indicador visible, borrador recuperable | Diálogo propio de "Guardar y salir"; versiones |
| C4 | Reintentar no volvía a pedir el archivo (`import()` en caché); "Failed to fetch" en inglés; Consultar sin reintento | Carga por `fetch`, mensajes en español, `reintentar()` sin duplicar la pregunta, reintento al volver la conexión | Minificar los JSON; Service Worker |
| C5 | Botón de 30 px de ancho; pestañas sin flechas; 17 campos sin foco visible; portales sin tema | `min-width`, patrón ARIA de pestañas, `campo-foco`, `data-tema` | Llevar `.boton` al resto de las vistas; alto contraste |
| C6 | Detector con falsos "ok"; barras de ancho fijo; chips de 25 px; eliminar solo con hover | Drawer, barras flexibles, 40 px en táctil, acciones visibles en táctil | Barra inferior en móvil |
| C7 | Último artículo pisado al cambiar de código; Ctrl+K abría dos buscadores; Ctrl+B ponía negrita y además colapsaba el menú; `useCodigo` entregaba el código anterior | Selección ligada a su código, captura del atajo, `defaultPrevented`, `useCodigo` corregido | Integrar con el Atrás del navegador; cita larga |
| C8 | Pantalla en blanco si falla un chunk; chunks de un deploy anterior; contraste del pie; `lang="en"` | Límite de error con recarga automática, AA, `es-CL` | Íconos servidos desde el propio sitio; Service Worker |
| C9 | Ctrl+P en el lector daba una hoja en blanco; igual en otras pantallas; en el Modo Lectura de artículos imprimía el código entero | Vistas imprimibles con modo; aviso en pantallas sin versión imprimible; artículo en el Modo Lectura | Imprimir una sección; notas al margen al pie |
| A11y | Contraste: 20 problemas en claro y 97 en oscuro; 5 campos sin etiqueta; interactivo anidado | Token `--accent-texto`, reglas de texto secundario, etiquetas, botones hermanos | Trampa de foco en modales; "saltar al contenido" |

**Lighthouse** (móvil, mediana de 3, `main` → rama):

| Métrica | `main` | Rama |
|---|---|---|
| Rendimiento | 79 | **93** |
| Accesibilidad | 95 | **100** |
| First Contentful Paint | 3,76 s | **2,15 s** |
| Speed Index | 4,72 s | **2,15 s** |
| CLS | 0 | 0 |

---

## 6. Funciones nuevas (para quien use la app)

- **30 leyes especiales** en Explorador, Consultar, Colecciones y Mapa, con ficha y fuente BCN.
- **Respaldo**: descargar o importar todos los datos, combinando o reemplazando.
- **Buscar en apuntes** desde Ctrl+K (sin tildes); abre el apunte en la coincidencia.
- **Próximas evaluaciones y clases** en Módulos, con cuenta regresiva.
- **Apuntes**: duplicar, mover a otro ramo, exportar e importar `.md`, repaso de tarjetas por reglas, progreso de lectura con "Retomar", indicador de guardado, Ctrl+S, borrador recuperable e impresión.
- **Explorador**:
  - "Ir al artículo" tolerante (`183a`, `4 bis`), búsqueda sin tildes con resaltado y "Copiar con cita".
  - Imprimir un artículo, retomar el último artículo de cada código, barra de posición y botón Volver.
- **General**:
  - Avisos con Deshacer y panel de atajos con `?`.
  - La app recuerda la última vista y el scroll, y funciona en el celular (menú lateral deslizable).
  - Reintentar ante errores de red, foco visible con teclado y mejor contraste.
