# CONTEXTO — Prima Lex

> Memoria técnica del proyecto. Léeme antes de continuar trabajando en cualquier feature.
> Fuente de verdad para retomar contexto cuando la ventana de conversación se llene.

**Última actualización:** 2026-05-21
**Working directory:** `C:\Users\sando\lexconsulta`
**Servidor dev:** http://localhost:5173/

---

## 1. Qué es Prima Lex

SPA de consulta jurídica chilena asistida por IA. Frontend puro sin backend; toda la lógica corre en el navegador. La única dependencia externa es la API de Anthropic.

**Mercado:** Chile (Código del Trabajo, Civil, Penal, Tributario, etc.)
**Usuarios:** dos perfiles — *ciudadano* (lenguaje simple) y *profesional del derecho* (terminología técnica).
**Diferenciador:** no solo muestra artículos; los interpreta, relaciona y aplica al caso del usuario.

---

## 2. Stack con versiones

### Producción
| Paquete | Versión | Uso |
|---|---|---|
| `react` | ^19.2.6 | Framework |
| `react-dom` | ^19.2.6 | |
| `@anthropic-ai/sdk` | ^0.97.1 | Cliente API Anthropic |
| `@xyflow/react` | ^12.10.2 | Canvas/grafo (módulo Canvas) |
| `@tailwindcss/postcss` | ^4.3.0 | Plugin PostCSS para Tailwind v4 |
| `framer-motion` | ^12.39.0 | Animaciones/transiciones |
| `react-markdown` | ^10.1.0 | Render markdown en respuestas IA |
| `remark-gfm` | ^4.0.1 | Extensiones markdown (listas, tablas) |
| `zustand` | ^5.0.13 | Estado global + persist localStorage |

### Desarrollo
| Paquete | Versión | Uso |
|---|---|---|
| `vite` | ^8.0.12 | Build tool + HMR |
| `typescript` | ~6.0.2 | |
| `@vitejs/plugin-react` | ^6.0.1 | |
| `tailwindcss` | ^4.3.0 | Estilos |
| `pdfjs-dist` | ^5.7.284 | Procesamiento PDFs oficiales (script) |
| `eslint` | ^10.3.0 | |
| `typescript-eslint` | ^8.59.2 | |

### Sistema
- **Node.js:** 24.15.0 (instalado vía winget)
- **npm:** 11.12.1
- **VS Code** + extensiones: ESLint, Prettier, Tailwind CSS IntelliSense, GitLens
- **OS:** Windows 11
- **Shell:** PowerShell (los comandos del proyecto usan sintaxis PS)

---

## 3. Estructura de carpetas

```
lexconsulta/
├── .env                           # VITE_ANTHROPIC_API_KEY (NO commitear)
├── .gitignore                     # Incluye .env, node_modules, dist
├── CONTEXTO.md                    # Este archivo
├── README.md                      # Default de Vite (no actualizado)
├── index.html                     # <title>Prima Lex</title>
├── package.json                   # name: "prima-lex"
├── tailwind.config.js
├── postcss.config.js              # Usa @tailwindcss/postcss (NO tailwindcss directo)
├── tsconfig.app.json              # resolveJsonModule: true
├── vite.config.ts
│
├── scripts/                       # Pipeline procesamiento PDFs (Node CLI)
│   ├── extract_pdf.mjs            # PDF → texto plano con markers <<P>> para incisos
│   └── procesar_codigo.mjs        # Texto → JSON estructurado con jerarquía
│
└── src/
    ├── main.tsx
    ├── App.tsx                    # Router de vistas + ModalPerfil global
    ├── index.css                  # Tabler Icons + Tailwind + scrollbar custom
    ├── App.css                    # (vacío, antes tenía estilos demo)
    │
    ├── types/
    │   └── index.ts               # Todos los tipos del proyecto
    │
    ├── store/
    │   └── useStore.ts            # Zustand + persist (storage key "prima-lex-storage-v3")
    │
    ├── data/
    │   └── codigoTrabajo.json     # 729 artículos del Código del Trabajo
    │
    ├── services/                  # Lógica de negocio sin UI
    │   ├── codigos.ts             # Carga estática de JSONs
    │   ├── busqueda.ts            # Buscador con ponderación (números×10, label×3, texto×1)
    │   ├── anthropic.ts           # Cliente Sonnet 4.5 para Consultar
    │   └── canvas.ts              # Cliente Haiku 4.5 para Canvas + cache localStorage
    │
    ├── hooks/
    │   ├── useCodigo.ts           # Acceso a CodigoData por tipo
    │   └── useChat.ts             # Estado del chat + sync con historial del store
    │
    └── components/
        ├── layout/
        │   ├── Sidebar.tsx        # 7 items nav + botón "Códigos"
        │   └── Topbar.tsx         # Título vista + modo oscuro + selector perfil
        ├── ui/
        │   ├── ModalPerfil.tsx    # Selección Ciudadano/Profesional
        │   ├── ModalCodigos.tsx   # Gestión 14 códigos con buscador
        │   ├── CitaBlock.tsx      # Card expandible de artículo citado
        │   ├── JurBlock.tsx       # Card de jurisprudencia (no usado aún)
        │   └── Placeholder.tsx    # Vista placeholder reutilizable
        └── views/
            ├── ConsultarView.tsx  # Chat con IA + citas
            ├── SituacionView.tsx  # ⚠️ Placeholder
            ├── CanvasView.tsx     # Pizarra con React Flow
            ├── CompararView.tsx   # ⚠️ Placeholder
            ├── MapaView.tsx       # ⚠️ Placeholder
            ├── ExploradorView.tsx # Navegación de artículos
            ├── HistorialView.tsx  # Lista de conversaciones pasadas
            └── AdminView.tsx      # CRUD de jurisprudencia
```

