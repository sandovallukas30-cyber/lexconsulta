/** Sonido ambiente generado en el momento (sin archivos de audio). */
export type Sonido = "apagado" | "cafe" | "lluvia" | "blanco" | "viento" | "bosque" | "playa" | "noche" | "ciudad" | "fuego" | "espacio" | "lofi";

/** Los que se pueden elegir a mano, con su nombre. */
export const SONIDOS: [Sonido, string][] = [
  ["apagado", "Silencio"], ["lluvia", "Lluvia"], ["cafe", "Café"], ["blanco", "Ruido blanco"], ["viento", "Viento"], ["bosque", "Bosque"],
  ["playa", "Olas"], ["noche", "Grillos"], ["ciudad", "Ciudad"], ["fuego", "Fogata"], ["espacio", "Espacio"], ["lofi", "Lofi"],
];

let ctx: AudioContext | null = null;
let salida: GainNode | null = null;
/** Todo lo que está sonando ahora, para poder apagarlo limpio. */
let fuentes: AudioScheduledSourceNode[] = [];
let nodos: AudioNode[] = [];
let temporizadores: ReturnType<typeof setTimeout>[] = [];
let actual: Sonido = "apagado";

type Color = "blanco" | "marron" | "rosa";

/** Un trozo de ruido de 4 segundos que se repite sin que se note el corte. */
function ruido(c: AudioContext, tipo: Color): AudioBuffer {
  const largo = c.sampleRate * 4;
  const buf = c.createBuffer(1, largo, c.sampleRate);
  const d = buf.getChannelData(0);
  let ultimo = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < largo; i++) {
    const w = Math.random() * 2 - 1;
    if (tipo === "marron") {
      ultimo = (ultimo + 0.02 * w) / 1.02;
      d[i] = ultimo * 3.5;
    } else if (tipo === "rosa") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

function bucle(c: AudioContext, tipo: Color): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = ruido(c, tipo);
  s.loop = true;
  fuentes.push(s);
  return s;
}

function filtro(c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  nodos.push(f);
  return f;
}

function ganar(c: AudioContext, v: number): GainNode {
  const g = c.createGain();
  g.gain.value = v;
  nodos.push(g);
  return g;
}

/** Oscilador lento que mueve un parámetro (para que el viento y las olas suban y bajen). */
function lfo(c: AudioContext, hz: number, profundidad: number, destino: AudioParam) {
  const o = c.createOscillator();
  o.frequency.value = hz;
  const g = ganar(c, profundidad);
  o.connect(g).connect(destino);
  o.start();
  fuentes.push(o);
}

function luego(fn: () => void, ms: number) {
  temporizadores.push(setTimeout(fn, ms));
}

/** Repite `fn` a intervalos al azar entre `min` y `max` milisegundos mientras suene este sonido. */
function alAzar(tipo: Sonido, min: number, max: number, fn: () => void) {
  const paso = () => {
    if (actual !== tipo) return;
    fn();
    luego(paso, min + Math.random() * (max - min));
  };
  luego(paso, min * Math.random());
}

/* ───── Voces sueltas ───── */

function trino(c: AudioContext, destino: AudioNode) {
  const base = 2400 + Math.random() * 2200;
  const notas = 2 + Math.floor(Math.random() * 4);
  const t0 = c.currentTime + 0.02;
  for (let i = 0; i < notas; i++) {
    const o = c.createOscillator();
    const g = ganar(c, 0);
    o.type = "sine";
    const t = t0 + i * 0.13;
    o.frequency.setValueAtTime(base * (1 + Math.random() * 0.1), t);
    o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + 0.12);
  }
}

function grillo(c: AudioContext, destino: AudioNode, hz: number) {
  const t0 = c.currentTime + 0.02;
  const o = c.createOscillator();
  const g = ganar(c, 0);
  o.type = "sine";
  o.frequency.value = hz;
  o.connect(g).connect(destino);
  for (let i = 0; i < 3; i++) {
    const t = t0 + i * 0.09;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.012);
    g.gain.linearRampToValueAtTime(0, t + 0.06);
  }
  o.start(t0);
  o.stop(t0 + 0.4);
}

