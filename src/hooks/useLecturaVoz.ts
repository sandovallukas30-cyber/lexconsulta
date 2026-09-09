import { useCallback, useEffect, useRef, useState } from 'react'

export type EstadoVoz = 'inactivo' | 'reproduciendo' | 'pausado'

/**
 * Envuelve la Web Speech API del navegador (SpeechSynthesis) para leer un
 * texto en voz alta -- nativa del sistema operativo, sin llamar a ningún
 * servicio ni IA. Pensada para un artículo a la vez: cambiar `texto` corta
 * la lectura anterior.
 */
export function useLecturaVoz(texto: string) {
  const [estado, setEstado] = useState<EstadoVoz>('inactivo')
  const [velocidad, setVelocidad] = useState(1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
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
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(texto)
    utterance.lang = vozEspanol?.lang ?? 'es-CL'
    if (vozEspanol) utterance.voice = vozEspanol
    utterance.rate = velocidad
    utterance.onend = () => setEstado('inactivo')
    utterance.onerror = () => setEstado('inactivo')
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
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