---

## 4. Qué hace cada archivo importante

### Núcleo

**`src/types/index.ts`** — Todos los tipos. Si agregas/modificas algún concepto, empieza aquí.
Tipos clave: `PerfilUsuario`, `CodigoTipo` (14 códigos), `VistaId` (8 vistas), `Articulo`, `CodigoData`, `Cita`, `Mensaje`, `ConsultaHistorial`, `NodoCanvas`, `Canvas`, `EntradaJurisprudencia`.

**`src/store/useStore.ts`** — Estado global Zustand con persist.
- Persistencia: storage key `prima-lex-storage-v3` (bumpear version+key si cambia schema)
- **Persisted:** perfil, codigos, jurisprudencia, historial, favoritos, canvases, modoOscuro
- **No persisted:** vistaActiva, consultaActivaId, canvasActivoId, modalPerfilAbierto

**`src/App.tsx`** — Layout: Sidebar + Topbar + `<main>` con la vista activa. Modal de perfil global. Agrega clase `dark` al root cuando modoOscuro está activo (afecta scrollbars).

### Servicios

**`src/services/codigos.ts`** — Carga estática del JSON. Solo `lab` (Trabajo) está cargado. Agregar nuevos códigos significa importar el JSON aquí.

**`src/services/busqueda.ts`** — Función `buscar(query, codigosActivos, limit=8)`:
- Tokeniza sin tildes ni stopwords jurídicas
- Pondera: número exacto del artículo +15, palabra en label +3, ocurrencia en texto +1
- Devuelve top-N con `matches` (palabras) y `numeroDirecto` (boolean)

**`src/services/anthropic.ts`** — Modelo: `claude-sonnet-4-5`, max_tokens 1500.
- `dangerouslyAllowBrowser: true` ⚠️ (la API key se expone en el cliente)
- System prompt distinto por perfil (ciudadano/profesional)
- Pide markdown limitado (sin `##` ni `---`, máx 3-4 párrafos)
- Extrae citas detectando `Art. N` en la respuesta y cruzándolas con el contexto

**`src/services/canvas.ts`** — Modelo: `claude-haiku-4-5-20251001`, max_tokens 1000.
- Genera concepto en una sola llamada (definición + artículos + caso)
- **Cache localStorage:** key `prima-lex-canvas-cache-v1`, índice por concepto normalizado
- Función `generarRelacion(a, b)`: para botón "Generar relación" entre 2 nodos
- Parser JSON robusto (acepta fences, busca primer `{...}`)

### Hooks

**`src/hooks/useChat.ts`** — Orquesta Consultar:
1. Pregunta del usuario → busca top-8 artículos
2. Envía a Anthropic
3. Guarda mensaje + respuesta como `Mensaje[]`
4. **Sync con historial:** si no hay conversación activa, crea una; si sí, la actualiza

**`src/hooks/useCodigo.ts`** — Wrapper delgado de `services/codigos.ts`. **No tiene su propio catálogo** — siempre delega al servicio. (Antes tenía un catálogo separado y causó un bug donde el Explorador no veía códigos nuevos. Mantener delegado.)

### Vistas funcionales

**`ConsultarView.tsx`** — Chat con IA. Cuando vacío muestra pantalla de bienvenida con sugerencias chips. Mensajes con `react-markdown` (custom components para `p`, `ul`, `h3`, etc.). Las menciones `Art. N` se resaltan automáticamente como pills verdes. Citas al final del mensaje como `CitaBlock`.

