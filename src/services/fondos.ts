import type { Sonido } from "./ambiente"

/** Fondos animados para el temporizador y el modo concentración. */
export type FondoId = "ninguno" | "auto" | "noche" | "bosque" | "playa" | "aurora" | "lluvia" | "ciudad" | "cafeteria" | "espacio" | "otono" | "foto";

export interface InfoFondo {
  id: FondoId; nombre: string; vista: string;
  /** El sonido que lo acompaña si se elige «con su sonido». */
  sonido: Sonido | null;
}

export const FONDOS: InfoFondo[] = [
  { id: "ninguno", nombre: "Sin fondo", vista: "linear-gradient(145deg, #F4F5F8, #DADCE3)", sonido: null },
  { id: "auto", nombre: "Según la hora", vista: "linear-gradient(180deg, #3b8ee0, #f19a6b 60%, #101a3d)", sonido: "viento" },
  { id: "noche", nombre: "Noche", vista: "linear-gradient(180deg, #070b1f, #2d3a7a)", sonido: "noche" },
  { id: "bosque", nombre: "Bosque", vista: "linear-gradient(180deg, #0c1f24, #3f7a62 70%, #9ec7a0)", sonido: "bosque" },
  { id: "playa", nombre: "Playa", vista: "linear-gradient(180deg, #2b1b4d, #e8605a 55%, #ffd9a0)", sonido: "playa" },
  { id: "aurora", nombre: "Aurora", vista: "linear-gradient(160deg, #040712, #0f6b5c 60%, #6b3fa0)", sonido: "viento" },
  { id: "lluvia", nombre: "Lluvia", vista: "linear-gradient(180deg, #0e1626, #2b4260 80%, #e4a86a)", sonido: "lluvia" },
  { id: "ciudad", nombre: "Ciudad", vista: "linear-gradient(180deg, #170f35, #4b2a73 65%, #f0a35e)", sonido: "ciudad" },
  { id: "cafeteria", nombre: "Cafetería", vista: "linear-gradient(180deg, #2b1a10, #8a5a32 70%, #f4c27a)", sonido: "cafe" },
  { id: "espacio", nombre: "Espacio", vista: "linear-gradient(150deg, #05020f, #3a1b6e 55%, #ff4fa0)", sonido: "espacio" },
  { id: "otono", nombre: "Otoño", vista: "linear-gradient(180deg, #2a1712, #b3542b 60%, #f7d49a)", sonido: "fuego" },
  { id: "foto", nombre: "Mi foto", vista: "linear-gradient(145deg, #c7d2fe, #fbcfe8)", sonido: null },
];

export const esFondo = (x: unknown): x is FondoId => FONDOS.some((f) => f.id === x);
export const infoFondo = (id: FondoId) => FONDOS.find((f) => f.id === id) as InfoFondo;
