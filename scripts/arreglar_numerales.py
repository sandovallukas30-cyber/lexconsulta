"""Separa numerales (2º.- ...) que quedaron pegados al final del anterior en los textos legales.
Opera sobre el JSON ya cargado, así que no depende de cómo se escriban los saltos de línea."""
import json
import re
import sys

PATRON = re.compile(r'([;:.,]) +(\d{1,2}[º°]\.-)')

for ruta in sys.argv[1:]:
    with open(ruta, encoding='utf-8') as f:
        crudo = f.read()
    datos = json.loads(crudo)
    cambios = 0
    for art in datos['articulos']:
        nuevo, n = PATRON.subn(lambda m: m.group(1) + '\n\n' + m.group(2), art['t'])
        if n:
            art['t'] = nuevo
            cambios += n
    # misma sangría que el original
    sangria = 2 if '\n  "' in crudo[:400] else None
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(datos, f, ensure_ascii=False, indent=sangria)
        f.write('\n')
    print(ruta, cambios)