**`ExploradorView.tsx`** — Navegación de artículos:
- Topbar con info del código + botón Índice (drawer derecho) + buscador con `Ctrl+K`
- Breadcrumb jerárquico (Código › Libro › Título › Cap. › Párrafo › Art.)
- Card central grande con artículo (serif, 17px)
- Carrusel inferior con prev/next y artículos cercanos
- Modal de búsqueda estilo command palette
- Modal de índice con árbol Libro/Título/Capítulo
- **Notas separadas en cajas más pequeñas** (texto del artículo separado de `NOTA:`, `NOTA 2:`)
- **Incisos como párrafos separados** (gracias a `<<P>>` markers del parser)

**`CanvasView.tsx`** — Pizarra de aprendizaje con React Flow:
- Genera 4 nodos (Concepto/Definición/Artículos/Caso) por concepto
- **Multi-concepto:** segundo concepto se posiciona a la derecha del primero
- **NodeResizer** activo al seleccionar
- **NodeToolbar** al seleccionar (Colapsar/Editar/Duplicar/Color/Eliminar)
- **Edges editables** con etiqueta inline
- **Color heredado** en nodos libres conectados
- **Undo/Redo** con Ctrl+Z / Ctrl+Y (snapshots máx 50)
- **Snap a grid 20px** invisible
- **Multi-selección Shift+click** → botón "Generar relación" con Haiku
- Context (`CanvasContext`) para callbacks → evita re-renders en bucle
- `nodrag` class en inputs/textareas editables → permite seleccionar texto sin mover el nodo

**`HistorialView.tsx`** — Lista de conversaciones:
- Agrupadas por tiempo (Hoy/Ayer/Esta semana/Este mes/Anterior)
- Filtros por módulo + buscador
- Click → carga conversación en Consultar
- Empty state con CTA a Consultar

**`AdminView.tsx`** — CRUD de jurisprudencia:
- Lista con filtros por organismo y código
- Stats (Total / Organismos / Códigos cubiertos)
- Modal de formulario con autocomplete de 10 organismos chilenos
- Campos: organismo, referencia, fecha, código, materia, artículos relacionados, resumen, texto completo, URL

### Componentes UI compartidos

**`Sidebar.tsx`** — 7 items de navegación + botón compacto "Códigos · X activos" abre `ModalCodigos`.

**`Topbar.tsx`** — Título de la vista activa + toggle modo oscuro + botón perfil.

**`ModalPerfil.tsx`** — Bloquea la app hasta que el usuario selecciona perfil. Cambiable después desde topbar.

**`ModalCodigos.tsx`** — Lista de 14 códigos por categoría con buscador. Constitución y Tratados con candado (bloqueados, siempre activos).

**`CitaBlock.tsx`** — Card de artículo citado, expandible con texto completo. Detecta si el ID ya empieza con "Art." (evita duplicar prefijo).

### Datos

**`src/data/codigoTrabajo.json`** — 729 artículos (706 permanentes + 23 transitorios):
```json
{
  "codigo": "Código del Trabajo",
  "tipo": "lab",
  "fuente": "DFL-1, publicado 16-ENE-2003, última versión 07-FEB-2026",
  "total_articulos": 706,
  "total_transitorios": 23,
  "articulos": [
    { "a": "Art. 1", "t": "Las relaciones laborales...", "libro": "I — DEL...", "titulo": "I — DEL...", "capitulo": "I — ...", "parrafo": null }
  ]
}
```
Estructura jerárquica capturada: Libros I-V detectados, Títulos, Capítulos, Párrafos. Sub-artículos como `Art. 183-A`, `Art. 152 quáter`, `Art. 152 quáter O bis` están unificados.

### Scripts

**`scripts/extract_pdf.mjs`** — Extrae texto del PDF preservando indentación.
- Filtra notas al margen con `x < 380`
- Marca líneas indentadas con `<<P>>` para que el parser las trate como nuevo inciso
- Output: archivo de texto plano con páginas separadas

**`scripts/procesar_codigo.mjs`** — Parsea el texto → JSON estructurado.
- Detecta encabezados: `LIBRO N`, `TITULO/Título N`, `Capítulo N`, `Párrafo N`
- Detecta artículos: `Artículo N`, `Art. N`, `Art. N-A`, `Art. N bis`, `Art. N quáter O bis`
- Maneja transitorios (sección `ARTICULOS TRANSITORIOS`)
- Convierte markers `<<P>>` en `\n\n` dentro del texto

---

## 5. Estado actual de cada módulo

