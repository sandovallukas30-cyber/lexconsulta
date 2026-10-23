# Numeración de incisos (ajuste «Mostrar el número de cada inciso»)

Implementación: `src/services/incisos.ts` (con pruebas en `incisos.test.ts`); los contadores CSS están en `src/index.css`
(`.incisos-numerados`).

## Reglas

1. **Inciso = cada párrafo del artículo** (lo que termina en punto aparte). Se cuentan 1, 2, 3… de corrido.
2. **Los ítems de una enumeración no son incisos.** «1º.», «2º.-», «1)», «a)», «i)» pertenecen al inciso que los
   introduce («Corresponderá, asimismo, al Presidente… la iniciativa exclusiva para:»). Se citan por su número o letra.
   El párrafo que viene después de la lista **sigue la cuenta** (es el inciso siguiente).
3. **Numerales con incisos propios.** Cuando cada numeral trae sus propios párrafos (art. 19 de la Constitución), el
   numeral es el inciso 1.º de su número y la cuenta **se reinicia en cada numeral**.
4. **Encabezados pegados al texto** («§ 2. Promulgación de la ley», «TÍTULO II», «Párrafo 2º») no son incisos: en los datos
   quedan como último párrafo del artículo anterior.

## Cómo distingue la regla 2 de la 3

Es una heurística sobre el formato: se considera «numerales con incisos propios» solo si hay **dos numerales seguidos
con guion («1º.-») que llevan párrafos debajo**. En una lista de ítems (art. 17, 32, 65 de la Constitución) solo el
último ítem puede traer un párrafo de cierre, así que no se confunde. Revisados los códigos de la app, la estructura
«numerales seguidos con cuerpo propio» aparece prácticamente solo en el art. 19 de la Constitución (y en dos artículos del
Código Tributario).

## Comprobaciones con fuentes

- **Art. 19 N.º 3, inciso 6.º** (leído por mí en el fallo). Un fallo de la Corte Suprema publicado por el Poder Judicial
  dice textualmente: «el artículo 19 N° 3, inciso sexto, le confiere al legislador la misión de definir las garantías
  de un procedimiento racional y justo». Ese es el párrafo «Toda sentencia de un órgano que ejerza jurisdicción debe
  fundarse en un proceso previo legalmente tramitado. Corresponderá al legislador establecer siempre las garantías de un
  procedimiento y una investigación racionales y justos». Contando el párrafo del propio numeral como inciso 1.º y
  reiniciando en cada número, sale el 6.º. ✔
  Fuente: https://www.pjud.cl/prensa-y-comunicaciones/getRulingNew/44297
  (otros fallos que aparecieron en la búsqueda lo citan igual: p. ej. el Rol 197.207-2023,
  https://www.diarioconstitucional.cl/wp-content/uploads/2024/02/5.1.-CS-ROL-No197.207-2023.pdf).
- **Art. 65, incisos 3.º y 4.º, números 1 y 6** (según el resumen de una búsqueda; la página no se pudo abrir). El
  requerimiento del Presidente contra el segundo retiro del 10 % invoca «los incisos tercero y cuarto, números 1 y 6, del
  artículo 65»: los numerales 1º a 6º están dentro del inciso 4.º (son ítems, no incisos). Contando así,
  «Corresponderá, asimismo, al Presidente de la República la iniciativa exclusiva para:» es el inciso 4.º. ✔
  Fuente: https://www.diarioconstitucional.cl/2020/12/18/tc-celebro-audiencia-publica-en-requerimiento-de-inconstitucionalidad-deducido-por-el-presidente-pinera-respecto-de-reforma-constitucional-que-permite-segundo-retiro-del-10-de-las-afp/
- Ese mismo párrafo del N.º 3 aparece citado como «inciso 5.º» en un artículo de 2001 (Actualidad Jurídica, UDD); no
  verifiqué por qué cambió el número desde entonces.

## Lo que NO está verificado

No encontré en línea un manual oficial chileno de técnica legislativa que defina el inciso y la numeración con estas
palabras (los manuales que aparecen son de Argentina y Perú, con jerarquías distintas). Las reglas 1–4 están
contrastadas con las citas de la Corte Suprema y del Tribunal Constitucional anteriores, no con una norma que las enuncie.
Antes de enseñarlas como regla general, conviene confirmarlas con el profesor o con la Biblioteca del Congreso Nacional.

La app avisa de esto en la propia descripción del ajuste.
