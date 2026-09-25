# Notion (PDF) a Apunte

Convierte una página de Notion exportada a PDF en un archivo `.md` que se
importa directo en **Módulos > Apuntes > Importar** (sintaxis en
`src/services/apunteFormato.ts`).

```bash
pip install pymupdf
python tools/notion-pdf-a-apunte/convertir.py entrada.pdf salida.md \
  --asignatura "NOMBRE DEL CURSO" --ignorar "Course" --ignorar "NOMBRE DEL CURSO"
```

`--ignorar` descarta líneas exactas de la primera página (las propiedades de
la página de Notion, como "Course" y su valor). `--asignatura` agrega una
primera línea `**Asignatura:** ...`.

## Qué reconoce

- Títulos por tamaño de letra (`#`, `##`, `###`).
- Negrita, cursiva, subrayado, texto rojo (`==`) y marcador amarillo (`++`)
  por fuente/color del PDF.
- Listas con viñetas y numeradas, con su nivel de anidación.
- Recuadros (callouts) de Notion como `> 📝 ...`.
- Columnas de Notion como `:::columnas ... :::col ... :::` (cuando arrancan y
  terminan en la misma página).

## Qué hay que revisar a mano

- **Tablas**: no se detectan; salen como líneas sueltas. Reescribirlas con
  `| a | b |` y `|---|---|`.
- **Columnas que cruzan un salto de página**: el script avisa
  ("no se pudieron cerrar solos") y deja marcas `@@COLBREAK`. Hay que mover el
  contenido de cada columna a su lugar.
- El mapeo de fuentes (negrita/cursiva) depende de cómo Chrome guarda las
  fuentes del PDF de Notion; si un PDF viene de otra herramienta, la negrita
  puede no detectarse.
- Comparar el resultado con el PDF (ver el apunte en Modo Lectura al lado del
  PDF) antes de darlo por bueno.
