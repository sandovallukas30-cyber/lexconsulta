import { useMemo, type CSSProperties } from "react";

/** Números «al azar» que siempre salen iguales (para que las estrellas no cambien de lugar en cada dibujo). */
function azar(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHO = 800, ALTO = 600;
const VB = `0 0 ${ANCHO} ${ALTO}`;
const ref = { className: "enf-fondo-svg", viewBox: VB, preserveAspectRatio: "xMidYMid slice", "aria-hidden": true } as const;
const e = (x: number, y: number): CSSProperties => ({ transform: `translate(${x}px, ${y}px)`, transition: "transform 5s linear" });
const op = (v: number): CSSProperties => ({ opacity: v, transition: "opacity 5s linear" });

/** Cuánto avanzó la sesión (0 a 1): las escenas lo usan para que el cielo cambie mientras trabajas. */
export interface PropsEscena { p: number }

/** Un pino de tres pisos. */
function pino(x: number, base: number, h: number, w: number): string {
  const y0 = base - h;
  const t = (f: number) => (y0 + h * f).toFixed(1);
  const der: [number, number][] = [[0.3, 0.34], [0.16, 0.34], [0.4, 0.64], [0.2, 0.64], [0.5, 0.94], [0.07, 0.94]];
  const pts = [`${x},${y0}`, ...der.map(([dx, f]) => `${(x + dx * w).toFixed(1)},${t(f)}`), ...[...der].reverse().map(([dx, f]) => `${(x - dx * w).toFixed(1)},${t(f)}`)];
  return `M${pts.join(" L")} Z M${x - w * 0.05},${t(0.94)} h${w * 0.1} v${(h * 0.08).toFixed(1)} h${-w * 0.1} Z`;
}

/** Una ola que se repite cada `per` píxeles, para poder moverla sin que se note el corte. */
function onda(y: number, amp: number, per: number): string {
  const medios = Math.ceil((ANCHO * 2 + per * 2) / (per / 2));
  let d = `M0,${y} Q${per / 4},${y - amp} ${per / 2},${y}`;
  for (let k = 2; k <= medios; k++) d += ` T${(k * per) / 2},${y}`;
  return `${d} V${ALTO + 20} H0 Z`;
}

const estrellasDe = (semilla: number, n: number, alto: number) => {
  const r = azar(semilla);
  return Array.from({ length: n }, () => ({ x: r() * ANCHO, y: r() * alto, r: 0.5 + r() * 1.4, d: r() * 5, t: 2.5 + r() * 3.5 }));
};

const Estrellas = ({ lista, opacidad = 1 }: { lista: ReturnType<typeof estrellasDe>; opacidad?: number }) => (
  <g opacity={opacidad}>{lista.map((s, i) => <circle key={i} className="enf-fx-estrella" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ animationDelay: `${s.d}s`, animationDuration: `${s.t}s` } as CSSProperties} />)}</g>
);

