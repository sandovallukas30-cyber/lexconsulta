import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

export function RightSidebar() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const rightSidebarAbierto = useStore((s) => s.rightSidebarAbierto)
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar)
  const favoritos = useStore((s) => s.favoritos)
  const visitadosRecientes = useStore((s) => s.visitadosRecientes)
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const agregarVisitado = useStore((s) => s.agregarVisitado)
  const cargarConsulta = useStore((s) => s.cargarConsulta)
  const nuevaConsulta = useStore((s) => s.nuevaConsulta)
  const setCanvasActivo = useStore((s) => s.setCanvasActivo)

  const handleAbrirArticulo = (articulo: string, codigo: any) => {
    setCodigoExplorador(codigo)
    setVistaActiva('explorador')
    agregarVisitado(articulo, codigo)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: rightSidebarAbierto ? 280 : 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex flex-col border-l overflow-hidden ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-4 border-b ${
          modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
        }`}
      >
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Accesos rápidos
        </h2>
        <button
          onClick={toggleRightSidebar}
          title="Cerrar panel"
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            modoOscuro
              ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <i className="ti ti-chevron-right text-sm" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto space-y-6 px-3 py-4">
        {/* Favoritos */}
        <div>
          <h3 className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${
            modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Favoritos
          </h3>
          {favoritos.length > 0 ? (
            <div className="space-y-1.5">
              {favoritos.slice(0, 5).map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => {
                    if (fav.tipo === 'articulo') {
                      // TODO: Navigate to article
                    } else {
                      cargarConsulta(fav.id)
                    }
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors line-clamp-2 ${
                    modoOscuro
                      ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                  title={fav.titulo}
                >
                  <i className="ti ti-bookmark mr-1.5 text-[10px]" style={{ color: VERDE }} />
                  <span className="align-text-bottom">{fav.titulo}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-[11px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Sin favoritos aún
            </p>
          )}
        </div>

        {/* Recientes */}
        <div>
          <h3 className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${
            modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Recientes
          </h3>
          {visitadosRecientes.length > 0 ? (
            <div className="space-y-1.5">
              {visitadosRecientes.slice(0, 5).map((rec) => (
                <button
                  key={`${rec.codigo}-${rec.articulo}`}
                  onClick={() => handleAbrirArticulo(rec.articulo, rec.codigo)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    modoOscuro
                      ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                  title={rec.articulo}
                >
                  <i className="ti ti-history mr-1.5 text-[10px]" style={{ color: VERDE }} />
                  <span className="align-text-bottom">{rec.articulo}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-[11px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Sin historial aún
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${
            modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Acciones
          </h3>
          <div className="space-y-1.5">
            <button
              onClick={() => {
                nuevaConsulta()
                setVistaActiva('consultar')
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors font-medium ${
                modoOscuro
                  ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <i className="ti ti-messages text-sm" style={{ color: VERDE }} />
              <span>Nueva consulta</span>
            </button>
            <button
              onClick={() => {
                setCanvasActivo(null)
                setVistaActiva('canvas')
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors font-medium ${
                modoOscuro
                  ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <i className="ti ti-affiliate text-sm" style={{ color: VERDE }} />
              <span>Nuevo canvas</span>
            </button>
            <button
              onClick={() => setVistaActiva('practica')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors font-medium ${
                modoOscuro
                  ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <i className="ti ti-puzzle text-sm" style={{ color: VERDE }} />
              <span>Practicar</span>
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
