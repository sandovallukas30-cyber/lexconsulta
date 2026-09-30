# Auto-revisión — B5 Repaso por reglas

## Prompt de revisión

Revisa el modo repaso como un estudiante que estudia para un control con un apunte de 80 definiciones, y como alguien que conoce la repetición espaciada:

1. ¿Qué tarjetas genera un apunte con `**Término**: def` (dos puntos fuera), definiciones de varias líneas, puntos numerados, un término sin definición, recuadros de varias líneas y recuadros 📝 (no deben contar)?
2. ¿Qué pasa con un apunte sin ninguna tarjeta?
3. Si fallo una tarjeta y la acierto 3 tarjetas después, ¿vuelve mañana o se va a 3 días? (debería volver mañana)
4. ¿Editar el apunte borra el progreso de las tarjetas que no cambiaron?
5. ¿80 tarjetas de una vez es usable? ¿Se abandona a la mitad?
6. ¿Se puede usar solo con teclado? ¿Y con el pulgar a 375 px?
7. ¿El progreso sobrevive a una recarga y está en el respaldo?
8. ¿Al voltear se pierde de vista la pregunta?

## Casos límite probados

- Generador: `**Contrato**: …` con continuación en línea con tab → reverso de 2 líneas; `1. **Nulidad:** sanción` → tarjeta; `- **Deudor:**` vacío → se omite; `- sin negrita` → nada; recuadro 💡 de 2 líneas → idea clave con la sección "Contratos" como frente. ✔
- Apunte sin tarjetas → pantalla que explica la sintaxis con un ejemplo. ✔
- Estado persistido (v30) y en el respaldo JSON. ✔
- 375 px oscuro: botones de 52 px de alto, sin desborde. ✔

## Hallazgos reales

1. **Error de programación**: fallar una tarjeta y acertarla más adelante en la misma sesión la subía a caja 2 (vuelve en 3 días): "no la sabía" nunca volvía mañana. Ahora solo la primera respuesta de la sesión cuenta.
2. Al voltear se veía solo la respuesta, sin el término: se pierde la asociación.
3. Resumen confuso ("Sabías 3 · 1 para reforzar" cuando eran 3 tarjetas y una se falló) y "Repasar las 1 falladas".
4. La definición solo tomaba la primera línea (se perdían continuaciones con sangría).
5. Sesión de 80 tarjetas seguidas.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Frente visible sobre la respuesta al voltear | bajo | Implementada |
| Sesiones de 20 tarjetas con "Seguir (N para hoy)" | bajo | Implementada |
| Repasar todas las tarjetas pendientes de un ramo (varios apuntes a la vez) desde el Dashboard "Hoy" | medio | Propuesta |
| Tarjetas "cloze" (`{{c1::texto}}` por reglas) | medio | Propuesta |

Segunda pasada: secuencia fallar→acertar deja la tarjeta en caja 1 con 1 fallo (`[1,0,1]`), resumen "Sabías 2 de 3 a la primera · 1 para reforzar (vuelve mañana)", botón "Repasar la fallada".
