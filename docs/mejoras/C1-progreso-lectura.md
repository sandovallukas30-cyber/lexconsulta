# Auto-revisión — C1 Progreso de lectura

## Prompt de revisión

Revisa el progreso de lectura como alguien que lee un apunte de 7.000 palabras en tres sesiones (una en el celular):

1. ¿El % y los minutos restantes son coherentes (200 palabras/min) y se ven en el celular?
2. ¿El índice marca la sección que realmente estoy leyendo, también tras cambiar el tamaño de letra?
3. ¿"Volver arriba" aparece recién pasados 600 px y no tapa el índice?
4. Al reabrir, ¿se ofrece "Retomar" (y no se salta solo)? ¿Desaparece si empiezo a leer por mi cuenta? ¿Si vengo del buscador, manda la coincidencia y no la posición?
5. ¿Qué pasa con un apunte corto que no tiene scroll? ¿Y al terminar de leerlo (no debería ofrecer retomar al 99 %)?
6. ¿Los usuarios con posiciones guardadas en la versión anterior (claves sueltas en `localStorage`) las conservan?
7. ¿En el Explorador sirve la misma barra? (los artículos se leen de a uno)
8. ¿El guardado de la posición escribe en cada evento de scroll?

## Casos límite probados

- Apunte de 7.200 palabras al 42 %: "42% · 22 min restantes · Sección 17", la Sección 17 marcada en el índice (`aria-current=location`), "Volver arriba" visible. ✔
- Cerrar y reabrir: aviso "Ibas en el 42% · Retomar"; Retomar → 42 %. ✔
- Migración v30→v31 con `prima-lex-apunte-scroll:a1=0.5` y `a2=0.99`: queda `a1: 0.5`; `a2` (terminado) se descarta y las claves viejas se borran. ✔
- Apunte sin scroll: no hay barra de %, ni aviso de retomar. ✔ (por `desplazable`)
- Explorador: barra de posición (artículo 5 de 165), al pasar al siguiente el scroll vuelve a 0; en Modo Lectura la barra del artículo llega a 100 al final. ✔
- Guardado de la posición: agrupado (500 ms sin cambios), no por evento. ✔

## Hallazgos reales

1. A 375 px el encabezado del lector tiene 7 botones: el texto "% · min restantes · sección" quedaba reducido a "~…" y el título a 3 letras.
2. La lectura en voz alta ocupa ~80 px del encabezado en móvil, donde se usa poco.
3. (Diseño) Antes la posición se restauraba sola al abrir: un apunte abierto para buscar algo al inicio saltaba a la mitad sin avisar. Ahora se ofrece "Retomar".

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Línea propia "% · min restantes · sección" bajo la barra en móvil | bajo | Implementada |
| Ocultar el control de voz en móvil (queda en ≥ 640 px) | bajo | Implementada |
| Índice fijo al costado en pantallas ≥ 1280 px (hay que convivir con las notas al margen) | medio | Propuesta — choca con `NotasMargen`, que usa el mismo margen |
| Sincronizar la posición entre dispositivos | alto | Propuesta (requiere backend) |

Segunda pasada: a 375 px la línea "31% · 26 min restantes · Sección 13" se ve completa bajo la barra; sin desbordes.
