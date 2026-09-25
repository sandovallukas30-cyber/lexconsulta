"""Convierte un PDF exportado desde Notion (Imprimir > Guardar como PDF en Chrome)
a la sintaxis de Apuntes de Prima Lex (ver src/services/apunteFormato.ts).

Se usa de dos formas con este mismo archivo:
  - En la app (botón Importar de Apuntes), dentro de un Web Worker con Pyodide
    + PyMuPDF (ver notionPdfWorker.ts).
  - Por línea de comandos:
        python convertir_notion.py entrada.pdf salida.md [--asignatura "TEXTO"] [--ignorar "Course" ...]
    (requiere `pip install pymupdf`, versión 1.28 o similar).

Notion/Chrome guardan cada estilo como una fuente Type3 distinta ("Type3 (10 0 R)"):
de ahí se saca negrita/cursiva. El color y el fondo salen de los dibujos y del
color del texto. Si el PDF viene de otra herramienta, el texto se convierte
igual pero sin esos estilos.
"""
import re
import sys

import pymupdf

RED = 0xCF5148
YEL = (0.8275, 0.6588, 0.0)
CALLOUT = (0.9765, 0.9529, 0.8627)
BORDE = (0.2157, 0.2078, 0.1843)
CABECERA_TABLA = (0.9686, 0.9647, 0.9529)
EMOJI = re.compile(r"^[\U0001F300-\U0001FAFF☀-➿]️?")
PLANO = re.compile(r"[*=_+~]")
NEUTRO = (False, False, False, False, False)


def close(a, b, tol=0.02):
    return a is not None and all(abs(x - y) < tol for x, y in zip(a, b))


def fuente(font, size):
    """(estilo, nivel_titulo): estilo 'b' negrita, 'i' cursiva, 'n' normal."""
    n = re.search(r"\((\d+) 0 R\)", font)
    n = int(n.group(1)) if n else -1
    if size > 20:
        return "n", 1
    if 14 < size < 17:
        return "n", 2
    if 12 < size < 14:
        return "n", 3
    if abs(size - 8.9) < 0.3:
        return ("b" if n == 40 else "n"), 0
    if n in (10, 11):
        return "b", 0
    if n == 28:
        return "i", 0
    return "n", 0


def envolver(core, estilo):
    neg, cur, subr, rojo, amar = estilo
    if neg:
        core = f"**{core}**"
    if cur:
        core = f"~{core}~"
    if subr:
        core = f"__{core}__"
    if rojo:
        core = f"=={core}=="
    if amar:
        core = f"++{core}++"
    return core


def runs_a_texto(runs):
    runs = list(runs)
    for i, (t, e) in enumerate(runs):
        if t.strip() == "":
            prev = runs[i - 1][1] if i > 0 else None
            nxt = runs[i + 1][1] if i + 1 < len(runs) else None
            runs[i] = (t, prev if (prev is not None and prev == nxt) else NEUTRO)
    fusion = []
    for t, e in runs:
        if fusion and fusion[-1][1] == e:
            fusion[-1] = (fusion[-1][0] + t, e)
        else:
            fusion.append((t, e))
    out = []
    for t, e in fusion:
        if t.strip() == "" or e == NEUTRO:
            out.append(t)
            continue
        lead = t[: len(t) - len(t.lstrip())]
        trail = t[len(t.rstrip()):]
        out.append(lead + envolver(t.strip(), e) + trail)
    return "".join(out)


def limpiar(t):
    prev = None
    while prev != t:
        prev = t
        t = t.replace("++ ++", " ").replace("** **", " ").replace("== ==", " ").replace("__ __", " ").replace("~ ~", " ")
    # texto rojo dentro de una negrita larga: **a (**==**x**==**) b** -> **a (==x==) b**
    return re.sub(r"\*\*([^*\n]*?)\*\*==\*\*([^*\n]*?)\*\*==\*\*([^*\n]*?)\*\*", r"**\1==\2==\3**", t)


# ---------------------------------------------------------------------------
# Tablas: rejilla de rectángulos finos oscuros (los bordes que dibuja Chrome)
# ---------------------------------------------------------------------------