/** Mezcla dos colores #rrggbb (t = 0 → a, t = 1 → b). */
function mezclaHex(a: string, b: string, t: number): string {
  const x = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const y = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + x.map((v, k) => Math.round(v + (y[k] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("");
}

/** Una cordillera: picos al azar (siempre los mismos) unidos con curvas suaves. */
function sierra(semilla: number, base: number, alto: number, picos: number): string {
  const r = azar(semilla);
  const paso = (ANCHO + 80) / picos;
  let d = `M-40,${base}`;
  let x = -40;
  for (let k = 0; k < picos; k++) {
    const cima = base - alto * (0.45 + r() * 0.55);
    const cx = x + paso * (0.35 + r() * 0.3);
    d += ` Q${cx.toFixed(0)},${cima.toFixed(0)} ${(x + paso).toFixed(0)},${(base - alto * r() * 0.25).toFixed(0)}`;
    x += paso;
  }
  return `${d} V${ALTO} H-40 Z`;
}

/** Pinos en hilera sobre una base, para siluetas del primer plano. */
function hileraPinos(semilla: number, base: number, n: number, h: number, w: number, desde = 0, hasta = ANCHO): string {
  const r = azar(semilla);
  return Array.from({ length: n }, (_, i) => pino(desde + (i + 0.5) * ((hasta - desde) / n) + (r() - 0.5) * 30, base + r() * 10, h * (0.7 + r() * 0.6), w * (0.8 + r() * 0.4))).join(" ");
}

/** Reflejo en el agua de un astro: franjas que titilan bajo él. */
const Reflejo = ({ x, y0, color, ancho }: { x: number; y0: number; color: string; ancho: number }) => (
  <g fill={color}>
    {Array.from({ length: 7 }, (_, i) => (
      <rect key={i} className="enf-fx-reflejo" x={x - ancho * (1 - i * 0.1) / 2} y={y0 + 6 + i * 12} width={ancho * (1 - i * 0.1)} height="2.4" rx="1.2" opacity={0.7 - i * 0.08} style={{ animationDelay: `${i * 0.35}s` } as CSSProperties} />
    ))}
  </g>
);

/* ───────────────────────── Noche ───────────────────────── */
export function Noche({ p }: PropsEscena) {
  const estrellas = useMemo(() => estrellasDe(7, 90, 330), []);
  const luciernagas = useMemo(() => {
    const r = azar(13);
    return Array.from({ length: 9 }, () => ({ x: 60 + r() * 680, y: 470 + r() * 60, dx: (r() - 0.5) * 60, dy: -20 - r() * 30, d: -r() * 9 }));
  }, []);
  const lejos = useMemo(() => sierra(31, 420, 150, 5), []);
  const medio = useMemo(() => sierra(37, 455, 90, 7), []);
  const pinos = useMemo(() => hileraPinos(41, 508, 9, 130, 62, 0, 300) + " " + hileraPinos(43, 510, 8, 110, 56, 540, ANCHO), []);
  const luna = { x: 570 - p * 360, y: 150 + Math.sin(p * Math.PI) * -30 + p * 50 };
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fn-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050918" /><stop offset=".55" stopColor="#12214d" /><stop offset="1" stopColor="#3a4790" /></linearGradient>
        <linearGradient id="fn-lago" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d2a66" /><stop offset="1" stopColor="#060a1c" /></linearGradient>
        <radialGradient id="fn-halo"><stop offset="0" stopColor="#dfe6ff" stopOpacity=".22" /><stop offset="1" stopColor="#dfe6ff" stopOpacity="0" /></radialGradient>
        <radialGradient id="fn-ventana"><stop offset="0" stopColor="#ffcf7a" stopOpacity=".55" /><stop offset="1" stopColor="#ffcf7a" stopOpacity="0" /></radialGradient>
        <mask id="fn-media"><rect x="-80" y="-80" width="160" height="160" fill="#fff" /><circle cx="24" cy="-16" r="40" fill="#000" /></mask>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fn-cielo)" />
      <Estrellas lista={estrellas} />
      <g style={e(luna.x - 570, luna.y - 150)}>
        <circle cx="570" cy="150" r="160" fill="url(#fn-halo)" />
        <g transform="translate(570 150)"><circle r="46" fill="#f6f2dd" mask="url(#fn-media)" /></g>
      </g>
      <line className="enf-fx-fugaz" x1="140" y1="70" x2="90" y2="100" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line className="enf-fx-fugaz enf-fx-fugaz-2" x1="470" y1="40" x2="425" y2="68" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d={lejos} fill="#1b2658" />
      <path d={medio} fill="#111a42" />
      <rect y="470" width={ANCHO} height="130" fill="url(#fn-lago)" />
      {luna.y < 460 && <Reflejo x={luna.x} y0={470} color="#f6f2dd" ancho={70} />}
      <path d={pinos} fill="#050916" />
      <path d="M0,520 C140,505 260,515 400,508 C560,500 680,516 800,506 V600 H0 Z" fill="#04070f" />
      <g transform="translate(205 462)">
        <circle cx="22" cy="22" r="46" fill="url(#fn-ventana)" />
        <path d="M0,36 L22,14 L44,36 V58 H0 Z" fill="#070b18" />
        <rect x="15" y="34" width="14" height="12" rx="1.5" fill="#ffcf7a" className="enf-fx-estrella" style={{ animationDuration: "7s" } as CSSProperties} />
        <rect x="31" y="14" width="6" height="14" fill="#070b18" />
      </g>
      {luciernagas.map((f, i) => <circle key={i} className="enf-fx-luciernaga" cx={f.x} cy={f.y} r="1.8" fill="#f6ff9a" style={{ "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, animationDelay: `${f.d}s` } as CSSProperties} />)}
    </svg>
  );
}

/* ───────────────────────── Bosque ───────────────────────── */
export function Bosque({ p }: PropsEscena) {
  const capas = useMemo(() => {
    const r = azar(21);
    const hacer = (n: number, base: number, h: number, w: number, jitter: number) =>
      Array.from({ length: n }, (_, i) => pino((i + 0.5) * ((ANCHO + 120) / n) - 60 + (r() - 0.5) * jitter, base + (r() - 0.5) * 18, h * (0.8 + r() * 0.5), w * (0.85 + r() * 0.4))).join(" ");
    return [
      { d: hacer(15, 470, 190, 90, 40), c: "#2d6a57", o: 0.7 },
      { d: hacer(11, 535, 260, 130, 60), c: "#1c4a3d", o: 0.92 },
      { d: hacer(8, 640, 360, 190, 90), c: "#0e2c25", o: 1 },
    ];
  }, []);
  const luciernagas = useMemo(() => {
    const r = azar(5);
    return Array.from({ length: 18 }, () => ({ x: 40 + r() * 720, y: 300 + r() * 250, dx: (r() - 0.5) * 90, dy: -20 - r() * 60, d: r() * 8, t: 6 + r() * 6 }));
  }, []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fb-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1d22" /><stop offset=".55" stopColor="#245246" /><stop offset="1" stopColor="#9bc79c" /></linearGradient>
        <radialGradient id="fb-sol"><stop offset="0" stopColor="#fff0b8" stopOpacity=".85" /><stop offset="1" stopColor="#fff0b8" stopOpacity="0" /></radialGradient>
        <radialGradient id="fb-bruma"><stop offset="0" stopColor="#d7efe0" stopOpacity=".32" /><stop offset="1" stopColor="#d7efe0" stopOpacity="0" /></radialGradient>
        <linearGradient id="fb-rayo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c4" stopOpacity=".28" /><stop offset="1" stopColor="#fff3c4" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fb-cielo)" />
      <g style={{ ...e(0, -p * 80), ...op(0.45 + p * 0.55) }}><circle cx="560" cy="380" r="230" fill="url(#fb-sol)" /></g>
      <g style={op(0.4 + p * 0.6)}><g className="enf-fx-rayos">
        <polygon points="520,0 580,0 470,600 330,600" fill="url(#fb-rayo)" />
        <polygon points="620,0 650,0 640,600 540,600" fill="url(#fb-rayo)" />
      </g></g>
      {capas.map((c, i) => <g key={i} className={`enf-fx-capa enf-fx-capa-${i + 1}`}><path d={c.d} fill={c.c} opacity={c.o} /></g>)}
      <ellipse className="enf-fx-bruma" cx="260" cy="500" rx="360" ry="70" fill="url(#fb-bruma)" />
      <ellipse className="enf-fx-bruma fx-bruma-2" cx="560" cy="540" rx="400" ry="60" fill="url(#fb-bruma)" />
      {luciernagas.map((l, i) => (
        <circle key={i} className="enf-fx-luciernaga" cx={l.x} cy={l.y} r="2.6" fill="#f6ff9a" style={{ animationDelay: `${l.d}s`, animationDuration: `${l.t}s`, ["--dx" as string]: `${l.dx}px`, ["--dy" as string]: `${l.dy}px` } as CSSProperties} />
      ))}
    </svg>
  );
}

/* ───────────────────────── Playa ───────────────────────── */
export function Playa({ p }: PropsEscena) {
  const reflejo = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ y: 372 + i * 14, w: 90 - i * 7 + (i % 2) * 14, d: i * 0.35 })), []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fp-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d1745" /><stop offset=".3" stopColor="#6a2d6d" /><stop offset=".55" stopColor="#e2585c" /><stop offset=".8" stopColor="#ffae68" /><stop offset="1" stopColor="#ffdca3" /></linearGradient>
        <radialGradient id="fp-sol"><stop offset="0" stopColor="#fff6cf" /><stop offset=".35" stopColor="#ffd98c" stopOpacity=".9" /><stop offset="1" stopColor="#ffb26b" stopOpacity="0" /></radialGradient>
        <linearGradient id="fp-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f08a6a" /><stop offset=".12" stopColor="#2c6a96" /><stop offset="1" stopColor="#0c3050" /></linearGradient>
        <linearGradient id="fp-arena" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eccb96" /><stop offset="1" stopColor="#bf9660" /></linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fp-cielo)" />
      <g style={e(0, p * 80)}>
        <circle cx="400" cy="352" r="190" fill="url(#fp-sol)" />
        <circle cx="400" cy="340" r="52" fill="#fff4c8" />
      </g>
      <g className="enf-fx-nubes">
        <ellipse cx="150" cy="150" rx="120" ry="14" fill="#ffc7a8" opacity=".45" />
        <ellipse cx="210" cy="172" rx="90" ry="10" fill="#ffc7a8" opacity=".35" />
        <ellipse cx="620" cy="110" rx="140" ry="16" fill="#ffb79a" opacity=".4" />
        <ellipse cx="560" cy="136" rx="80" ry="9" fill="#ffb79a" opacity=".3" />
      </g>
      <g className="enf-fx-aves" fill="none" stroke="#3a1f45" strokeWidth="2" strokeLinecap="round">
        <path d="M0,0 q8,-8 16,0 q8,-8 16,0" transform="translate(120 230)" /><path d="M0,0 q6,-6 12,0 q6,-6 12,0" transform="translate(160 214)" /><path d="M0,0 q6,-6 12,0 q6,-6 12,0" transform="translate(190 240)" />
      </g>
      <rect y="360" width={ANCHO} height="260" fill="url(#fp-mar)" />
      {reflejo.map((r, i) => <rect key={i} className="enf-fx-reflejo" x={400 - r.w / 2} y={r.y} width={r.w} height="3.5" rx="2" fill="#fff0bf" style={{ animationDelay: `${r.d}s`, ...op(1 - p * 0.7) } as CSSProperties} />)}
      <g className="enf-fx-ola fx-ola-1"><path d={onda(408, 6, 200)} fill="#3a82ae" opacity=".42" /></g>
      <g className="enf-fx-ola fx-ola-2"><path d={onda(448, 9, 260)} fill="#27648f" opacity=".6" /></g>
      <g className="enf-fx-ola fx-ola-3"><path d={onda(492, 12, 340)} fill="#174b73" opacity=".8" /></g>
      <path d="M0,540 C160,520 300,548 460,530 C620,512 700,540 800,526 V600 H0 Z" fill="url(#fp-arena)" />
      <path className="enf-fx-espuma" d="M0,540 C160,520 300,548 460,530 C620,512 700,540 800,526" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

/* ───────────────────────── Aurora ───────────────────────── */
export function Aurora({ p }: PropsEscena) {
  const estrellas = useMemo(() => estrellasDe(33, 55, 360), []);
  const pinos = useMemo(() => hileraPinos(71, 535, 10, 120, 58, 0, 330) + " " + hileraPinos(73, 538, 9, 100, 52, 500, ANCHO), []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fa-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#03050f" /><stop offset="1" stopColor="#0c1a33" /></linearGradient>
        <linearGradient id="fa-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5dffb0" stopOpacity="0" /><stop offset=".5" stopColor="#3ee6a4" stopOpacity=".75" /><stop offset="1" stopColor="#2bb8c9" stopOpacity="0" /></linearGradient>
        <linearGradient id="fa-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b277ff" stopOpacity="0" /><stop offset=".5" stopColor="#9a5cf0" stopOpacity=".6" /><stop offset="1" stopColor="#4f7bff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fa-cielo)" />
      <Estrellas lista={estrellas} />
      <g style={op(0.4 + p * 0.6)}><g className="enf-fx-aurora">
        <path className="enf-fx-vela fx-vela-1" d="M-40,120 C120,40 260,260 420,150 C560,60 680,230 860,110 V420 C700,520 560,330 420,430 C260,540 120,320 -40,430 Z" fill="url(#fa-v)" />
        <path className="enf-fx-vela fx-vela-2" d="M-40,210 C140,120 300,330 460,220 C600,130 700,300 860,190 V470 C700,560 560,400 420,480 C260,570 120,400 -40,480 Z" fill="url(#fa-m)" />
        <path className="enf-fx-vela fx-vela-3" d="M-40,60 C100,10 220,150 380,80 C540,10 660,140 860,60 V300 C700,380 540,220 380,300 C220,380 100,230 -40,300 Z" fill="url(#fa-v)" />
      </g></g>
      <path d="M0,480 L90,420 L150,450 L250,380 L330,435 L420,400 L520,450 L620,390 L720,440 L800,410 V600 H0 Z" fill="#070d1a" />
      <rect y="478" width={ANCHO} height="122" fill="#050b18" />
      {/* el lago refleja la aurora */}
      <g opacity={0.25 + p * 0.35} transform="translate(0 956) scale(1 -1)" style={{ filter: "blur(3px)" }}>
        <path className="enf-fx-vela fx-vela-1" d="M-40,380 C120,330 260,450 420,400 C560,350 680,440 860,380 V478 H-40 Z" fill="url(#fa-v)" />
      </g>
      <g fill="#9fffd6" opacity=".25">{[0, 1, 2, 3].map((i) => <rect key={i} className="enf-fx-reflejo" x={200 + i * 90} y={500 + i * 14} width={120 - i * 18} height="2" rx="1" style={{ animationDelay: `${i * 0.5}s` } as CSSProperties} />)}</g>
      <path d={pinos} fill="#02050c" />
      <path d="M0,548 C150,535 300,545 420,540 C560,534 690,546 800,538 V600 H0 Z" fill="#02050c" />
    </svg>
  );
}

/* ───────────────────────── Lluvia en la ventana ───────────────────────── */
export function Lluvia({ p }: PropsEscena) {
  const gotas = useMemo(() => {
    const r = azar(11);
    return Array.from({ length: 46 }, () => ({ x: r() * ANCHO, l: 26 + r() * 46, t: 0.55 + r() * 0.7, d: -r() * 2, o: 0.12 + r() * 0.3 }));
  }, []);
  const cristal = useMemo(() => {
    const r = azar(3);
    return Array.from({ length: 9 }, () => ({ x: 30 + r() * 740, y: 60 + r() * 220, r: 2.5 + r() * 3.5, t: 14 + r() * 14, d: -r() * 20 }));
  }, []);
  const luces = useMemo(() => {
    const r = azar(19);
    const col = ["#ffcf7a", "#ff9ec4", "#8fc4ff", "#ffe0a3", "#ff8e72"];
    return Array.from({ length: 12 }, (_, i) => ({ x: 40 + r() * 720, y: 300 + r() * 180, r: 24 + r() * 46, c: col[i % col.length], o: 0.28 + r() * 0.3 }));
  }, []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fl-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c1424" /><stop offset=".7" stopColor="#1d2e47" /><stop offset="1" stopColor="#2c3f5c" /></linearGradient>
        <radialGradient id="fl-luz"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fl-cielo)" />
      <g style={op(0.55 + p * 0.4)}>{luces.map((l, i) => <circle key={i} className="enf-fx-bokeh" cx={l.x} cy={l.y} r={l.r} fill={l.c} opacity={l.o} style={{ animationDelay: `${i * 0.7}s` } as CSSProperties} />)}</g>
      <rect className="enf-fx-relampago" width={ANCHO} height={ALTO} fill="#d6e4ff" opacity="0" />
      {gotas.map((g, i) => <line key={i} className="enf-fx-gota" x1={g.x} y1={-80} x2={g.x - 6} y2={-80 + g.l} stroke="#cfe0ff" strokeWidth="1.3" opacity={g.o} style={{ animationDuration: `${g.t}s`, animationDelay: `${g.d}s` } as CSSProperties} />)}
      {cristal.map((g, i) => <g key={i} transform={`translate(${g.x} ${g.y})`}><g className="enf-fx-resbala" style={{ animationDuration: `${g.t}s`, animationDelay: `${g.d}s` } as CSSProperties}><ellipse rx={g.r} ry={g.r * 1.5} fill="#e6f0ff" opacity=".4" /><ellipse cx={-g.r * 0.3} cy={-g.r * 0.4} rx={g.r * 0.3} ry={g.r * 0.4} fill="#fff" opacity=".7" /></g></g>)}
      <g fill="#1a120d">
        <rect x="0" y="0" width="34" height="600" /><rect x="766" y="0" width="34" height="600" /><rect x="0" y="0" width="800" height="26" />
        <rect x="390" y="0" width="20" height="540" /><rect x="0" y="262" width="800" height="16" />
      </g>
      <g fill="#ffb86b" opacity=".18"><rect x="34" y="26" width="3" height="514" /><rect x="410" y="26" width="3" height="514" /><rect x="37" y="278" width="730" height="2" /></g>
      <rect x="-10" y="530" width="820" height="24" rx="4" fill="#2a1b12" />
      <rect x="-10" y="530" width="820" height="4" fill="#5a3a24" />
      <rect x="0" y="554" width="800" height="46" fill="#150d08" />
      <g transform="translate(110 462)">
        <path d="M-12,24 C-30,-6 -18,-40 -4,-52 C-6,-30 0,-14 0,24 Z" fill="#2f5a3c" /><path d="M10,24 C30,-4 26,-34 14,-46 C14,-24 8,-10 2,24 Z" fill="#3b6e48" />
        <path d="M0,24 C-4,-10 2,-44 8,-62 C12,-36 8,-6 4,24 Z" fill="#285034" />
        <path d="M-22,24 H26 L20,68 H-16 Z" fill="#b8643a" /><rect x="-25" y="20" width="54" height="9" rx="2" fill="#c97546" />
      </g>
      <g transform="translate(640 500)">
        <path d="M0,0 H36 V24 C36,32 30,34 18,34 C6,34 0,32 0,24 Z" fill="#e9e1d4" />
        <path d="M36,6 C48,6 48,22 36,22" fill="none" stroke="#e9e1d4" strokeWidth="5" />
        <path className="enf-fx-vela" d="M10,-6 C4,-18 16,-24 10,-36 M22,-6 C16,-18 28,-24 22,-38" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ───────────────────────── Ciudad de noche ───────────────────────── */
export function Ciudad({ p }: PropsEscena) {
  const edificios = useMemo(() => {
    const r = azar(29);
    const capa = (base: number, hmin: number, hmax: number, color: string, ventanas: boolean) => {
      const lista: { x: number; w: number; h: number; color: string; v: { x: number; y: number; u: number }[] }[] = [];
      let x = -20;
      while (x < ANCHO + 20) {
        const w = 40 + r() * 60;
        const h = hmin + r() * (hmax - hmin);
        const v: { x: number; y: number; u: number }[] = [];
        if (ventanas) for (let yy = ALTO - base - h + 12; yy < ALTO - base - 10; yy += 17) for (let xx = x + 8; xx < x + w - 8; xx += 14) v.push({ x: xx, y: yy, u: r() });
        lista.push({ x, w, h, color, v });
        x += w + 2 + r() * 6;
      }
      return lista;
    };
    return [capa(60, 90, 210, "#1a1233", false), capa(0, 110, 300, "#0e0a21", true)];
  }, []);
  const estrellas = useMemo(() => estrellasDe(41, 28, 260), []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fc-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#120b30" /><stop offset=".55" stopColor="#3f2468" /><stop offset="1" stopColor="#d88a5c" /></linearGradient>
        <radialGradient id="fc-halo"><stop offset="0" stopColor="#ffd9a8" stopOpacity=".45" /><stop offset="1" stopColor="#ffd9a8" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fc-cielo)" />
      <Estrellas lista={estrellas} />
      <circle cx="150" cy="130" r="22" fill="#fbeed1" />
      <circle cx="150" cy="130" r="90" fill="url(#fc-halo)" />
      <g className="enf-fx-nubes" opacity=".35"><ellipse cx="500" cy="170" rx="150" ry="14" fill="#c9a4e8" /><ellipse cx="620" cy="200" rx="110" ry="10" fill="#c9a4e8" /></g>
      <circle className="enf-fx-avion" cx="0" cy="90" r="2.4" fill="#ff5a5a" />
      {edificios.map((capa, ci) => (
        <g key={ci}>
          {capa.map((b, i) => <rect key={i} x={b.x} y={ALTO - (ci === 0 ? 60 : 0) - b.h} width={b.w} height={b.h + 100} fill={b.color} />)}
          {capa.flatMap((b, i) => b.v.map((v, j) => {
            const umbral = 0.25 + (1 - p) * 0.0; // ventanas encendidas según avanza la sesión
            const lit = v.u < umbral + p * 0.55;
            return lit ? <rect key={`${i}-${j}`} className={v.u < 0.15 ? "enf-fx-ventana" : undefined} x={v.x} y={v.y} width="7" height="10" fill="#ffd58a" opacity={0.55 + v.u * 0.4} style={{ animationDelay: `${v.u * 40}s` } as CSSProperties} /> : null;
          }))}
        </g>
      ))}
      <circle className="enf-fx-antena" cx="470" cy="236" r="3" fill="#ff4d4d" />
    </svg>
  );
}

/* ───────────────────────── Cafetería ───────────────────────── */
export function Cafeteria({ p }: PropsEscena) {
  const libros = useMemo(() => {
    const r = azar(37);
    const col = ["#7a3b2e", "#2f5d62", "#b0833a", "#4a3a6b", "#8a5a3a", "#3c6b4a", "#a04a4a"];
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    [120, 200, 280].forEach((y) => {
      let x = 530;
      while (x < 735) { const w = 10 + r() * 14; const h = 40 + r() * 28; out.push({ x, y: y - h, w, h, c: col[Math.floor(r() * col.length)] }); x += w + 1.5; }
    });
    return out;
  }, []);
  const lamparas = [{ x: 250, l: 150 }, { x: 410, l: 120 }, { x: 330, l: 190 }];
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fk-pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24150d" /><stop offset="1" stopColor="#5e3b22" /></linearGradient>
        <linearGradient id="fk-ventana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#25345e" /><stop offset="1" stopColor="#d79a62" /></linearGradient>
        <linearGradient id="fk-mesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f2615" /><stop offset="1" stopColor="#1b0f08" /></linearGradient>
        <radialGradient id="fk-luz"><stop offset="0" stopColor="#ffd08a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd08a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fk-pared)" />
      <rect x="50" y="70" width="230" height="210" fill="url(#fk-ventana)" />
      <g fill="#1a0f08"><rect x="44" y="64" width="242" height="10" /><rect x="44" y="276" width="242" height="10" /><rect x="44" y="64" width="10" height="222" /><rect x="276" y="64" width="10" height="222" /><rect x="160" y="64" width="8" height="222" /><rect x="44" y="170" width="242" height="8" /></g>
      <g fill="#fff" opacity=".35"><circle cx="100" cy="120" r="1.4" /><circle cx="210" cy="100" r="1.2" /><circle cx="130" cy="95" r="1" /></g>
      <rect x="520" y="60" width="230" height="280" fill="#1b0f08" />
      {[120, 200, 280].map((y) => <rect key={y} x="520" y={y} width="230" height="6" fill="#3a2314" />)}
      {libros.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} opacity=".85" />)}
      {lamparas.map((l, i) => (
        <g key={i}>
          <line x1={l.x + 300 - 250} y1="0" x2={l.x + 300 - 250} y2={l.l} stroke="#120a05" strokeWidth="2" />
          <circle className="enf-fx-llama" cx={l.x + 50} cy={l.l + 40} r={150 + p * 30} fill="url(#fk-luz)" style={{ animationDelay: `${i * 1.3}s` } as CSSProperties} />
          <path d={`M${l.x + 50 - 26},${l.l + 22} h52 l14,22 h-80 Z`} fill="#c98a3d" />
          <ellipse cx={l.x + 50} cy={l.l + 44} rx="40" ry="5" fill="#ffd9a0" />
        </g>
      ))}
      <rect y="470" width={ANCHO} height="140" fill="url(#fk-mesa)" />
      <g fill="none" stroke="#000" opacity=".25" strokeWidth="2"><line x1="0" y1="520" x2="800" y2="520" /><line x1="0" y1="568" x2="800" y2="568" /></g>
      <g transform="translate(160 455)">
        <ellipse cx="40" cy="30" rx="58" ry="9" fill="#e8e0d4" /><path d="M0,0 h80 v18 q0,26 -40,26 q-40,0 -40,-26 Z" fill="#f3ede2" /><path d="M80,6 q22,0 22,14 q0,14 -22,14" fill="none" stroke="#f3ede2" strokeWidth="6" />
        <ellipse cx="40" cy="2" rx="38" ry="5" fill="#5a2f17" />
        <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55">
          <path className="enf-fx-vapor" d="M24,-4 q-8,-14 0,-26 q8,-12 0,-26" /><path className="enf-fx-vapor fx-vapor-2" d="M42,-4 q-8,-14 0,-26 q8,-12 0,-26" /><path className="enf-fx-vapor fx-vapor-3" d="M58,-4 q-8,-14 0,-26 q8,-12 0,-26" />
        </g>
      </g>
      <g transform="translate(540 478)"><rect width="120" height="14" fill="#7a3b2e" /><rect y="14" width="110" height="12" fill="#2f5d62" /><rect y="26" width="125" height="12" fill="#b0833a" /></g>
    </svg>
  );
}

