import { useCallback, useEffect, useRef, useState } from 'react'

export type EstadoVoz = 'inactivo' | 'reproduciendo' | 'pausado'

/** Los navegadores cortan (o dejan mudo) un SpeechSynthesisUtterance muy
 *  largo -- Chrome se queda callado a los ~15 s. Partir el texto en frases
 *  cortas y encolarlas hace que un apunte de 30 páginas se lea completo. */
function partirEnFragmentos(texto: string, max = 220): string[] {
  const oraciones = texto.split(/(?<=[.!?…])\s+|\n+/).map((o) => o.trim()).filter(Boolean)
  const fragmentos: string[] = []
  let acumulado = ''
  const cerrar = () => {
    if (acumulado) fragmentos.push(acumulado)
    acumulado = ''
  }
  for (const oracion of oraciones) {
    if (oracion.length > max) {
      cerrar()
      let resto = oracion
      while (resto.length > max) {
        let corte = resto.lastIndexOf(', ', max)
        if (corte < max / 2) corte = resto.lastIndexOf(' ', max)
        if (corte <= 0) corte = max
        fragmentos.push(resto.slice(0, corte + 1).trim())
        resto = resto.slice(corte + 1).trim()
      }
      if (resto) acumulado = resto
      continue
    }
    if (acumulado && acumulado.length + oracion.length + 1 > max) cerrar()
    acumulado = acumulado ? `${acumulado} ${oracion}` : oracion
  }
  cerrar()
  return fragmentos
}

/**
 * Envuelve la Web Speech API del navegador (SpeechSynthesis) para leer un
 * texto en voz alta -- nativa del sistema operativo, sin llamar a ningún
 * servicio ni IA. Pensada para un artículo a la vez: cambiar `texto` corta
 * la lectura anterior.
 */
export function useLecturaVoz(texto: string) {
  const [estado, setEstado] = useState<EstadoVoz>('inactivo')
  const [velocidad, setVelocidad] = useState(1)
  const generacionRef = useRef(0)
  const soportado = typeof window !== 'undefined' && 'speechSynthesis' in window

  // La lista de voces instaladas carga async en varios navegadores -- el
  // evento voiceschanged avisa cuando ya está lista.
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!soportado) return
    const actualizar = () => setVoces(window.speechSynthesis.getVoices())
    actualizar()
    window.speechSynthesis.addEventListener('voiceschanged', actualizar)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', actualizar)
  }, [soportado])

  const vozEspanol = voces.find((v) => v.lang.toLowerCase().startsWith('es-cl'))
    ?? voces.find((v) => v.lang.toLowerCase().startsWith('es'))
    ?? null

  const detener = useCallback(() => {
    if (!soportado) return
    generacionRef.current++
    window.speechSynthesis.cancel()
    setEstado('inactivo')
  }, [soportado])

  // Cambió de artículo (o se desmontó el componente): cortar cualquier
  // lectura en curso, nunca dejarla sonando de fondo en otra pantalla.
  useEffect(() => {
    return () => {
      if (soportado) window.speechSynthesis.cancel()
    }
  }, [texto, soportado])

  const reproducir = useCallback(() => {
    if (!soportado || !texto.trim()) return
    // Cada reproducción tiene su "generación": los eventos de fragmentos de
    // una lectura anterior (cancelada) llegan tarde y no deben pisar el
    // estado de la nueva.
    const generacion = ++generacionRef.current
    window.speechSynthesis.cancel()
    const fragmentos = partirEnFragmentos(texto)
    fragmentos.forEach((fragmento, i) => {
      const utterance = new SpeechSynthesisUtterance(fragmento)
      utterance.lang = vozEspanol?.lang ?? 'es-CL'
      if (vozEspanol) utterance.voice = vozEspanol
      utterance.rate = velocidad
      const ultimo = i === fragmentos.length - 1
      utterance.onend = () => {
        if (ultimo && generacion === generacionRef.current) setEstado('inactivo')
      }
      utterance.onerror = () => {
        if (generacion === generacionRef.current) setEstado('inactivo')
      }
      window.speechSynthesis.speak(utterance)
    })
    setEstado('reproduciendo')
  }, [soportado, texto, vozEspanol, velocidad])

  const pausar = useCallback(() => {
    if (!soportado) return
    window.speechSynthesis.pause()
    setEstado('pausado')
  }, [soportado])

  const reanudar = useCallback(() => {
    if (!soportado) return
    window.speechSynthesis.resume()
    setEstado('reproduciendo')
  }, [soportado])

  return { soportado, estado, reproducir, pausar, reanudar, detener, velocidad, setVelocidad }
}
