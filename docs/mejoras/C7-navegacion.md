# Auto-revisión — C7 Navegación: volver, memoria, atajos, ir al artículo y cita

## Qué se hizo

- **Ir al artículo N** (`services/buscarEnCodigo.ts`).
  - Ids tolerantes: `183a`, `183-A`, `art 183 a`, `artículo 4° bis`, `4bis`, `1o` y `3 transitorio`. Todos resuelven al id real del JSON (`Art. 183-A`, `Art. 183 A`, `Art. 4 bis`…). Con Enter se abre el exacto, marcado "↵ Ir al artículo".
  - Con un número solo (`183`), los `183 A`, `183 B`… aparecen en orden y las menciones del número en otros artículos quedan al final.
- **Búsqueda de texto en el código**, sin tildes ni mayúsculas (`prescripcion` encuentra "prescripción").
  - El resultado muestra el fragmento con la coincidencia marcada.
  - Al abrir el artículo, la coincidencia queda resaltada (CSS Custom Highlight API, compartida con el Modo Lectura en `services/resaltado.ts`).
  - Costo: 6 teclas en el Código Civil (2.566 artículos) toman ~40 ms en total, con el texto normalizado en caché por artículo.
- **Copiar con cita**.
  - El portapapeles recibe "Art. 1545 CC", el texto oficial (sin modernizar) y la fuente con la URL de la BCN.
  - Abreviaturas usuales: CPR, CC, CT, CP, CTrib, CCom, CPC, CPP, COT…; las leyes se citan por su número, p. ej. "Ley 19.496".
  - Si no hay permiso de portapapeles, usa un método de respaldo; si también falla, muestra un aviso de error.
- **Volver** (`services/navegacion.ts` + `BotonVolver`): una pila de lugares (vista + módulo o código abierto) alimentada con `useStore.subscribe`, así cubre todas las formas de cambiar de vista. El botón está en la barra del Explorador y en las migas del módulo ("Todos los módulos" · "← Explorador · Código Civil").
- **Memoria**:
  - Última vista, módulo y código abiertos: persistidos, migración v32.
  - Último artículo leído de cada código: `ultimoArticuloExplorador`.
  - Scroll de cada vista: se captura antes de que React pinte la vista nueva y se restaura con reintentos. Se guarda en `sessionStorage`, así sobrevive a recargar.
- **Panel de atajos** con `?` (no se abre si se está escribiendo). Lista solo atajos que existen en el código.

## Prompt de revisión

1. ¿"183a", "183-A" y "art. 183 A" llevan al mismo artículo? ¿Y "4bis", "1o", "3 transitorio"?
2. ¿"prescripcion" (sin tilde) encuentra "prescripción"? ¿Se ve dónde aparece?
3. ¿Al volver a un código se retoma el artículo en que se estaba, aunque entretanto se haya abierto otro código?
4. ¿El botón Volver lleva al lugar exacto (el mismo módulo, no la lista)?
5. ¿Los atajos chocan entre sí (Ctrl+K, Ctrl+B)?
6. ¿Qué queda en el portapapeles? ¿Sirve para pegar en un escrito?
7. ¿Después de recargar se vuelve a la misma vista y al mismo artículo?

## Casos probados (Playwright, claro/oscuro, 375 y 1280 px)

- `183a` en el Código del Trabajo → primer resultado `Art. 183-A` con "↵ Ir al artículo"; Enter lo abre. ✔
- `prescripcion adquisitiva` en el Código Civil → 50 resultados con `<mark>`; al abrir el Art. 2505, `CSS.highlights` tiene la coincidencia. ✔
- Copiar con cita → `"Art. 2505 CC\n\nContra un título inscrito…\n\nFuente: Código Civil — DFL 1 de 2000 (texto refundido). https://www.bcn.cl/leychile/navegar?idNorma=172986"` y aviso "Copiado: Art. 2505 CC". ✔
- Trabajo (183-A) → Civil (2505) → Trabajo → **183-A** → Civil → **2505**. ✔ (tras las correcciones 1 y 6)
- Módulo "Derecho Civil I" → Ver código → "Volver a Derecho Civil I" → vuelve a `modulos:r1`. ✔
- Lista de módulos con scroll 500 → Colecciones → Módulos: scroll 500. ✔
- Recargar con el Art. 1545 abierto → vuelve al Explorador en el Art. 1545; sin historial no aparece "Volver". ✔
- `?` abre el panel (sin desborde a 375 px); Esc lo cierra; `?` dentro de un campo de texto no lo abre. ✔
- Ctrl+K en el Explorador abre solo su buscador (la Omnibar sigue cerrada). ✔

## Hallazgos reales

1. **El último artículo se pisaba**: al cambiar de código, la selección anterior ("Art. 3" del Civil) seguía valiendo en el código nuevo si este también tenía un Art. 3, y se guardaba como su último artículo. Ahora la selección va asociada a su código.
2. **Ctrl+K abría dos buscadores a la vez** en el Explorador (el del código y la Omnibar global). El del Explorador ahora corre en captura y detiene el global.
3. **Ctrl+B en el campo de un apunte** ponía la negrita y además colapsaba el menú lateral. El menú ahora respeta `defaultPrevented`.
4. La fuente copiada tenía paréntesis dobles: "(DFL 1 de 2000 (texto refundido))".
5. En móvil la miga "Código Civil" se partía en dos líneas.
6. **`useCodigo` entregaba por un render el código ANTERIOR** al cambiar de código. Eso causaba el hallazgo 1 aun con la selección corregida, porque se elegía el Art. 1 del código viejo. Ahora nunca devuelve un código distinto del pedido.

## Decisiones

- "Volver" aparece también tras navegar con el menú lateral (p. ej. "← Consultar"). Es el mismo modelo del botón Atrás del navegador y no cuesta nada ocultarlo si molesta (`ocultarSi`).
- Migración v32 sin transformación: solo se agregan claves persistidas. Se sube la versión igual para seguir la regla de una versión por cambio de persistencia.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Resaltar la coincidencia también en el artículo abierto | bajo | Implementada |
| Retomar el último artículo por código | bajo | Implementada |
| Integrar "Volver" con el botón Atrás del navegador/celular (`history.pushState`) | medio | Propuesta |
| Pista visible "? Atajos" en la Omnibar y en Configuración | bajo | Propuesta |
| Formato de cita configurable (larga: "artículo 1545 del Código Civil") | bajo | Propuesta |

Segunda pasada (6 hallazgos): se repitió el recorrido completo en claro/oscuro, a 375 y 1280 px; todos los casos pasan. Además se comparó el lint de toda la rama contra `main` con un script que sí compara (`-f json`; el formateador `unix` usado antes ya no existe en ESLint 9 y la comparación salía vacía): **0 problemas nuevos** (111 → 108 en los archivos tocados; se corrigió un aviso de dependencias del Sidebar que venía de C6).
