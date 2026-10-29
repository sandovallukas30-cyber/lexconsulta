/** El logo de Prima Lex: «la hoja que es una P», una hoja de apunte cuyo contorno dibuja la P y cuya esquina doblada, en
 *  dorado, marca «página que se pasa». El fondo toma el color del tema elegido (el de acento). La versión con colores
 *  fijos, para el favicon y la app instalable, la genera scripts/generar_logo.mjs con el mismo dibujo. */
export function LogoPrimaLex({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="var(--accent-base)" />
      <path
        fillRule="evenodd"
        fill="#fff"
        d="M24 12H35A13 13 0 0 1 35 38H31V50A2 2 0 0 1 29 52H28L20 44V16A4 4 0 0 1 24 12ZM31 19.5H35A5.5 5.5 0 0 1 35 30.5H31Z"
      />
      <path d="M20 44H28V52Z" fill="#ffc94d" />
    </svg>
  )
}

/** El nombre con los dos pesos de la marca: «Prima» firme y «Lex» más liviano. */
export function NombrePrimaLex({ className = '' }: { className?: string }) {
  return (
    <span className={className} style={{ color: 'var(--neu-ink)' }}>
      <span className="font-extrabold">Prima</span> <span className="font-medium">Lex</span>
    </span>
  )
}