| Módulo | Estado | Detalle |
|---|---|---|
| **Consultar** | ✅ Funcional | Chat con Sonnet, citas expandibles, mensajes en markdown, conectado a Historial |
| **Situación** | ⚠️ Placeholder | Vista informativa, sin lógica |
| **Canvas** | ✅ Funcional | Generación con Haiku, multi-concepto, edición, resize, undo/redo, generar relación |
| **Comparar** | ⚠️ Placeholder | |
| **Mapa** | ⚠️ Placeholder | |
| **Explorador** | ✅ Funcional | Navegación con índice, breadcrumb, búsqueda Ctrl+K, carrusel; solo Código del Trabajo cargado |
| **Historial** | ✅ Funcional | Lista, filtros, retomar conversación; solo guarda Consultar (Situación y Comparar lo harán cuando existan) |
| **Admin** | ✅ Funcional | CRUD de jurisprudencia con persistencia local; **NO está conectada con Consultar todavía** |

### Datos cargados
- **lab** (Código del Trabajo): ✅ 729 artículos indexados
- **con, tra** (Constitución, Tratados): bloqueados, siempre activos pero sin datos
- **civ, pen, tri, com, agu, san, min, pci, ppe, pad, mil**: pendientes (necesitan PDF + reproceso)

---

## 6. Decisiones de arquitectura implementadas

1. **Frontend puro sin backend.** Toda la lógica corre en el navegador. La API de Anthropic se llama directamente con `dangerouslyAllowBrowser: true`.

2. **Zustand con persist.** Estado global serializado a localStorage (`prima-lex-storage-v3`). Migrations por `version` field; bumpear cuando cambie schema.

3. **Códigos cargados estáticamente.** `src/services/codigos.ts` importa los JSON con `import codigoTrabajo from '../data/codigoTrabajo.json'`. Para agregar uno, importar aquí + actualizar `CODIGOS_DATA`.

4. **Modelo según función.**
   - Sonnet 4.5 (`claude-sonnet-4-5`) para **Consultar** (precisión jurídica crítica)
   - Haiku 4.5 (`claude-haiku-4-5-20251001`) para **Canvas** (didáctico, alto volumen)

5. **Caché de conceptos en Canvas.** localStorage separado (`prima-lex-canvas-cache-v1`) para no inflar el store principal. Repetir un concepto = 0 tokens.

6. **Búsqueda con ponderación local.** Antes de cualquier llamada a IA, se filtra a 8 artículos relevantes en cliente. Reduce contexto y costo.

7. **Pipeline de PDFs en Node, no en runtime.** Los PDFs oficiales se procesan offline con `scripts/`. El cliente solo carga el JSON resultante.

8. **React Flow con Context, no props.** Las callbacks de los nodos del canvas viven en `CanvasContext`. Pasarlas via `data` causaba bucles infinitos de re-render.

9. **History stack manual con refs.** `nodesRef`/`edgesRef` + array de snapshots. Sin esto, `pushHistory` cambiaba en cada render y rompía las callbacks.

10. **Markdown limitado en respuestas IA.** El system prompt prohíbe `##` y `---`. `react-markdown` con custom components para renders consistentes.

11. **Migraciones de schema en el store** via `migrate` function de Zustand persist. Cambio de schema → bumpear version → migrate descarta lo viejo.

12. **`nodrag` class en editables del canvas.** Sin esto, arrastrar para seleccionar texto movía el nodo entero.

---

## 7. Bugs conocidos / Pendientes

### Críticos (antes de deploy)
- 🔴 **API key expuesta en el cliente.** `VITE_ANTHROPIC_API_KEY` queda en el bundle. Cualquiera puede sacarla. **Antes de prod hay que migrar a backend proxy** o usar serverless function.
- 🔴 **Sin rate limiting ni protección.** Un usuario puede gastar la cuota completa.

### Conocidos
- 🟡 **Jurisprudencia no se inyecta en Consultar.** El módulo Admin guarda entradas pero la IA no las usa todavía. **Próximo paso natural.**
- 🟡 **Solo Código del Trabajo cargado.** Los otros 13 códigos están en el sidebar pero pendientes. Hay que descargar el PDF oficial de BCN y correr `scripts/extract_pdf.mjs` + `scripts/procesar_codigo.mjs`.
- 🟡 **Cache de Canvas puede llenar localStorage.** No hay límite ni TTL. ~5MB de quota total.
- 🟡 **`History stack` del Canvas no se persiste.** Recargar pierde el undo.