def detectar_tablas(dr):
    verticales = [d["rect"] for d in dr if close(d.get("fill"), BORDE) and d["rect"].width <= 1.0 and 8 < d["rect"].height < 400]
    horizontales = [d["rect"] for d in dr if close(d.get("fill"), BORDE) and d["rect"].height <= 1.0 and 20 < d["rect"].width < 460]
    lineas = verticales + horizontales
    grupos = []
    for r in lineas:
        caja = pymupdf.Rect(r.x0 - 2, r.y0 - 2, r.x1 + 2, r.y1 + 2)
        unidos = [g for g in grupos if g["caja"].intersects(caja)]
        nuevo = {"caja": caja, "v": [], "h": []}
        (nuevo["v"] if r in verticales else nuevo["h"]).append(r)
        for g in unidos:
            nuevo["caja"] |= g["caja"]
            nuevo["v"] += g["v"]
            nuevo["h"] += g["h"]
            grupos.remove(g)
        grupos.append(nuevo)
    tablas = []
    for g in grupos:
        xs = sorted({round(r.x0) for r in g["v"]})
        ys = sorted({round(r.y0) for r in g["h"]})

        def fusionar(vals):
            res = []
            for v in vals:
                if res and v - res[-1] <= 2:
                    continue
                res.append(v)
            return res

        xs, ys = fusionar(xs), fusionar(ys)
        if len(xs) >= 2 and len(ys) >= 2:
            encabezado = any(close(d.get("fill"), CABECERA_TABLA) and abs(d["rect"].y0 - ys[0]) < 3 for d in dr)
            tablas.append({"caja": g["caja"], "xs": xs, "ys": ys, "encabezado": encabezado})
    return tablas


def celda_de(tabla, x, y):
    col = max((i for i, v in enumerate(tabla["xs"]) if x >= v - 2), default=0)
    fila = max((i for i, v in enumerate(tabla["ys"]) if y >= v - 2), default=0)
    return fila, col


# ---------------------------------------------------------------------------
# Conversión
# ---------------------------------------------------------------------------