/* ───────────────────────── Espacio ───────────────────────── */
export function Espacio({ p }: PropsEscena) {
  const fijas = useMemo(() => estrellasDe(51, 80, 600), []);
  const moviles = useMemo(() => {
    const r = azar(63);
    return Array.from({ length: 36 }, () => ({ y: r() * 600, r: 0.6 + r() * 1.2, t: 70 + r() * 90, d: -r() * 160, o: 0.4 + r() * 0.6 }));
  }, []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fe-cielo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#05020f" /><stop offset=".6" stopColor="#120a2a" /><stop offset="1" stopColor="#1b0f3a" /></linearGradient>
        <radialGradient id="fe-n1"><stop offset="0" stopColor="#ff4fa0" stopOpacity=".28" /><stop offset="1" stopColor="#ff4fa0" stopOpacity="0" /></radialGradient>
        <radialGradient id="fe-n2"><stop offset="0" stopColor="#4f7bff" stopOpacity=".3" /><stop offset="1" stopColor="#4f7bff" stopOpacity="0" /></radialGradient>
        <radialGradient id="fe-planeta" cx=".35" cy=".3"><stop offset="0" stopColor="#f2c995" /><stop offset=".6" stopColor="#c0764a" /><stop offset="1" stopColor="#5a2a22" /></radialGradient>
        <radialGradient id="fe-sombra" cx=".3" cy=".3"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" /></radialGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fe-cielo)" />
      <g className="enf-fx-deriva-lenta"><circle cx="200" cy="190" r="270" fill="url(#fe-n1)" /><circle cx="620" cy="400" r="300" fill="url(#fe-n2)" /></g>
      <Estrellas lista={fijas} />
      {moviles.map((s, i) => <circle key={i} className="enf-fx-estrella-mov" cx="0" cy={s.y} r={s.r} fill="#fff" opacity={s.o} style={{ animationDuration: `${s.t}s`, animationDelay: `${s.d}s` } as CSSProperties} />)}
      <g style={e(-p * 150, p * 25)}>
        <g transform="rotate(-18 650 140)"><ellipse cx="650" cy="140" rx="125" ry="26" fill="none" stroke="#e8c79a" strokeWidth="6" opacity=".45" /></g>
        <circle cx="650" cy="140" r="70" fill="url(#fe-planeta)" />
        <circle cx="650" cy="140" r="70" fill="url(#fe-sombra)" />
        <g transform="rotate(-18 650 140)"><path d="M525,140 a125,26 0 0 0 250,0" fill="none" stroke="#e8c79a" strokeWidth="6" opacity=".7" /></g>
      </g>
      <circle cx="130" cy="430" r="14" fill="#a9a6b8" /><circle cx="125" cy="425" r="14" fill="url(#fe-sombra)" />
      <line className="enf-fx-fugaz" x1="300" y1="60" x2="250" y2="90" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line className="enf-fx-fugaz enf-fx-fugaz-2" x1="560" y1="300" x2="510" y2="330" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── Otoño ───────────────────────── */
export function Otono({ p }: PropsEscena) {
  const arboles = useMemo(() => {
    const r = azar(71);
    const col = ["#a8431f", "#cf6a22", "#e8942e", "#8f3a1d"];
    const capa = (n: number, base: number, escala: number, o: number) =>
      Array.from({ length: n }, (_, i) => ({
        x: (i + 0.5) * (ANCHO / n) + (r() - 0.5) * 60, base: base + (r() - 0.5) * 14, s: escala * (0.8 + r() * 0.5), o,
        c: [col[Math.floor(r() * col.length)], col[Math.floor(r() * col.length)], col[Math.floor(r() * col.length)]],
      }));
    return [capa(7, 470, 0.7, 0.65), capa(5, 560, 1.1, 1)];
  }, []);
  const hojas = useMemo(() => {
    const r = azar(83);
    const col = ["#d9531e", "#f0a030", "#b8341c", "#e8c040", "#c4631e"];
    return Array.from({ length: 18 }, (_, i) => ({ x: r() * ANCHO, t: 11 + r() * 9, d: -r() * 18, c: col[i % col.length], s: 0.8 + r() * 0.9 }));
  }, []);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fo-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1712" /><stop offset=".45" stopColor="#7a3a22" /><stop offset=".85" stopColor="#f0a458" /><stop offset="1" stopColor="#f7d49a" /></linearGradient>
        <radialGradient id="fo-sol"><stop offset="0" stopColor="#ffe2a8" stopOpacity=".9" /><stop offset="1" stopColor="#ffe2a8" stopOpacity="0" /></radialGradient>
        <linearGradient id="fo-suelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a2a17" /><stop offset="1" stopColor="#2a130b" /></linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fo-cielo)" />
      <g style={e(0, p * 50)}><circle cx="540" cy="420" r="220" fill="url(#fo-sol)" /></g>
      {arboles.map((capa, ci) => (
        <g key={ci} className={`enf-fx-capa enf-fx-capa-${ci + 1}`}>
          {capa.map((a, i) => (
            <g key={i} opacity={a.o}>
              <rect x={a.x - 7 * a.s} y={a.base - 130 * a.s} width={14 * a.s} height={140 * a.s} fill={ci === 0 ? "#4a2418" : "#2d150d"} />
              <circle cx={a.x} cy={a.base - 170 * a.s} r={62 * a.s} fill={a.c[0]} />
              <circle cx={a.x - 46 * a.s} cy={a.base - 140 * a.s} r={44 * a.s} fill={a.c[1]} />
              <circle cx={a.x + 46 * a.s} cy={a.base - 142 * a.s} r={46 * a.s} fill={a.c[2]} />
            </g>
          ))}
        </g>
      ))}
      <rect y="535" width={ANCHO} height="80" fill="url(#fo-suelo)" />
      <g fill="#d9531e" opacity=".8"><ellipse cx="120" cy="545" rx="60" ry="9" /><ellipse cx="420" cy="552" rx="80" ry="10" fill="#e8942e" /><ellipse cx="690" cy="544" rx="70" ry="9" fill="#b8341c" /></g>
      {hojas.map((h, i) => (
        <g key={i} transform={`translate(${h.x} 0) scale(${h.s})`}>
          <path className="enf-fx-hoja" d="M0,0 C6,-8 16,-6 18,2 C14,10 4,10 0,0 Z" fill={h.c} style={{ animationDuration: `${h.t}s`, animationDelay: `${h.d}s` } as CSSProperties} />
        </g>
      ))}
    </svg>
  );
}

