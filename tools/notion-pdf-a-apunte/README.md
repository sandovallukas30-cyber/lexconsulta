# Notion (PDF) a Apunte

El conversor vive en `src/services/notionPdf/convertir_notion.py` y lo usan
dos cosas con el mismo código:

- **La app**: el botón **Importar** de Apuntes acepta un PDF exportado desde
  Notion (Imprimir > Guardar como PDF en Chrome) y lo convierte en el navegador
  (Web Worker + Pyodide + PyMuPDF; la primera vez descarga ~30 MB del CDN).
- **La línea de comandos**, para revisar o depurar un PDF:

```bash
pip install pymupdf
python src/services/notionPdf/convertir_notion.py entrada.pdf salida.md
```

## Qué reconoce

Títulos, negrita/cursiva/subrayado, texto rojo (`==`), marcador amarillo
(`++`), listas con su anidación, recuadros (`> 📝`), columnas
(`:::columnas`, también las que siguen en la página siguiente) y tablas.

## Límites

- El estilo (negrita/cursiva) sale de cómo Chrome guarda las fuentes del PDF de
  Notion; en un PDF de otra herramienta el texto se convierte igual pero sin
  esos estilos.
- Los PDF escaneados (solo imágenes) no tienen texto que convertir.
- Si la app avisa "revisá", quedaron columnas que no se pudieron armar solas:
  buscar `@@COLBREAK` en el apunte y corregirlo a mano.
