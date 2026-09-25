"""Convierte un PDF exportado desde Notion (Imprimir > Guardar como PDF en Chrome)
a la sintaxis de Apuntes de Prima Lex (ver src/services/apunteFormato.ts).

Uso:  python tools/notion-pdf-a-apunte/convertir.py entrada.pdf salida.md [--asignatura "TEXTO"] [--ignorar "Course" ...]

Requiere PyMuPDF (pip install pymupdf). Ver README.md en esta carpeta.
"""
import argparse
import os
import re
import sys

import pymupdf

ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("salida")
ap.add_argument("--asignatura", default="", help="Si se indica, agrega una primera linea '**Asignatura:** ...'")
ap.add_argument("--ignorar", action="append", default=[], help="Linea de texto exacta a descartar (p. ej. propiedades de la pagina de Notion). Repetible.")
args = ap.parse_args()

PDF = args.pdf
OUT = args.salida
doc = pymupdf.open(PDF)

RED = 0xCF5148
YEL = (0.8275, 0.6588, 0.0)
CALLOUT = (0.9765, 0.9529, 0.8627)
EDGES = [72, 238, 321, 404]
EMOJI = re.compile(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF]\uFE0F?")
PLANO = re.compile(r"[*=_+~]")


def close(a, b, tol=0.02):
    return a is not None and all(abs(x - y) < tol for x, y in zip(a, b))


def fuente(font, size):
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


NEUTRO = (False, False, False, False, False)


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


# ---------------- extraccion de lineas ----------------
recs = []
for pi, page in enumerate(doc):
    dr = page.get_drawings()
    amarillos = [d["rect"] for d in dr if close(d.get("fill"), YEL) and 10 < d["rect"].height < 16]
    callouts = [d["rect"] for d in dr if close(d.get("fill"), CALLOUT) and d["rect"].height > 20]
    bullets = [d["rect"] for d in dr if 2.5 < d["rect"].width < 4 and 2.5 < d["rect"].height < 4]
    finas = [d["rect"] for d in dr if d["rect"].height <= 1.0 and 5 < d["rect"].width < 440]
    prev_y = None
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = list(l["spans"])
            if not "".join(s["text"] for s in spans).strip():
                continue
            if abs(spans[0]["size"] - 7.5) < 0.2:
                continue
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
                subr = (pi not in (0, 4)) and any(abs(lr.y0 - sb.y1) < 2.5 and lr.x0 <= sb.x0 + 2 and lr.x1 >= sb.x1 - 2 for lr in finas)
                runs.append((s["text"], (tf == "b" and niv == 0, tf == "i", subr, s["color"] == RED, amar)))
            txt = runs_a_texto(runs).strip()
            has_bullet = any(abs((r.y0 + r.y1) / 2 - (y0 + y1) / 2) < 6 and 0 < x0 - r.x1 < 22 for r in bullets)
            rect = None
            for c in callouts:
                if c.x0 - 2 <= x0 <= c.x1 and c.y0 - 3 <= y0 <= c.y1:
                    rect = c
                    break
            jump = prev_y is not None and y0 < prev_y - 8
            prev_y = y0
            recs.append(dict(p=pi + 1, x0=x0, x1=x1, y0=y0, y1=y1, xt=xt, h=nivel, text=txt, bullet=has_bullet,
                             rect=rect, emoji=emoji_line, jump=jump))

# propiedades de la pagina de Notion (p. ej. "Course" y su valor) que no son parte del apunte
recs = [r for r in recs if not (r["p"] == 1 and r["text"] in args.ignorar)]
# un "titulo" de un solo caracter es ruido del PDF (p. ej. el separador que Notion deja al pie de una pagina)
recs = [r for r in recs if not (r["h"] >= 2 and len(r["text"].strip()) <= 1)]

# ---------------- bloques logicos ----------------
blocks = []
activo = None  # callout activo: dict(text_x, p, y1)
co_counter = 0


def base_de(x0, co_base):
    if co_base is not None:
        return co_base
    b = 72
    for e in EDGES:
        if e <= x0 + 1:
            b = e
    return b


def ultimo():
    return blocks[-1] if blocks else None