/* ───────────────────────── Cielo según la hora ───────────────────────── */
const PUNTOS: [number, string, string][] = [
  [0, "#05081a", "#101a3d"], [5, "#0b1030", "#3b2f6b"], [6.5, "#36508f", "#f19a6b"], [8.5, "#5aa0e0", "#bfe3f7"], [12, "#3b8ee0", "#a9dcf5"],
  [16.5, "#4b8fd0", "#cfe6ef"], [18.5, "#3d4f8c", "#f08a5d"], [20, "#1a1f4a", "#6a3a6b"], [21.5, "#070b22", "#151f48"], [24, "#05081a", "#101a3d"],
];
const hexA = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mezclar(h: number, k: 1 | 2): string {
  let i = 0;
  while (i < PUNTOS.length - 2 && h >= PUNTOS[i + 1][0]) i++;
  const [h0, , ] = PUNTOS[i];
  const [h1, , ] = PUNTOS[i + 1];
  const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  const a = hexA(PUNTOS[i][k]), b = hexA(PUNTOS[i + 1][k]);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * t)).join(",")})`;
}

const rgbAHex = (c: string) => "#" + (c.match(/\d+/g) ?? ["0", "0", "0"]).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join("");

export function Cielo({ hora }: { hora: number }) {
  const estrellas = useMemo(() => estrellasDe(91, 80, 360), []);
  const lejos = useMemo(() => sierra(53, 430, 170, 4), []);
  const medio = useMemo(() => sierra(59, 465, 100, 6), []);
  const pinos = useMemo(() => hileraPinos(61, 512, 14, 110, 56, 0, 300) + " " + hileraPinos(67, 515, 10, 90, 50, 560, ANCHO), []);
  const noche = hora < 5.5 || hora > 20.5 ? 1 : hora < 7 ? 1 - (hora - 5.5) / 1.5 : hora > 19 ? (hora - 19) / 1.5 : 0;
  const diaT = (hora - 6) / 13.2; // 0 al amanecer, 1 al ponerse el sol
  const sol = diaT >= -0.02 && diaT <= 1.02 ? pos(diaT) : null;
  // la luna sale cuando el sol ya se puso, y se va antes de que amanezca
  const lunaT = hora >= 19.6 ? (hora - 19.6) / 10.2 : hora < 5.8 ? (hora + 4.4) / 10.2 : -1;
  const luna = lunaT >= 0 && lunaT <= 1 ? pos(lunaT) : null;
  function pos(k: number) { return { x: 110 + k * 580, y: 430 - Math.sin(k * Math.PI) * 320 }; }
  // el sol se pone anaranjado cerca del horizonte
  const bajo = sol ? Math.max(0, Math.min(1, (sol.y - 200) / 220)) : 0;
  const colorSol = mezclaHex("#fff3c4", "#ff9a4d", bajo);
  const horizonte = mezclar(hora, 2);
  const capa = (dia: string, nocheC: string, tinte: number) => mezclaHex(mezclaHex(dia, horizonte.startsWith("rgb") ? rgbAHex(horizonte) : horizonte, tinte), nocheC, noche);
  return (
    <svg {...ref}>
      <defs>
        <linearGradient id="fc2-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mezclar(hora, 1)} /><stop offset="1" stopColor={horizonte} /></linearGradient>
        <linearGradient id="fc2-lago" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={horizonte} stopOpacity=".95" /><stop offset="1" stopColor={mezclar(hora, 1)} /></linearGradient>
        <radialGradient id="fc2-sol"><stop offset="0" stopColor={colorSol} stopOpacity=".9" /><stop offset=".35" stopColor={colorSol} stopOpacity=".35" /><stop offset="1" stopColor={colorSol} stopOpacity="0" /></radialGradient>
        <radialGradient id="fc2-luna"><stop offset="0" stopColor="#dfe6ff" stopOpacity=".28" /><stop offset="1" stopColor="#dfe6ff" stopOpacity="0" /></radialGradient>
        <linearGradient id="fc2-velo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".18" /><stop offset=".45" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#fc2-cielo)" />
      <Estrellas lista={estrellas} opacidad={noche} />
      {sol && <g><circle cx={sol.x} cy={sol.y} r="190" fill="url(#fc2-sol)" /><circle cx={sol.x} cy={sol.y} r="34" fill={colorSol} /></g>}
      {luna && <g opacity={noche}><circle cx={luna.x} cy={luna.y} r="130" fill="url(#fc2-luna)" /><circle cx={luna.x} cy={luna.y} r="28" fill="#f6f2dd" /><circle cx={luna.x - 8} cy={luna.y - 6} r="5" fill="#e4dfc6" /><circle cx={luna.x + 9} cy={luna.y + 8} r="3.5" fill="#e4dfc6" /></g>}
      <g className="enf-fx-nubes" opacity={0.3 + (1 - noche) * 0.45}>
        <g fill={mezclaHex("#ffffff", "#9aa6d6", noche)}>
          <ellipse cx="170" cy="170" rx="120" ry="18" /><ellipse cx="215" cy="156" rx="60" ry="20" /><ellipse cx="250" cy="190" rx="80" ry="11" />
          <ellipse cx="610" cy="118" rx="140" ry="18" /><ellipse cx="575" cy="102" rx="66" ry="22" /><ellipse cx="540" cy="140" rx="70" ry="10" />
        </g>
      </g>
      <path d={lejos} fill={capa("#7f9cc6", "#18224f", 0.35)} />
      <path d={medio} fill={capa("#4a7393", "#10183f", 0.2)} />
      <rect y="480" width={ANCHO} height="120" fill="url(#fc2-lago)" />
      {sol && sol.y < 470 && <Reflejo x={sol.x} y0={480} color={colorSol} ancho={90} />}
      {luna && luna.y < 470 && <g opacity={noche}><Reflejo x={luna.x} y0={480} color="#f6f2dd" ancho={60} /></g>}
      <path d={pinos} fill={capa("#1f4536", "#050916", 0)} />
      <path d="M0,525 C150,510 280,522 420,514 C560,506 690,522 800,512 V600 H0 Z" fill={capa("#173528", "#04070f", 0)} />
      <rect width={ANCHO} height={ALTO} fill="url(#fc2-velo)" />
    </svg>
  );
}