### Menores
- Algunos artículos pueden tener saltos de inciso imperfectos (heurística de indentación no es 100%).
- Modelo `claude-sonnet-4-5` puede no estar disponible si la API key tiene perfil restringido; alternativa: `claude-sonnet-4-6`.
- README.md sigue siendo el default de Vite (no se ha actualizado).
- Bundle pesa ~2.1 MB (564 KB gzip). Se puede mejorar con code-splitting por vista; por ahora aceptable.

### Build vs typecheck
- `npx tsc --noEmit` (que usamos durante desarrollo) es **menos estricto** que `npm run build` (que usa `tsc -b`).
- Antes de deployar SIEMPRE correr `npm run build` local para detectar errores que solo aparecen en build de producción.
- Errores típicos que solo aparecen en build: type predicates inválidos, propiedades faltantes en `Record<K, V>`, props requeridas omitidas en JSX.

---

## 8. Variables de entorno

Archivo `.env` en la raíz (ya en `.gitignore`):

```ini
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

⚠️ Variables `VITE_*` se exponen al cliente. La key actual del `.env` quedó en logs de chat antiguos; **rotarla antes de hacer público el repo**.

---

## 9. Comandos útiles

### Desarrollo
```powershell
# Servidor dev (HMR en http://localhost:5173)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Verificar TypeScript sin emitir
npx tsc --noEmit

# Lint
npm run lint
```

### Procesar un código legal desde su PDF oficial
```powershell
# 1. Descargar PDF de https://www.bcn.cl/leychile/
# 2. Extraer texto preservando indentación
node scripts/extract_pdf.mjs "C:\ruta\al\codigo.pdf" "C:\Users\sando\AppData\Local\Temp\codigo_raw.txt" 380 8

# 3. Parsear y generar JSON
node scripts/procesar_codigo.mjs "C:\Users\sando\AppData\Local\Temp\codigo_raw.txt" "src\data\codigoXXX.json" "Nombre del Código" "tipo" "Fuente legal"

# 4. Importar SOLO en src/services/codigos.ts (catálogo único; useCodigo delega aquí)
#    Agregar: import codigoXXX from '../data/codigoXXX.json'
#    Agregar al CODIGOS_DATA: xxx: codigoXXX as CodigoData

# 5. Marcar como cargado en src/store/useStore.ts (cargado: true)
```

### Git
```powershell
# Repo: https://github.com/sandovallukas30-cyber/lexconsulta
git status
git add .
git commit -m "mensaje"
git push
```

### Reset del store (si hay datos corruptos en dev)
```powershell
# Abrir DevTools → Application → Local Storage
# Eliminar la key "prima-lex-storage-v3"
# (también "prima-lex-canvas-cache-v1" si quieres limpiar el cache de conceptos)
```

---

## 10. Convenciones del proyecto

- **Idioma del código:** español para nombres de variables/funciones de dominio (`agregarConsulta`, `vistaActiva`, `nodoLibre`), inglés para genéricos React (`children`, `onClick`).
- **Colores:** verde primario `#0F6E56` (`VERDE` constante en cada vista).
- **Modo oscuro:** patrón `modoOscuro ? 'bg-zinc-900' : 'bg-white'` en cada componente. Toggle persiste.
- **Tailwind:** v4, sin `@apply`, sin variantes custom. `@import "tailwindcss"` en `index.css`.
- **Tipografía:** sans-serif default (system-ui), `font-serif` (Georgia/Times) para títulos y texto de artículos.
- **Iconos:** Tabler Icons vía webfont (`ti ti-icon-name`). No usar emojis en la UI.
- **Animaciones:** Framer Motion para transiciones de paneles, modales, mensajes. `transition={{ duration: 0.2 }}` típico.
- **Componentes:** un archivo por componente principal. Helpers internos sin export al final del mismo archivo.

---

## 11. Próximos pasos sugeridos

En orden de impacto:

1. **Conectar Admin → Consultar:** inyectar entradas de jurisprudencia que matcheen por código/materia/artículos como contexto adicional a la IA. Permitiría citar fuentes reales en lugar de inventarlas.
2. **Cargar más códigos** (Civil, Penal, Tributario al menos).
3. **Módulo Situación concreta:** flujo guiado de 3-5 preguntas adaptativas. Reutiliza `useChat` con un system prompt distinto.
4. **Backend proxy** para la API key (Cloudflare Worker o similar).
5. **Módulo Comparar:** seleccionar 2+ artículos del Explorador → llamada IA con prompt comparativo.
6. **Módulo Mapa:** visualización de relaciones reales detectadas en los códigos (remite/complementa/deroga).
7. **Exportar conversaciones / canvas** como PDF o Word.
8. **Sistema de Favoritos** para artículos (el store ya lo tiene, falta UI en Explorador).
