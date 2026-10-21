# Personas de prueba de Prima Lex

Las usa el agente `investigador-ux` (`.claude/agents/investigador-ux.md`). Son las que se lanzaron el 21-oct-2026 en la primera ronda de pruebas; se pueden repetir después de cada versión importante.

Reglas comunes (todas): usan solo el navegador integrado con su propia pestaña, no leen el código del repositorio, no crean cuentas ni ingresan claves o datos personales reales, no abren enlaces de correo, y abandonan cuando lo haría una persona real. Las que **escriben datos** (marcadas ✍) se lanzan **de a una**, porque todas comparten el `localStorage` del mismo origen; las demás pueden ir en paralelo.

| # | Persona | Viewport | Meta |
|---|---|---|---|
| 1 | **El apurado** | 1280×800 | Son las 8:55 y la clase empieza a las 9:00: ver el texto exacto del art. 19 n°4 de la Constitución en ≤12 acciones. |
| 2 | **El del celular** | 375×812 | En el bus, con una mano: encontrar el art. 1545 del Código Civil, dejarlo guardado y abrir Enfoque. Mide botones (<44 px), desbordes y legibilidad. |
| 3 | **El desconfiado** | 1280×800 | Antes de usar: ¿quién está detrás?, ¿qué datos guarda?, ¿cobran?, ¿el texto legal es oficial? Decide si la usaría. |
| 4 | **Mala conexión** | 1280×800 | Simula 3G con `fetch` retrasado o fallido; mide qué se descarga y qué ve el usuario mientras carga y si puede reintentar. |
| 5 | **Teclado y zoom** | 640×400 (≈200 %) | Sin ratón: Explorador → Código del Trabajo art. 10; iniciar un temporizador; abrir y cerrar un diálogo con Esc. |
| 6 | **El que no entiende** ✍ | 1280×800 | Primera vez, sin guía: cargar un ramo con profesor y horario, una tarea para el viernes y un apunte. Parte con `localStorage.clear()`. |
| 7 | **El estresado antes de una solemne** ✍ | 1280×800 | Crear ramo, evaluación con fecha, apunte, enfocar con el apunte y ver dónde queda el tiempo y cuánto falta. |
| 8 | **El del iPad** | 820×1180 y 1180×820 | Recorrer Hoy, Explorador, Mis ramos, Calendario y Enfoque midiendo desbordes, tamaños táctiles y texto <14 px. |
| 9 | **Diseñador senior perfeccionista** | 1440×900, 820×1180, 375×812; claro y oscuro | Auditar toda la UI/UX: jerarquía, tipografía, espaciado, color y contraste, consistencia, estados y microcopy. |

Límites conocidos: son modelos interpretando un papel, no usuarios reales (no dicen cuántos se irían de verdad); el navegador integrado no es táctil ni limita la red ni la CPU; con el panel oculto se pausan las animaciones y `requestAnimationFrame` (mostrar el panel antes de medir); nada de lo que está detrás del ingreso con cuenta se puede probar sin credenciales.

Formato de entrega de cada persona: resultado (logró / a medias / abandonó y por qué), cronología breve, problemas con gravedad 1–4 (1 cosmético, 4 bloqueante) con pantalla, qué pasó, qué esperaba y evidencia, y lo que funcionó bien.