function chispa(c: AudioContext, destino: AudioNode) {
  const largo = Math.floor(c.sampleRate * (0.005 + Math.random() * 0.03));
  const buf = c.createBuffer(1, largo, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo);
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = ganar(c, 0.15 + Math.random() * 0.5);
  s.connect(filtro(c, "highpass", 1200)).connect(g).connect(destino);
  s.start();
}

function tintineo(c: AudioContext, destino: AudioNode) {
  const t = c.currentTime + 0.01;
  const o = c.createOscillator();
  const g = ganar(c, 0);
  o.type = "sine";
  o.frequency.value = 2200 + Math.random() * 1800;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.025, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + 0.4);
}

/** Una nota suave con ataque lento (para acordes y pads). */
function nota(c: AudioContext, destino: AudioNode, hz: number, t: number, dur: number, vol: number, tipo: OscillatorType = "triangle") {
  const o = c.createOscillator();
  const g = ganar(c, 0);
  o.type = tipo;
  o.frequency.value = hz;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.3));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const frecuencia = (semitonos: number) => 261.63 * Math.pow(2, semitonos / 12);

/* ───── Cada paisaje sonoro ───── */

function construir(c: AudioContext, tipo: Sonido, mezcla: AudioNode) {
  switch (tipo) {
    case "blanco": {
      bucle(c, "blanco").connect(mezcla);
      break;
    }
    case "cafe": {
      bucle(c, "marron").connect(mezcla);
      const murmullo = ganar(c, 0.25);
      bucle(c, "rosa").connect(filtro(c, "bandpass", 900, 0.8)).connect(murmullo).connect(mezcla);
      lfo(c, 0.13, 0.12, murmullo.gain);
      alAzar("cafe", 3500, 9000, () => tintineo(c, mezcla));
      break;
    }
    case "lluvia": {
      bucle(c, "blanco").connect(filtro(c, "highpass", 700)).connect(filtro(c, "lowpass", 7000)).connect(mezcla);
      break;
    }
    case "viento": {
      const g = ganar(c, 0.5);
      bucle(c, "rosa").connect(filtro(c, "bandpass", 450, 0.6)).connect(g).connect(mezcla);
      lfo(c, 0.07, 0.3, g.gain);
      break;
    }
    case "bosque": {
      const g = ganar(c, 0.28);
      bucle(c, "rosa").connect(filtro(c, "bandpass", 380, 0.5)).connect(g).connect(mezcla);
      lfo(c, 0.06, 0.12, g.gain);
      const hojas = ganar(c, 0.06);
      bucle(c, "blanco").connect(filtro(c, "bandpass", 4200, 0.9)).connect(hojas).connect(mezcla);
      lfo(c, 0.09, 0.05, hojas.gain);
      alAzar("bosque", 1800, 6500, () => trino(c, mezcla));
      break;
    }
    case "playa": {
      const mar = ganar(c, 0.2);
      const f = filtro(c, "lowpass", 1100);
      bucle(c, "rosa").connect(f).connect(mar).connect(mezcla);
      lfo(c, 0.11, 0.18, mar.gain);
      lfo(c, 0.11, 600, f.frequency);
      const espuma = ganar(c, 0.04);
      bucle(c, "blanco").connect(filtro(c, "highpass", 2800)).connect(espuma).connect(mezcla);
      lfo(c, 0.11, 0.035, espuma.gain);
      break;
    }
    case "noche": {
      const g = ganar(c, 0.12);
      bucle(c, "rosa").connect(filtro(c, "bandpass", 300, 0.5)).connect(g).connect(mezcla);
      alAzar("noche", 450, 1200, () => grillo(c, mezcla, 4300 + Math.random() * 300));
      alAzar("noche", 700, 1700, () => grillo(c, mezcla, 3900 + Math.random() * 300));
      break;
    }
    case "ciudad": {
      const trafico = ganar(c, 0.9);
      bucle(c, "marron").connect(filtro(c, "lowpass", 520)).connect(trafico).connect(mezcla);
      lfo(c, 0.05, 0.3, trafico.gain);
      const lluvia = ganar(c, 0.35);
      bucle(c, "blanco").connect(filtro(c, "highpass", 1500)).connect(filtro(c, "lowpass", 6500)).connect(lluvia).connect(mezcla);
      break;
    }
    case "fuego": {
      const base = ganar(c, 0.8);
      bucle(c, "marron").connect(filtro(c, "lowpass", 320)).connect(base).connect(mezcla);
      lfo(c, 0.4, 0.2, base.gain);
      alAzar("fuego", 60, 520, () => chispa(c, mezcla));
      break;
    }
    case "espacio": {
      const g = ganar(c, 0.5);
      g.connect(mezcla);
      const tonos: [number, number][] = [[55, 0.12], [82.4, 0.08], [110.3, 0.05]];
      for (const [hz, vol] of tonos) {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = hz;
        const v = ganar(c, vol);
        o.connect(v).connect(g);
        o.start();
        fuentes.push(o);
        lfo(c, 0.03 + Math.random() * 0.05, vol * 0.6, v.gain);
      }
      const brillo = ganar(c, 0.015);
      bucle(c, "blanco").connect(filtro(c, "bandpass", 5200, 3)).connect(brillo).connect(mezcla);
      lfo(c, 0.1, 0.012, brillo.gain);
      break;
    }
    case "lofi": {
      const pad = ganar(c, 0.55);
      pad.connect(filtro(c, "lowpass", 1100)).connect(mezcla);
      // Cmaj7 – Am7 – Dm7 – G7, repetidos; cada acorde dura 6 segundos.
      const acordes: number[][] = [[0, 4, 7, 11], [-3, 0, 4, 7], [2, 5, 9, 12], [-5, -1, 2, 5]];
      const bajos = [-24, -27, -22, -29];
      const pentatonica = [0, 2, 4, 7, 9, 12, 14, 16];
      let k = 0;
      const compas = () => {
        if (actual !== "lofi") return;
        const t = c.currentTime + 0.05;
        const a = acordes[k % acordes.length];
        for (const s of a) nota(c, pad, frecuencia(s - 12), t, 6.2, 0.07);
        nota(c, pad, frecuencia(bajos[k % bajos.length]), t, 5.5, 0.12, "sine");
        // Un par de notas sueltas encima, como una melodía distraída.
        for (let i = 0; i < 3; i++) if (Math.random() < 0.65) nota(c, pad, frecuencia(pentatonica[Math.floor(Math.random() * pentatonica.length)]), t + 0.8 + i * 1.7 + Math.random() * 0.4, 1.6, 0.05, "sine");
        k++;
        luego(compas, 6000);
      };
      compas();
      // Chasquido de vinilo.
      const vinilo = ganar(c, 0.03);
      bucle(c, "rosa").connect(filtro(c, "highpass", 3500)).connect(vinilo).connect(mezcla);
      alAzar("lofi", 400, 2200, () => chispa(c, mezcla));
      break;
    }
    default:
      break;
  }
}

export function detenerSonido() {
  actual = "apagado";
  temporizadores.forEach(clearTimeout);
  temporizadores = [];
  for (const f of fuentes) {
    try { f.stop(); } catch { /* ya estaba detenido */ }
    try { f.disconnect(); } catch { /* ya estaba desconectado */ }
  }
  fuentes = [];
  for (const n of nodos) { try { n.disconnect(); } catch { /* ya estaba desconectado */ } }
  nodos = [];
}

export function ponerSonido(tipo: Sonido, volumen: number) {
  detenerSonido();
  if (tipo === "apagado") return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    salida ??= ctx.createGain();
    salida.gain.value = volumen;
    salida.connect(ctx.destination);
    actual = tipo;
    construir(ctx, tipo, salida);
    for (const f of fuentes) if (f instanceof AudioBufferSourceNode) f.start();
  } catch {
    /* sin audio disponible */
  }
}

export function ponerVolumen(volumen: number) {
  if (salida) salida.gain.value = volumen;
}
