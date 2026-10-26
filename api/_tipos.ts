// Tipos mínimos de la petición y la respuesta de una función de Vercel (Node).
//
// Se declaran aquí, en vez de importarlos del paquete `@vercel/node`, porque ese paquete trae consigo toda la
// herramienta de línea de comandos de Vercel (cientos de dependencias, con decenas de avisos de seguridad) y solo se
// usaba para estos dos tipos. Vercel compila las funciones con su propio constructor, sin necesitar el paquete.
//
// El guion bajo inicial hace que Vercel NO trate este archivo como una función (un endpoint más).

import type { IncomingMessage, ServerResponse } from 'node:http'

/** Petición: la de Node más lo que Vercel agrega ya interpretado. */
export interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  cookies: Record<string, string | undefined>
  /** Cuerpo ya leído (JSON → objeto; texto → string). Como en el paquete original es `any`: cada función lo valida. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

/** Respuesta: la de Node más los atajos de Vercel. */
export interface VercelResponse extends ServerResponse {
  status: (codigo: number) => VercelResponse
  json: (cuerpo: unknown) => VercelResponse
  send: (cuerpo: unknown) => VercelResponse
  redirect: (urlOCodigo: string | number, url?: string) => VercelResponse
}
