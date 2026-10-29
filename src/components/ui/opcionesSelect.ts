import { Children, Fragment, isValidElement, type ReactNode } from 'react'

/** Las opciones que declaran los hijos de un <SelectPrima> (<option> sueltos, dentro de <optgroup> o de fragmentos). */
export interface OpcionSelect {
  valor: string
  texto: string
  deshabilitada: boolean
  grupo: string | null
}

/** El texto plano de lo que va dentro de un <option> (puede venir en pedazos: «Video: {n}»). */
function textoDe(nodo: ReactNode): string {
  if (nodo === null || nodo === undefined || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('')
  if (isValidElement<{ children?: ReactNode }>(nodo)) return textoDe(nodo.props.children)
  return ''
}

/** Las opciones que declaran los hijos (<option> sueltos, dentro de <optgroup> o de fragmentos). */
export function opcionesDe(hijos: ReactNode, grupo: string | null = null): OpcionSelect[] {
  const salida: OpcionSelect[] = []
  Children.forEach(hijos, (h) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; label?: string; children?: ReactNode }>(h)) return
    if (h.type === 'optgroup') salida.push(...opcionesDe(h.props.children, h.props.label ?? ''))
    else if (h.type === 'option') {
      const texto = textoDe(h.props.children)
      salida.push({ valor: h.props.value !== undefined ? String(h.props.value) : texto, texto, deshabilitada: !!h.props.disabled, grupo })
    } else if (h.type === Fragment) salida.push(...opcionesDe(h.props.children, grupo))
  })
  return salida
}