def convertir(ruta_pdf, asignatura="", ignorar=(), progreso=None):
    """Devuelve {"titulo": str | None, "md": str, "avisos": [str]}."""
    doc = pymupdf.open(ruta_pdf)
    avisos = []
    recs = []
    tablas_por_pagina = {}
    for pi, page in enumerate(doc):
        if progreso:
            progreso(pi + 1, len(doc))
        dr = page.get_drawings()
        amarillos = [d["rect"] for d in dr if close(d.get("fill"), YEL) and 10 < d["rect"].height < 16]
        callouts = [d["rect"] for d in dr if close(d.get("fill"), CALLOUT) and d["rect"].height > 20]
        bullets = [d["rect"] for d in dr if 2.5 < d["rect"].width < 4 and 2.5 < d["rect"].height < 4]
        finas = [d["rect"] for d in dr if d["rect"].height <= 1.0 and 5 < d["rect"].width < 440]
        tablas = detectar_tablas(dr)
        tablas_por_pagina[pi + 1] = tablas
        prev_y = None
        prev_x0 = None
        prev_x1 = None
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = list(l["spans"])
                if not "".join(s["text"] for s in spans).strip():
                    continue
                if abs(spans[0]["size"] - 7.5) < 0.2:
                    continue  # pie de pagina
                x0 = min(s["bbox"][0] for s in spans)
                x1 = max(s["bbox"][2] for s in spans)
                y0 = min(s["bbox"][1] for s in spans)
                y1 = max(s["bbox"][3] for s in spans)
                emoji_line = bool(EMOJI.match(spans[0]["text"].strip() or " "))
                xt = x0
                if emoji_line:
                    xt = spans[1]["bbox"][0] if len(spans) > 1 else x0 + 24
                    if len(spans[0]["text"].strip()) > 2:
                        xt = x0 + 24
                runs = []
                nivel = 0
                for s in spans:
                    tf, niv = fuente(s["font"], s["size"])
                    if not (emoji_line and s is spans[0]):
                        nivel = max(nivel, niv)
                    sb = pymupdf.Rect(s["bbox"])
                    ar = sb.get_area()
                    amar = ar > 0 and any((sb & a).get_area() > 0.5 * ar for a in amarillos)
                    subr = any(abs(lr.y0 - sb.y1) < 2.5 and lr.x0 <= sb.x0 + 2 and lr.x1 >= sb.x1 - 2 for lr in finas)
                    if subr and any(t["caja"].intersects(sb) for t in tablas):
                        subr = False  # borde de tabla, no subrayado
                    runs.append((s["text"], (tf == "b" and niv == 0, tf == "i", subr, s["color"] == RED, amar)))
                txt = runs_a_texto(runs).strip()
                has_bullet = any(abs((r.y0 + r.y1) / 2 - (y0 + y1) / 2) < 6 and 0 < x0 - r.x1 < 22 for r in bullets)
                rect = next((c for c in callouts if c.x0 - 2 <= x0 <= c.x1 and c.y0 - 3 <= y0 <= c.y1), None)
                ti = next((i for i, t in enumerate(tablas) if t["caja"].contains(pymupdf.Point((x0 + x1) / 2, (y0 + y1) / 2))), None)
                # salto a otra columna: el texto vuelve hacia arriba, o sigue en la misma fila pero mucho más a la derecha
                jump = prev_y is not None and (
                    y0 < prev_y - 8 or (abs(y0 - prev_y) < 3 and prev_x0 is not None and x0 >= prev_x1 - 2 and x0 - prev_x0 > 100 and ti is None)
                )
                prev_y, prev_x0, prev_x1 = y0, x0, x1
                recs.append(dict(p=pi + 1, x0=x0, x1=x1, y0=y0, y1=y1, xt=xt, h=nivel, text=txt, bullet=has_bullet,
                                 rect=rect, emoji=emoji_line, jump=jump, tabla=ti))

    recs = [r for r in recs if not (r["p"] == 1 and r["text"] in ignorar)]
    recs = [r for r in recs if not (r["h"] >= 2 and len(r["text"].strip()) <= 1)]  # ruido de un solo caracter

    titulo = None
    partes_titulo = [r["text"] for r in recs if r["h"] == 1]
    if partes_titulo:
        titulo = re.sub(r"[*=_+~]", "", " ".join(partes_titulo)).strip()

    # bordes de columna: donde arranca lo que viene tras un salto
    margen = min((r["x0"] for r in recs if r["h"] == 0), default=72)
    candidatos = []
    for r in recs:
        if not r["jump"]:
            continue
        if r["bullet"]:
            candidatos.append(r["x0"] - 18)
        elif re.match(r"^\d{1,2}\.\s", PLANO.sub("", r["text"])):
            candidatos.append(r["x0"] - 4)
        else:
            candidatos.append(r["x0"])
    edges = [margen]
    for x in sorted(candidatos):
        if x - margen < 60 or x - edges[-1] < 12:
            continue
        # un punto anidado dentro de una columna cae a 19 pt por nivel del borde: no es otro borde
        if any(abs((x - e) - 19 * k) <= 3 for e in edges for k in (1, 2, 3)):
            continue
        edges.append(x)
    edges = sorted(edges)

    def base_de(x0, co_base):
        if co_base is not None:
            return co_base
        b = edges[0]
        for e in edges:
            if e <= x0 + 1:
                b = e
        return b

    # ---------------- bloques logicos ----------------
    blocks = []
    activo = None
    co_counter = 0
    tablas_emitidas = set()
    ultimo = lambda: blocks[-1] if blocks else None

    for r in recs:
        if r["h"] == 1:
            continue
        txt = r["text"]
        plano = PLANO.sub("", txt)

        if r["tabla"] is not None:
            clave = (r["p"], r["tabla"])
            if clave not in tablas_emitidas:
                tablas_emitidas.add(clave)
                t = tablas_por_pagina[r["p"]][r["tabla"]]
                blocks.append(dict(kind="tabla", tabla=t, celdas={}, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], co=False, coid=None))
            for b in reversed(blocks):
                if b["kind"] == "tabla" and b["tabla"] is tablas_por_pagina[r["p"]][r["tabla"]]:
                    fila, col = celda_de(b["tabla"], (r["x0"] + r["x1"]) / 2, (r["y0"] + r["y1"]) / 2)
                    b["celdas"].setdefault((fila, col), []).append(txt)
                    b["y1"] = r["y1"]
                    break
            continue

        if r["jump"]:
            activo = None
        en_co = False
        co_base = None
        if r["rect"] is not None:
            en_co = True
            co_base = r["rect"].x0 + 36.5
            if r["emoji"]:
                co_counter += 1
                activo = dict(text_x=r["xt"], p=r["p"], y1=r["y1"], id=co_counter)
            elif activo is None or activo["p"] != r["p"] or abs(activo["text_x"] - co_base) > 6:
                co_counter += 1
                activo = dict(text_x=co_base, p=r["p"], y1=r["y1"], id=co_counter)
        elif r["emoji"]:
            en_co = True
            co_counter += 1
            activo = dict(text_x=r["xt"], p=r["p"], y1=r["y1"], id=co_counter)
            co_base = r["xt"]
        elif activo is not None:
            misma_pag = activo["p"] == r["p"]
            sig_pag = activo["p"] == r["p"] - 1 and r["y0"] < 110
            if (misma_pag or sig_pag) and r["x0"] >= activo["text_x"] - 3 and (r["y0"] - activo["y1"] < 26 or sig_pag) and r["h"] == 0:
                en_co = True
                co_base = activo["text_x"]
                activo["p"] = r["p"]
            else:
                activo = None
        if en_co and activo is not None:
            activo["y1"] = r["y1"]
            activo["p"] = r["p"]
        cur_co_id = activo["id"] if (en_co and activo is not None) else None

        if r["jump"]:
            blocks.append(dict(kind="colbreak", x0=r["x0"], p=r["p"], p0=r["p"], y0=r["y0"]))

        if r["h"] in (2, 3) and not en_co:
            u = ultimo()
            if u and u["kind"] == "h" and u["level"] == r["h"] and u["p"] == r["p"] and r["y0"] - u["y1"] < 8:
                u["text"] += " " + txt
                u["y1"] = r["y1"]
            else:
                blocks.append(dict(kind="h", level=r["h"], text=txt, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], co=False, coid=None))
            continue

        base = base_de(r["x0"], co_base)
        m_num = re.match(r"^(\d{1,2})\.\s", plano) and not r["emoji"]
        es_item = (r["bullet"] or bool(m_num)) and not r["emoji"]
        if es_item:
            num = bool(m_num) and not r["bullet"]
            depth = max(0, round((r["x0"] - base - (4 if num else 18)) / 19))
            text_x = r["x0"] + (14 if num else 0)
            blocks.append(dict(kind="item", num=num, text=txt, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=text_x, depth=depth, co=en_co, coid=cur_co_id, base=base))
            continue

        u = ultimo()
        if u and u["kind"] in ("item", "p", "cont") and u["co"] == en_co and not r["emoji"]:
            misma = u["p"] == r["p"] and abs(r["x0"] - u["text_x"]) < 4 and (r["y0"] - u["y1"]) < 6
            cruce = (u["p"] == r["p"] - 1 and r["y0"] < 110 and abs(r["x0"] - u["text_x"]) < 4
                     and not re.search(r"[.:;!?)\"”]$", PLANO.sub("", u["text"]).strip()))
            if misma or cruce:
                u["text"] += " " + txt
                u["y1"] = r["y1"]
                u["p"] = r["p"]
                u["x1"] = max(u["x1"], r["x1"])
                continue
        if r["emoji"]:
            blocks.append(dict(kind="p", text=txt, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["xt"], depth=0, co=True, coid=cur_co_id, base=base))
            continue
        if r["x0"] - base < 10:
            blocks.append(dict(kind="p", text=txt, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["x0"], depth=0, co=en_co, coid=cur_co_id, base=base))
        else:
            d = max(0, round((r["x0"] - base - 18) / 19))
            blocks.append(dict(kind="cont", text=txt, p=r["p"], p0=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["x0"], depth=d, co=en_co, coid=cur_co_id, base=base))

    # ---------------- agrupar columnas ----------------
    n = len(blocks)
    cbs = [i for i, b in enumerate(blocks) if b["kind"] == "colbreak"]
    grupos = []
    actual = []
    for ci in cbs:
        if actual:
            prev_ci = actual[-1]
            ok = blocks[ci]["x0"] > blocks[prev_ci]["x0"] and all(
                b["x0"] >= blocks[prev_ci]["x0"] - 4 for b in blocks[prev_ci + 1:ci] if b["kind"] != "colbreak")
            if ok:
                actual.append(ci)
                continue
            grupos.append(actual)
        actual = [ci]
    if actual:
        grupos.append(actual)

    estructura = []  # bloques sueltos y ("cols", [[bloques], ...])
    idx = 0
    por_inicio = {}
    for g in grupos:
        first = g[0]
        j = first + 1
        while j < n and blocks[j]["kind"] == "colbreak":
            j += 1
        if j >= n:
            continue
        y_top, pag = blocks[j]["y0"], blocks[j].get("p0", blocks[j]["p"])
        ini = None
        t = first - 1
        while t >= 0:
            b = blocks[t]
            if b["kind"] == "colbreak" or b.get("p0", b["p"]) != pag:
                break
            if abs(b["y0"] - y_top) < 4:
                ini = t
            if b["y0"] < y_top - 4:
                break
            t -= 1
        if ini is None:
            continue
        X = blocks[g[-1]]["x0"]
        t = g[-1] + 1
        while t < n and blocks[t]["kind"] != "colbreak" and blocks[t]["x0"] >= X - 4 and blocks[t]["p"] - blocks[g[-1]]["p"] <= 1:
            t += 1
        por_inicio[ini] = (g, t)

    def dividir_columnas(ini, g, fin):
        cols = [[]]
        cortes = set(g)
        for k in range(ini, fin):
            if k in cortes:
                cols.append([])
            elif blocks[k]["kind"] != "colbreak":
                cols[-1].append(blocks[k])
        edges_g = [cols[0][0]["x0"] if cols[0] else margen] + [blocks[c]["x0"] for c in g]
        return cols, edges_g

    def unir(u, b):
        u["text"] += " " + b["text"]
        u["y1"] = b["y1"]
        u["p"] = b["p"]
        u["x1"] = max(u["x1"], b["x1"])

    idx = 0
    while idx < n:
        if idx in por_inicio:
            g, fin = por_inicio[idx]
            cols, edges_g = dividir_columnas(idx, g, fin)
            pag_fin = blocks[fin - 1]["p"] if fin > 0 else 0
            # continuacion en la pagina siguiente: primero lo que queda de cada columna, en orden
            t = fin
            c_prev = 0
            consumidos = 0
            while t < n:
                b = blocks[t]
                if b["kind"] == "colbreak":
                    t += 1
                    consumidos += 1
                    continue
                if b["p"] != pag_fin + 1 or b["kind"] in ("h", "tabla"):
                    break
                col = None
                for j in range(len(edges_g) - 1, 0, -1):
                    if b["x0"] >= edges_g[j] - 4:
                        col = j
                        break
                if col is None:
                    if b["x0"] >= edges_g[0] - 4 and len(edges_g) > 1 and b["x1"] < edges_g[1] - 4:
                        col = 0
                    else:
                        break
                if col < c_prev:
                    break
                c_prev = col
                destino = cols[col]
                u = destino[-1] if destino else None
                if (u and b["kind"] in ("cont", "p") and u["kind"] in ("item", "p", "cont") and u["co"] == b["co"]
                        and abs(b["x0"] - u.get("text_x", -999)) < 4
                        and not re.search(r"[.:;!?)\"”]$", PLANO.sub("", u["text"]).strip())):
                    unir(u, b)
                else:
                    destino.append(b)
                t += 1
                consumidos += 1
            estructura.append(("cols", cols))
            idx = fin + consumidos
            continue
        b = blocks[idx]
        if b["kind"] == "colbreak":
            avisos.append(f"Salto de columna sin resolver en la página {b['p']}; revisar '@@COLBREAK'.")
            estructura.append(("marca", f"@@COLBREAK p{b['p']} x={b['x0']:.0f}@@"))
        else:
            estructura.append(("bloque", b))
        idx += 1

    # ---------------- salida ----------------
    def lineas_de(bs):
        out = []
        prev = None
        for b in bs:
            k = b["kind"]
            if k == "h":
                out += ["", ("#" * b["level"]) + " " + limpiar(b["text"]), ""]
                prev = b
                continue
            if k == "tabla":
                t = b["tabla"]
                filas = []
                for fi in range(len(t["ys"]) - 1 if len(t["ys"]) > 1 else 1):
                    fila = []
                    for ci in range(len(t["xs"]) - 1 if len(t["xs"]) > 1 else 1):
                        fila.append(limpiar(" ".join(b["celdas"].get((fi, ci), []))).replace("|", "/"))
                    filas.append(fila)
                if t["encabezado"] and filas:
                    filas[0] = [c.replace("**", "") for c in filas[0]]
                filas = [f for f in filas if any(c.strip() for c in f)]
                if len(filas) == 1 and b["p0"] == 1 and len(filas[0]) >= 2:
                    out += ["", "**" + filas[0][0].replace("**", "") + ":** " + " ".join(c for c in filas[0][1:] if c), ""]
                    prev = b
                    continue
                if filas:
                    out.append("")
                    out.append("| " + " | ".join(filas[0]) + " |")
                    out.append("|" + "|".join(["---"] * len(filas[0])) + "|")
                    for f in filas[1:]:
                        out.append("| " + " | ".join(f) + " |")
                    out.append("")
                prev = b
                continue
            txt = limpiar(b["text"])
            if k == "item":
                linea = "\t" * b["depth"] + (txt if b["num"] else "- " + txt)
            elif k == "cont":
                linea = "\t" * (b["depth"] + 1) + txt
            else:
                linea = txt
            seguida = (prev is not None and prev["kind"] in ("item", "cont") and k in ("item", "cont")
                       and prev["co"] == b["co"] and prev.get("coid") == b.get("coid"))
            if not seguida:
                if prev is not None and b["co"] and prev.get("co") and prev.get("coid") == b.get("coid"):
                    out.append(">")
                else:
                    out.append("")
            out.append(("> " if b["co"] else "") + linea)
            prev = b
        return out

    salida = [f"**Asignatura:** {asignatura}", ""] if asignatura else []
    pendientes = []
    for tipo, dato in estructura:
        if tipo == "bloque":
            pendientes.append(dato)
            continue
        if pendientes:
            salida += lineas_de(pendientes)
            pendientes = []
        if tipo == "marca":
            salida += ["", dato, ""]
        else:
            salida += ["", ":::columnas", ""]
            for ci, col in enumerate(dato):
                if ci > 0:
                    salida += ["", ":::col", ""]
                salida += lineas_de(col)
            salida += ["", ":::", ""]
    if pendientes:
        salida += lineas_de(pendientes)
    md = re.sub(r"\n{3,}", "\n\n", "\n".join(salida)).strip() + "\n"
    if "@@COLBREAK" in md:
        avisos.append("Quedaron columnas sin armar (marcas @@COLBREAK): revisar a mano.")
    if len(md.strip()) < 20:
        avisos.append("No se encontró texto en el PDF (¿es un escaneo o una imagen?).")
    return {"titulo": titulo, "md": md, "avisos": avisos}


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("salida")
    ap.add_argument("--asignatura", default="")
    ap.add_argument("--ignorar", action="append", default=[], help="Linea exacta de la primera pagina a descartar (propiedades de Notion). Repetible.")
    args = ap.parse_args()
    res = convertir(args.pdf, args.asignatura, args.ignorar)
    with open(args.salida, "w", encoding="utf-8") as f:
        f.write(res["md"])
    for a in res["avisos"]:
        print("AVISO:", a, file=sys.stderr)
    print("titulo:", res["titulo"])
