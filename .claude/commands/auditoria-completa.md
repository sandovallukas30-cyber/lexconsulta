---
description: Auditoría completa de Prima Lex con todos los agentes especializados y una sola lista final priorizada
---
Haz una auditoría completa de Prima Lex y entrégame **una sola lista** de problemas, sin duplicados. Antes de lanzar nada, dime en dos líneas qué vas a correr y el costo aproximado (cada agente navega y toma capturas: es una operación cara), y espera mi confirmación. Contexto: `CLAUDE.md` y `docs/pruebas/personas.md`.

Por defecto audita la **web publicada** (https://primalex.vercel.app). Primero comprueba que la versión publicada es la última (agente `verificador-realidad`, punto 3), porque los despliegues tardan 8-13 minutos.

## Fases (los agentes comparten el navegador y su `localStorage`: respeta el orden)
1. **En paralelo (solo leen):** `auditor-accesibilidad`, `revisor-acabado-ui`, `revisor-datos-legales`, `revisor-cumplimiento-chile`, `revisor-seguridad` e `investigador-ux` con las personas 1, 2, 3, 4, 5, 8 y 9 de `docs/pruebas/personas.md`.
2. **De a uno (escriben datos):** `investigador-ux` con las personas 6 y 7. Cada una parte limpiando el almacenamiento, así que no pueden correr a la vez entre sí ni con otras.
3. **Solo (mide tiempos):** `auditor-rendimiento`, cuando no haya otros agentes usando el navegador.
4. **Verificación:** para cada hallazgo de gravedad 3 o 4 que no tenga evidencia clara, `recolector-evidencia` lo reproduce o lo descarta.

## Lista final
Un solo informe, en español, ordenado por impacto. Cada hallazgo: número, gravedad (1-4), pantalla/viewport, qué pasa, evidencia, quién lo encontró y **estado**: `ARREGLAR YA` o `ESPERA EL DISEÑO` del usuario (Claude Design). Cierra con: lo que funcionó bien, lo que no se pudo probar (dispositivos reales, cuentas, lectores de pantalla) y los cinco cambios de mayor retorno. Guárdalo en `docs/pruebas/informe-AAAA-MM-DD.md`.

No arregles nada durante la auditoría. Los arreglos se hacen después, por tandas, y cada una termina con `verificador-realidad`.
