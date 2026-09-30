# Auto-revisión — A. Carga de 30 leyes

## Prompt de revisión (meta-prompt)

Revisa la carga de las 30 leyes como un estudiante que busca "la ley de arriendo" desde el celular, y como un revisor que desconfía de todo texto legal generado por un script:

1. ¿El texto de cada artículo es el vigente y es literal? ¿Quedaron anotaciones al margen ("Ley 19.653 / Art. 1º Nº 1 / D.O. 14.12.1999"), números de página o caracteres `�`?
2. ¿Cuando la ley tiene texto refundido por DFL, se cargó el DFL (vigente) y no la ficha original congelada?
3. ¿Un usuario con datos v28 ve las leyes nuevas sin perder su selección de códigos activos?
4. ¿Qué pasa con artículos con vigencia diferida (fecha futura o la comodín 2222-02-02 de la BCN)?
5. ¿Con 54 normas, sigue siendo usable el selector del Explorador? ¿Se encuentra "Tránsito" sin recorrer 30 tarjetas?
6. ¿Cuánto tarda la primera consulta a la IA ahora que hay 53 normas activas por defecto?
7. ¿Qué ve el usuario a 375 px?
8. ¿Qué haría que un estudiante no confíe en estas leyes? (ej. "Art. único: Fíjase el texto refundido…" como primer artículo)

## Casos límite probados

- Migración: estado v28 con 24 códigos y el Penal desactivado → v29 con 54 códigos, Penal sigue desactivado, Consumidor activo. ✔
- Control de calidad (`scripts/verificar_leyes.mjs --estricto`) sobre las 30: 0 errores. ✔
- 150 artículos al azar (5 por ley) contrastados automáticamente contra el XML de origen (inicio y final de cada artículo): 150/150. Revisión a ojo de 6 (Propiedad Industrial art. 31, Estatuto Administrativo art. 67, Matrimonio Civil art. 41, Tránsito art. 75, Ley Indígena art. 51, Copropiedad art. 82): texto e incisos correctos. ✔
- Ley 18.216: la BCN conserva la versión derogada de los arts. 10–12 junto a los vigentes → se descarta la derogada. ✔
- Ley 14.908: su texto vigente está en el art. 7° del DFL 1/2000 (el mismo del Código Civil) → se extrae solo ese doble articulado. ✔

## Hallazgos reales

1. **DFL como primer artículo**: en Consumidor, Tránsito y Propiedad Industrial el primer "artículo" era el del DFL ("Fíjase el siguiente texto refundido…"), que no es parte de la ley y descuadraba el total. → `--sin-envoltorio`.
2. **Cabeceras sin quitar**: "Artículo 54 Ñ.-" (letra Ñ), "Art. 12 El requerimiento…" (sin separador) y "Art�culo 154°" (carácter dañado ANTES de la cabecera). → cabecera derivada del propio número del artículo y reparación de `�` antes de limpiar.
3. **Anotaciones al margen partidas** en varias líneas o pegadas a una palabra ("reincidaLey N° 19.996"). → reglas de línea completa y limpieza final del patrón `… D.O. dd.mm.aaaa`.
4. **Selector del Explorador**: 44 leyes especiales en una grilla sin búsqueda; cada tarjeta decía "Sin datos" hasta abrirla (parece un error); la animación escalonada hacía aparecer la última tarjeta 1 s después.
5. **Primera consulta más lenta**: con 53 normas activas, la primera búsqueda construye 53 índices (≈1,3 s en dev, luego 13 ms) y precarga ≈16 MB de JSON (≈2,7 s en dev local).
6. **Filtro por subcadena** traía falsos positivos ("pacto" → "impacto ambiental").

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Filtro por nombre/número en el selector (sin tildes, "19496" = "19.496", por inicio de palabra) | bajo | Implementada |
| Mostrar la norma ("Ley 19.496 (texto refundido…)") en vez de "Sin datos" y precargar el JSON al pasar el mouse/enfocar la tarjeta | bajo | Implementada |
| Construir los índices de búsqueda en un Web Worker y por demanda (no los 53 en la primera consulta) | alto | Propuesta |

Segunda pasada (≥ 3 hallazgos): se repitió la revisión tras las correcciones → sin cabeceras remanentes, sin `D.O.` remanentes, 150/150 en la muestra y el filtro no trae falsos positivos con "pacto", "18.290" o "transito". Quedan como advertencias antiguas (no de este lote) los saltos de numeración de códigos ya cargados antes (Comercio 530→532, etc.).
