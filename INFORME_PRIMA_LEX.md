# Prima Lex — Informe del proyecto

**Autor:** Lukas Sandoval (estudiante de Derecho)
**Fecha:** mayo 2026
**Estado:** prototipo funcional en línea
**Enlace:** _(pegar aquí la URL de Vercel)_

---

## 1. Objetivo

Prima Lex es un **consultor jurídico con inteligencia artificial** orientado a la legislación chilena. Busca acercar el contenido de los códigos a dos públicos:

- **Ciudadanía:** personas sin formación jurídica que necesitan orientarse sobre una situación concreta (laboral, civil, penal, tributaria, etc.) antes de decidir si consultar a un abogado.
- **Estudiantes y profesionales del Derecho:** apoyo para localizar artículos, comparar normas, visualizar relaciones entre instituciones jurídicas y estudiar casos.

La plataforma **no reemplaza la asesoría legal profesional**. Toda respuesta entrega la cita textual del artículo aplicable para que el usuario pueda verificarla.

## 2. Códigos indexados (11)

Los textos fueron extraídos directamente de los PDF oficiales publicados por la Biblioteca del Congreso Nacional y procesados artículo por artículo:

| | Código | N.º Ley / Decreto |
|--|--|--|
| 1 | Constitución Política de la República | DTO 100 |
| 2 | Código Civil | DFL 1 / 2000 |
| 3 | Código del Trabajo | DFL 1 / 2002 |
| 4 | Código Penal | Ley de 1874 |
| 5 | Código Tributario | DL 830 |
| 6 | Código de Comercio | Ley de 1865 |
| 7 | Código de Procedimiento Civil | Ley 1.552 |
| 8 | Código Procesal Penal | Ley 19.696 |
| 9 | Código Orgánico de Tribunales | Ley 7.421 |
| 10 | Código de Minería | Ley 18.248 |
| 11 | Código de Aguas | DFL 1.122 |

Suma aproximada: **8.800 artículos**, todos indexados con búsqueda por palabra clave y navegación jerárquica (Libro → Título → Capítulo → Artículo).

## 3. Funciones disponibles

### Consultar
Chat con IA. El usuario plantea una pregunta en lenguaje natural y la IA responde citando los artículos aplicables, con enlace directo al texto del artículo en el Explorador.

### Situación concreta
Cuestionario guiado por áreas (laboral, arrendamiento, herencia, deudas, etc.). El usuario describe su caso y la IA entrega una orientación estructurada con las normas aplicables.

### Canvas jurídico
Mapa conceptual generado por IA a partir de un concepto (ej. "prescripción", "despido injustificado"). Muestra definición, caso práctico y artículos vinculantes en formato visual interactivo.

### Explorador de códigos
Lectura artículo por artículo con navegación jerárquica, búsqueda, y opción de **modernizar el lenguaje** en códigos del siglo XIX (Procedimiento Civil, Penal, Comercio) — convierte "i" conjunción → "y", "lei" → "ley", "jeneral" → "general", etc., sin alterar el contenido normativo.

### Mapa de normas
Visualización de las relaciones entre un artículo y los artículos que lo citan o son citados por él, dentro del mismo código.

### Historial
Guarda automáticamente todas las consultas (Consultar y Situación) en el navegador del usuario, permitiendo retomar conversaciones previas.

## 4. Aspectos técnicos resumidos

- **Aplicación web** accesible desde cualquier navegador moderno; no requiere instalación.
- **Datos del usuario:** no se almacenan en servidor. El historial vive únicamente en el navegador del usuario (localStorage).
- **IA:** modelos Claude de Anthropic, accedidos a través de un proxy del lado del servidor para no exponer credenciales.
- **Disclaimer visible en todo momento** en la barra superior: "Orientación educativa · No reemplaza asesoría legal profesional".

## 5. Limitaciones actuales

- No es una asesoría legal vinculante; las respuestas pueden contener errores y deben verificarse contra el texto del código.
- No incluye jurisprudencia (dictámenes de la Dirección del Trabajo, oficios del SII, sentencias de cortes). Está planificado para una siguiente etapa.
- Faltan por indexar: Código Sanitario, Código de Justicia Militar, Código de Procedimiento Administrativo y los tratados internacionales suscritos por Chile.
- El módulo "Comparar normas" está en construcción.

## 6. Próximos pasos

1. Validar con docentes y estudiantes la utilidad de los módulos actuales.
2. Incorporar jurisprudencia verificada para enriquecer las respuestas.
3. Completar los códigos faltantes.
4. Evaluar un programa de revisión periódica por estudiantes avanzados o ayudantes.

## 7. Solicitud

Se busca **retroalimentación** sobre:
- Utilidad pedagógica del prototipo para estudiantes de Derecho.
- Errores u omisiones detectadas en las respuestas.
- Funciones adicionales que serían valiosas para el alumnado o la docencia.

Cualquier observación puede dirigirse al autor.
