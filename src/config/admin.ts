// Correos con acceso al panel de Administración (carga de jurisprudencia).
// El panel opera sobre el estado local del navegador (localStorage), así que
// esta lista solo controla la visibilidad de la pestaña, no un permiso de
// backend. Es suficiente porque nadie más comparte ese almacenamiento.
const ADMIN_EMAILS = ['sandovallukas30@gmail.com']

export function esAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
