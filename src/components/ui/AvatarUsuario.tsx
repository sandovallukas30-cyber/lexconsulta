import { useState } from 'react'
import { useAjustes } from '../../store/useAjustes'
import { AvatarAnimal } from './AvatarAnimal'

/** Foto de perfil: el animal elegido en Configuración; si no hay, la foto de la cuenta; y si tampoco, la inicial del nombre. */
export function AvatarUsuario({ nombre, url, grande }: { nombre: string; url: string | null; grande?: boolean }) {
  const animal = useAjustes((s) => s.avatarAnimal)
  const [falla, setFalla] = useState(false)
  const tam = grande ? 'w-14 h-14 text-xl' : 'w-9 h-9 text-sm'
  if (animal) return <AvatarAnimal id={animal} className={grande ? 'w-14 h-14' : 'w-9 h-9'} />
  if (url && !falla) {
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFalla(true)} className={`${tam} rounded-full object-cover`} />
  }
  return (
    <span className={`${tam} rounded-full flex items-center justify-center font-extrabold text-white`} style={{ background: 'var(--accent-base)' }} aria-hidden="true">
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