for r in recs:
    if r["h"] == 1:
        continue
    txt = r["text"]
    plano = PLANO.sub("", txt)
    # ---- estado de callout ----
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
        if r["rect"] is not None and co_base is not None:
            pass
        activo["y1"] = r["y1"]
        activo["p"] = r["p"]

    cur_co_id = activo["id"] if (en_co and activo is not None) else None
    if r["jump"]:
        blocks.append(dict(kind="colbreak", x0=r["x0"], p=r["p"], y0=r["y0"]))

    # ---- encabezados ----
    if r["h"] in (2, 3) and not en_co:
        u = ultimo()
        if u and u["kind"] == "h" and u["level"] == r["h"] and u["p"] == r["p"] and r["y0"] - u["y1"] < 8:
            u["text"] += " " + txt
            u["y1"] = r["y1"]
        else:
            blocks.append(dict(kind="h", level=r["h"], text=txt, p=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], co=False))
        continue

    base = base_de(r["x0"], co_base)
    m_num = re.match(r"^(\d{1,2})\.\s", plano) and not r["emoji"]
    es_item = (r["bullet"] or bool(m_num)) and not r["emoji"]
    if es_item:
        num = bool(m_num) and not r["bullet"]
        depth = max(0, round((r["x0"] - base - (4 if num else 18)) / 19))
        text_x = r["x0"] + (14 if num else 0)
        blocks.append(dict(kind="item", num=num, text=txt, p=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=text_x, depth=depth, co=en_co, coid=cur_co_id, base=base))
        continue

    u = ultimo()
    # linea de continuacion (soft wrap) del bloque anterior
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
        blocks.append(dict(kind="p", text=txt, p=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["xt"], depth=0, co=True, coid=cur_co_id, base=base))
        continue
    if r["x0"] - base < 10:
        blocks.append(dict(kind="p", text=txt, p=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["x0"], depth=0, co=en_co, coid=cur_co_id, base=base))
    else:
        d = max(0, round((r["x0"] - base - 18) / 19))
        blocks.append(dict(kind="cont", text=txt, p=r["p"], y0=r["y0"], y1=r["y1"], x0=r["x0"], x1=r["x1"], text_x=r["x0"], depth=d, co=en_co, coid=cur_co_id, base=base))

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

antes = {}     # idx -> lista de marcadores a emitir antes del bloque
sepcol = set() # colbreaks que son separadores de columna
manuales = []
for g in grupos:
    first = g[0]
    y_top = None
    j = first + 1
    while j < n and blocks[j]["kind"] == "colbreak":
        j += 1
    if j >= n:
        continue
    y_top, pag = blocks[j]["y0"], blocks[j]["p"]
    ini = None
    t = first - 1
    while t >= 0:
        b = blocks[t]
        if b["kind"] == "colbreak":
            break
        if b["p"] != pag:
            break
        if abs(b["y0"] - y_top) < 4:
            ini = t
        if b["y0"] < y_top - 4:
            break
        t -= 1
    if ini is None:
        manuales.append(g)
        continue
    X = blocks[g[-1]]["x0"]
    t = g[-1] + 1
    while t < n and blocks[t]["kind"] != "colbreak" and blocks[t]["x0"] >= X - 4 and blocks[t]["p"] - blocks[g[-1]]["p"] <= 1:
        t += 1
    antes.setdefault(ini, []).append(":::columnas")
    for ci in g:
        sepcol.add(ci)
    antes.setdefault(t, []).append(":::")

if manuales:
    print(f"AVISO: {len(manuales)} grupo(s) de columnas no se pudieron cerrar solos; buscar '@@COLBREAK' en la salida y arreglarlos a mano.", file=sys.stderr)

# ---------------- salida ----------------
def limpiar(t):
    prev = None
    while prev != t:
        prev = t
        t = t.replace("++ ++", " ").replace("** **", " ").replace("== ==", " ").replace("__ __", " ").replace("~ ~", " ")
    return t


lines_out = [f"**Asignatura:** {args.asignatura}", ""] if args.asignatura else []
prev = None
en_col_grupo = False
for idx, b in enumerate(blocks):
    k = b["kind"]
    for m in antes.get(idx, []):
        lines_out.append("")
        lines_out.append(m)
        lines_out.append("")
        prev = None
    if k == "colbreak":
        lines_out.append("")
        lines_out.append(":::col" if idx in sepcol else f"@@COLBREAK p{b['p']} x={b['x0']:.0f}@@")
        lines_out.append("")
        prev = None
        continue
    if k == "h":
        lines_out.append("")
        lines_out.append(("#" * b["level"]) + " " + limpiar(b["text"]))
        lines_out.append("")
        prev = b
        continue
    txt = limpiar(b["text"])
    if k == "item":
        linea = "\t" * b["depth"] + (txt if b["num"] else "- " + txt)
    elif k == "cont":
        linea = "\t" * (b["depth"] + 1) + txt
    else:
        linea = txt
    lista_seguida = prev is not None and prev["kind"] in ("item", "cont") and k in ("item", "cont") and prev["co"] == b["co"] and prev.get("coid") == b.get("coid")
    if not lista_seguida:
        if prev is not None and b["co"] and prev.get("co") and prev.get("coid") == b.get("coid"):
            lines_out.append(">")
        else:
            lines_out.append("")
    lines_out.append(("> " if b["co"] else "") + linea)
    prev = b

open(OUT, "w", encoding="utf-8").write("\n".join(lines_out).strip() + "\n")
print("ok", len(blocks), "bloques ->", OUT)
