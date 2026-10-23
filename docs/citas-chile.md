# Cómo se cita un artículo en Chile (botón «Citar» del Explorador)

Implementación: `src/services/citas.ts` (`citaPrecisa`, `frasesConCita`) y `src/services/incisos.ts` (`ubicacionDeParrafo`).
Al seleccionar texto de un artículo aparece **Citar**: copia `«frase» (art. 1445 inc. 2° CC)`.

## Formato que usa la app

| Caso | Cita |
|---|---|
| Artículo de un código | `art. 1545 CC` |
| Inciso | `art. 1445 inc. 2° CC` |
| Número (lista de ítems bajo el inciso 1) | `art. 17 N° 2 CPR` |
| Número bajo un inciso posterior | `art. 65 inc. 4° N° 6 CPR` |
| Número con incisos propios (art. 19) | `art. 19 N° 3 inc. 6° CPR` |
| Letra | `art. 52 N° 1 letra a) CPR` |
| Ley | `art. 23 Ley 19.620` |

- En el texto corrido la cita va **entre paréntesis y en minúscula** después de la frase.
- El inciso se omite si el artículo tiene uno solo, o si es el 1.º de una lista de ítems o de un número.
- Orden: artículo → inciso → número → letra; con numerales que traen incisos propios (art. 19) el **número va antes** del
  inciso, porque el inciso se cuenta dentro del número (ver `numeracion-incisos.md`).

## Fuentes consultadas

- **Hernán Corral, «Documento sobre Citas y Referencias para Trabajos de Investigación y Tesis»** (Universidad de los
  Andes, 2017). Dice que los textos normativos se citan en el texto principal, entre paréntesis, y que se pueden usar
  abreviaturas de uso frecuente («CC = Código Civil; CCom = Código de Comercio; CPol = Constitución Política»).
  Ejemplos textuales: «(art. 23 Ley N° 19.620)», «(arts. 1562 y 1546 CC)», «(art. 19 N° 1 Const.)».
  https://www.uandes.cl/images/noticias/2017/Abril/10/INSTRUCTIVO%20CITAS.pdf
- **Revista Chilena de Derecho (PUC), «Cómo citar según la Revista Chilena de Derecho»** y sus normas editoriales. Para el
  listado final de «Normas citadas»: `LEY N° 20.066 (22/09/2005)`, `CÓDIGO CIVIL (01/01/1857)`,
  `CÓDIGO DE COMERCIO (23/11/1865)`; y un ejemplo en el texto: «artículo 27 letra a) de la ley 19.913».
  https://comunicacionacademica.uc.cl/images/recursos/espanol/escritura/recurso_en_pdf_extenso/RE_Cmo-citar-segn-la-Revista-Chilena-de-Derecho.pdf
  https://revistas.uc.cl/files_rev/rchd/Normas_Edit_RChD_2020.06.19.pdf
- **Orden inciso/número** (comprobado con jurisprudencia, ver `numeracion-incisos.md`): la Corte Suprema cita «artículo 19
  N° 3, inciso sexto» (número primero, inciso contado dentro del número) y un requerimiento al Tribunal Constitucional invoca
  «los incisos tercero y cuarto, números 1 y 6, del artículo 65» (inciso primero, número después).
- La Biblioteca del Congreso Nacional ofrece en leychile.cl el botón **«Citar esta norma»**; no pude ver los formatos que genera.

## Lo que NO está respaldado por una norma

- **«CPR»** como abreviatura de la Constitución es de uso corriente entre estudiantes y en la jurisprudencia, pero las
  fuentes anteriores usan «Const.» o «CPol». Los demás (CC, CCom, CP, CPC, CPP, COT, CT) siguen la misma práctica.
- **«inc.» con «°»** (inc. 2°) es la forma abreviada habitual; las fuentes consultadas no fijan una abreviatura para inciso.
- No encontré un manual oficial único de citas jurídicas chilenas: cada facultad y revista tiene el suyo. Si tu facultad exige
  otro formato (por ejemplo «inciso segundo» completo o la nota con fecha de publicación de la norma), conviene ajustarlo.
