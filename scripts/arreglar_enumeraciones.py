"""Separa enumeraciones (a) b) c) / 1.- 2.- 3.- / 1) 2) 3) / 1º 2º 3º) que quedaron pegadas en un mismo párrafo.

Regla conservadora para no tocar referencias cruzadas como «las letras b), c) y d)»:
 - la corrida debe tener al menos 3 marcadores consecutivos (a, b, c / 1, 2, 3...);
 - el primero va al inicio del párrafo o tras «: » / «. », y cada siguiente tras «; », «, », «. » o «: »;
 - cada marcador debe tener texto propio de al menos 12 caracteres hasta el siguiente.
Uso:  python scripts/arreglar_enumeraciones.py [--aplicar] [archivo.json ...]
Sin --aplicar solo muestra lo que cambiaría."""
import glob
import json
import os
import re
import sys

LETRAS = 'abcdefghijklmnopqrstuvwxyz'
FORMAS = {
    'letra)': (lambda i: f'{LETRAS[i]})', 26),
    'num.-': (lambda i: f'{i + 1}.-', 40),
    'num)': (lambda i: f'{i + 1})', 40),
    'num°': (lambda i: f'{i + 1}º', 40),
}


def separar_parrafo(p):
    """Devuelve (texto nuevo, cantidad de cortes)."""
    cortes = 0
    for nombre, (marca, tope) in FORMAS.items():
        i = 0
        while i < tope - 1:
            # ¿hay una corrida que empieza en el marcador i?
            pos = []
            actual = i
            inicio = -1
            while actual < tope:
                m = marca(actual)
                patron = re.compile(r'(?:(?<=^)|(?<=[:.;,] )|(?<=[;,] y ))' + re.escape(m) + r' ')
                # el siguiente marcador debe estar después del anterior
                desde = pos[-1] + 1 if pos else 0
                encontrado = None
                for mm in patron.finditer(p, desde):
                    previo = p[max(0, mm.start() - 2):mm.start()]
                    if not pos:
                        # primero: inicio de párrafo o tras «: » / «. »
                        if mm.start() == 0 or previo in (': ', '. '):
                            encontrado = mm.start()
                            break
                    else:
                        encontrado = mm.start()
                        break
                if encontrado is None:
                    break
                pos.append(encontrado)
                actual += 1
            if len(pos) >= 3 and all(pos[k + 1] - pos[k] >= 12 for k in range(len(pos) - 1)):
                # cortar antes de cada marcador, de atrás hacia adelante (el inicio de párrafo no necesita corte)
                for q in reversed(pos):
                    if q == 0:
                        continue
                    if p[max(0, q - 2):q] == '\n\n':
                        continue
                    p = p[:q].rstrip(' ') + '\n\n' + p[q:]
                    cortes += 1
                i += len(pos)
            else:
                i += 1
    return p, cortes


def main():
    aplicar = '--aplicar' in sys.argv
    archivos = [a for a in sys.argv[1:] if not a.startswith('--')] or sorted(glob.glob('src/data/*.json'))
    total = 0
    for ruta in archivos:
        try:
            with open(ruta, encoding='utf-8') as f:
                crudo = f.read()
            datos = json.loads(crudo)
        except Exception:
            continue
        if not isinstance(datos, dict) or 'articulos' not in datos:
            continue
        cambios = 0
        for art in datos['articulos']:
            partes = art.get('t', '').split('\n\n')
            nuevas = []
            n_art = 0
            for parte in partes:
                nueva, n = separar_parrafo(parte)
                n_art += n
                nuevas.append(nueva)
            if n_art:
                if not aplicar and cambios < 2:
                    print(f"  {os.path.basename(ruta)} {art.get('a')}: {n_art} cortes")
                art['t'] = '\n\n'.join(nuevas)
                cambios += n_art
        if cambios:
            print(f'{os.path.basename(ruta)}: {cambios} cortes')
            total += cambios
            if aplicar:
                sangria = 2 if '\n  "' in crudo[:400] else None
                with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
                    json.dump(datos, f, ensure_ascii=False, indent=sangria)
                    f.write('\n')
    print(f'TOTAL {total} cortes ' + ('(aplicados)' if aplicar else '(simulación)'))


main()
