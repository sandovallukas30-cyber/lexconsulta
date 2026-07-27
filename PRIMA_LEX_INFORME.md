# Prima Lex — Informe Completo

**Última actualización:** Julio 2026  
**Versión:** 0.1.0 (MVP Activo)  
**Estado:** Desarrollo Activo

---

## 1. RESUMEN EJECUTIVO

**Prima Lex** es una plataforma web de educación legal y consulta jurídica especializada en legislación chilena. Combina acceso a códigos legales completos, herramientas interactivas de aprendizaje, y consultas asistidas por IA para hacer el derecho más accesible a ciudadanos, estudiantes y profesionales.

**Misión:** Democratizar el acceso al conocimiento jurídico chileno eliminando barreras de comprensión y accesibilidad.

**Visión:** Ser la plataforma de referencia para educación legal en Chile, con herramientas que permitan a personas sin formación legal entender sus derechos y deberes.

---

## 2. CONTEXTO Y MOTIVACIÓN

El proyecto nace de la observación de que:
- La mayoría de personas tiene **miedo de leer una ley**
- Estudiantes de derecho **estudian mecánicamente** sin realmente entender
- No existe una plataforma **accesible y gratuita** que centralice legislación chilena con herramientas educativas

**Objetivo estratégico:** Construir una base técnica sólida que permita aproximarse a profesionales de IA jurídica e inversores en Chile con un producto funcional y escalable.

---

## 3. STACK TECNOLÓGICO

### Frontend
- **Framework:** React 19.2 + TypeScript 6
- **Styling:** Tailwind CSS 4.3 + CSS Variables (sistema de 6 temas)
- **Animaciones:** Framer Motion 12.39
- **Bundler:** Vite 8.0
- **Estado Global:** Zustand 5.0 (localStorage persistido)
- **Markdown:** React Markdown + remarkGfm

### Backend / IA
- **LLM:** Claude API (Sonnet 4.5 para consultas, Haiku para generación)
- **Deployment:** Vercel (auto-deploy en push a main)
- **Rate Limiting:** Por IP (3/día anónimo) + por email (10/día registrado)

### Datos
- **Códigos:** 28 códigos legales chilenos (~3000+ artículos)
- **Jurisprudencia:** 30 entradas (20 DT + 10 sentencias Tribunal Ambiental)
- **Persistencia:** Zustand + localStorage en cliente

### DevOps
- **Versionado:** Git + GitHub
- **CI/CD:** GitHub Actions (linters, type-check)
- **Hosting:** Vercel Functions

---

## 4. ARQUITECTURA

### Estructura de Carpetas
```
src/
├── components/
│   ├── layout/           (Sidebar, Topbar, RightSidebar)
│   ├── views/            (7 vistas: Consultar, Situación, Canvas, Mapa, 
│   │                      Explorador, Práctica, Admin)
│   └── ui/               (Componentes reutilizables: CitaBlock, 
│                          JurisprudenciaToggle, etc)
├── services/             (Lógica: pasapalabra, ahorcado, búsqueda, IA)
├── store/                (useStore.ts - Zustand con persistencia v24)
├── types/                (Tipos TypeScript centralizados)
├── data/                 (Datos estáticos: códigos, jurisprudencia)
├── hooks/                (useChat, custom hooks)
├── theme.ts              (Sistema de 6 temas de color)
└── App.tsx               (Router de vistas)
```

### Flujo de Datos
```
Usuario Input
    ↓
Component (ConsultarView, etc)
    ↓
Hook (useChat, useCodigo, etc)
    ↓
Service (busqueda, consultar, generarRosco)
    ↓
API/IA (Claude) O Datos Locales
    ↓
Store (Zustand) → localStorage
    ↓
Component Render
```

---

## 5. FUNCIONALIDADES IMPLEMENTADAS

### 5.1 Vista Consultar
- **Descripción:** Chat asistido por IA sobre legislación chilena
- **Características:**
  - Búsqueda automática en códigos activos
  - Toggle de perfil: Ciudadano (lenguaje simple) / Profesional (terminología técnica)
  - **Toggle de jurisprudencia:** Opción para incluir sentencias/dictámenes relevantes
  - Historial de consultas persistido
  - Citas automáticas a artículos (formato verificado)
  - Rate limiting: 3 consultas/día anónimo, 10/día registrado
- **IA:** Claude Sonnet 4.5
- **Costo:** ~$0.002-0.005 por consulta

### 5.2 Vista Situación
- **Descripción:** Análisis de casos mediante preguntas estructuradas
- **Características:**
  - Flujo guiado de preguntas
  - Análisis contextual por IA
  - Recomendaciones prácticas
- **IA:** Claude Sonnet 4.5

### 5.3 Vista Canvas
- **Descripción:** Mapeo visual de conceptos y casos
- **Características:**
  - Creación de nodos y conexiones
  - Persistencia en localStorage
  - Exportación (JSON)
  - Visualización de relaciones
- **IA:** No requiere

### 5.4 Vista Mapa
- **Descripción:** Visualización de relaciones entre artículos
- **Características:**
  - Grafo interactivo con xyflow
  - Visualización de remisiones legales
  - Zoom/pan
- **Estado:** Parcialmente funcional (requiere finalización)

### 5.5 Vista Explorador
- **Descripción:** Navegación artículo por artículo
- **Características:**
  - Selector de código legal
  - Búsqueda dentro del código
  - Vista expandible de artículos
  - Links a artículos relacionados (remisiones)
- **IA:** No requiere

### 5.6 Vista Práctica (Juegos Educativos)

#### 5.6.1 Pasapalabra Jurídico
- **Descripción:** Juego educativo tipo rosco con palabras legales
- **Características:**
  - 27 letras (A-Z + Ñ)
  - 6 áreas de práctica (general, civil, penal, laboral, procesal, constitucional)
  - Tiempo: 5 minutos
  - Pistas: 3 máximo (15 seg cada una)
  - Records personales por área
  - Modo estudio (sin cronómetro)
  - Feedback inmediato (verde/rojo)
- **IA:** Claude Haiku (~$0.001/partida)
- **Generación:** Dinámica (cada partida genera nuevas palabras)

#### 5.6.2 El Acusado (Ahorcado Legal)
- **Descripción:** Hangman con palabras y casos legales
- **Características:**
  - 6 etapas de caso (Denuncia → Investigación → Formalización → Acusación → Juicio → Sentencia)
  - 6 áreas de práctica
  - Definición de palabras
  - Records por área
- **IA:** Claude Haiku (~$0.001/partida)

### 5.7 Vista Historial
- **Descripción:** Archivo de consultas previas
- **Características:**
  - Lista de todas las consultas realizadas
  - Búsqueda dentro del historial
  - Recuperación de conversaciones
  - Filtro por módulo
- **Persistencia:** localStorage

### 5.8 Vista Admin
- **Descripción:** Panel de administración (restringido)
- **Características:**
  - CRUD completo de jurisprudencia
  - Visualización de 30 entradas (DT + Tribunal Ambiental)
  - Edición de campos: materia, resumen, artículos relacionados
  - Eliminación de entradas
- **Restricción:** Solo sandovallukas30@gmail.com
- **Persistencia:** localStorage

---

## 6. SISTEMA DE AUTENTICACIÓN

### Tipos de Usuario
1. **Anónimo**
   - Límite: 3 consultas/día por IP
   - Acceso a: Consultar, Situación, Canvas, Mapa, Explorador, Práctica
   - Sin historial persistido

2. **Registrado (Magic Link)**
   - Límite: 10 consultas/día por email
   - Acceso a: Todas las vistas + Historial
   - Email: guardado en Zustand (usuarioEmail)
   - Verificación: Link en correo
   - Persistencia: localStorage

3. **Admin**
   - Email: sandovallukas30@gmail.com
   - Acceso a: Vista Admin
   - Funcionalidad: CRUD jurisprudencia

---

## 7. JURISPRUDENCIA

### Dataset Actual (30 Entradas)
- **20 Dictámenes de la Dirección del Trabajo**
  - Fuente: dt.gob.cl
  - Temas: Negociación colectiva, jornada, remuneración, protecciones laborales
  - Período: Febrero - Julio 2026

- **10 Sentencias del Segundo Tribunal Ambiental**
  - Fuente: tribunalambiental.cl
  - Temas: Evaluación ambiental, multas, recursos hídricos, ruido
  - Período: Marzo - Julio 2026

### Estructura (EntradaJurisprudencia)
```typescript
{
  id: string (único, "seed-*")
  organo: "Dirección del Trabajo" | "Segundo Tribunal Ambiental"
  referencia: "ORD. N°319/30" | "Rol R-505-2025"
  fecha: "2026-07-03"
  codigo?: "lab" | "pen" | ... (opcional)
  materia: string (resumen de ~5-8 palabras)
  resumen: string (3-4 líneas, técnico)
  articulosRelacionados: string[] (ej: ["Art. 40 LOSMA"])
  url?: string (enlace a fuente oficial)
}
```

### Búsqueda de Jurisprudencia
- **Función:** `buscarJurisprudenciaRelevante(consulta: string)`
- **Algoritmo:** Búsqueda por palabras clave en título/resumen
- **Resultado:** Máximo 3 entradas por consulta
- **Costo:** Ninguno (búsqueda local)

### Integración en Consultas
- **Toggle:** "Con jurisprudencia" (activable por usuario)
- **Cuando activo:** Jurisprudencia relevante se incluye en el prompt de Claude
- **Visualización:** Formateada en markdown (títulos, órgano, resumen)

---

## 8. DISEÑO Y UX

### Sistema de Temas (6 opciones)
1. **Esmeralda** (predeterminado) - Verde institucional
2. **Índigo** - Azul profesional
3. **Borgoña** - Vino tinto
4. **Violeta** - Moderno/Juvenil
5. **Ámbar** - Cálido/Energético
6. **Pizarra** - Gris azulado neutro

### Modos
- **Modo Oscuro:** Toggle persistido en store
- **Modo Claro:** Paleta de zinc/blanco

### Componentes Reutilizables
- **CitaBlock:** Artículos expandibles con citas
- **JurisprudenciaToggle:** Toggle "Con jurisprudencia"
- **ModalPerfil:** Selector de perfil + configuración
- **ModalRegistro:** Registro por magic link
- **Omnibar:** Búsqueda global (Cmd+K)

### Patrones
- Transiciones suaves con Framer Motion
- Iconos Tabler Icons (ti-*)
- Cards con bordes redondeados
- Feedback visual inmediato

---

## 9. MÉTRICAS Y ESTADÍSTICAS

### Cobertura de Contenido
- **Códigos legales:** 28 (completos)
- **Artículos:** ~3000+ artículos indexados
- **Jurisprudencia:** 30 entradas curadas

### Rendimiento
- **Carga inicial:** ~2-3 segundos (con lazy loading de códigos)
- **Consulta con IA:** 2-5 segundos (Claude Sonnet)
- **Generación de rosco:** 1-2 segundos (Claude Haiku)

### Costos IA (Estimado Mensual)
- **Consultas:** 1000 consultas × $0.002 = $2
- **Pasapalabra:** 500 partidas × $0.001 = $0.50
- **Total:** ~$2.50/mes (sin uso premium)

---

## 10. ROADMAP (12 SEMANAS)

### Fase 1: Quick Wins (Semana 1-2)
- [x] Jurisprudencia con toggle en Consultar
- [ ] Mejora visual del toggle
- [ ] Omnibar (búsqueda global Cmd+K)
- [ ] Sidebar derecho (favoritos + recientes)

### Fase 2: Features Funcionales (Semana 3-4)
- [ ] Mapa completamente funcional (xyflow)
- [ ] Compartir citas (URL, QR, PDF)
- [ ] IndexedDB para caché de códigos
- [ ] Quiz educativo (nuevo juego)

### Fase 3: IA Inteligencia (Semana 5-6)
- [ ] Embeddings semánticos para búsqueda
- [ ] Resúmenes automáticos de artículos
- [ ] Jurisprudencia en análisis de casos
- [ ] Explicaciones interactivas (glosario)

### Fase 4: Premium Features (Semana 7+)
- [ ] Generador de documentos (cartas, demandas)
- [ ] Análisis de riesgos legales
- [ ] Memoria conversacional mejorada
- [ ] Expansión a otras jurisdicciones

---

## 11. MODELO DE MONETIZACIÓN

### Estrategia Freemium (Futuro)

**Tier Gratuito**
- 10 consultas/día
- Acceso a: Consultar, Práctica, Explorador, Historial
- Sin jurisprudencia automática

**Tier Profesional** ($9.99/mes)
- Consultas ilimitadas
- Jurisprudencia incluida automáticamente
- Acceso a generador de documentos
- Análisis de riesgos legales
- Prioridad en respuestas

**Tier Empresa** (Personalizado)
- API access
- Integración custom
- SLA

### Costo Actual (MVP)
- **Hosting:** Vercel Free ($0)
- **IA:** Claude API (~$2-5/mes)
- **Total:** ~$2-5/mes (sin escala)

---

## 12. SEGURIDAD Y PRIVACIDAD

### Protecciones Implementadas
- **Email magic link:** Verificación sin contraseña
- **Admin restringido:** Solo sandovallukas30@gmail.com
- **Rate limiting:** Por IP + por email
- **localStorage:** Datos persistidos solo en cliente

### Datos Manejados
- Email (solo para registrados)
- Historial de consultas (localStorage)
- Preferencias de usuario (tema, perfil, etc)

### RGPD/Privacidad
- [ ] Política de privacidad (pendiente)
- [ ] Términos de servicio (pendiente)
- [ ] Derecho al olvido (pendiente)

---

## 13. ESTADO ACTUAL

### ✅ Completado
- [x] Diseño y arquitectura base
- [x] 28 códigos legales indexados
- [x] Integración Claude API
- [x] Pasapalabra jurídico (juego funcional)
- [x] El Acusado (juego funcional)
- [x] Consultar con IA (ciudadano + profesional)
- [x] Jurisprudencia (30 entradas curadas)
- [x] Toggle de jurisprudencia en Consultar
- [x] Admin panel (CRUD jurisprudencia)
- [x] Historial persistido
- [x] Sistema de autenticación (magic link)
- [x] Rate limiting (IP + email)
- [x] 6 temas de color
- [x] Modo oscuro/claro
- [x] Sidebar + Topbar + UI completa

### 🔄 En Progreso
- [ ] Optimización visual/UX
- [ ] Testing exhaustivo
- [ ] Documentación de APIs

### ⏳ Pendiente
- [ ] Mapa completamente funcional
- [ ] Búsqueda semántica (embeddings)
- [ ] Compartir citas/consultas
- [ ] Quiz educativo
- [ ] Generador de documentos
- [ ] Análisis de riesgos
- [ ] Expansión a otras jurisdicciones

---

## 14. CÓMO USAR

### Para Usuarios
1. **Consultar:** Acceder a Consultar, escribir pregunta, recibir respuesta con citas
2. **Aprender:** Jugar Pasapalabra o El Acusado en vista Práctica
3. **Explorar:** Navegar códigos en Explorador, ver artículos relacionados
4. **Registrarse:** Magic link en email, guardar historial

### Para Desarrolladores
1. Clonar: `git clone <repo>`
2. Instalar: `npm install`
3. Dev: `npm run dev` (Vite)
4. Build: `npm run build`
5. Desplegar: Push a main (auto-deploy en Vercel)

### Contribuir
- Crear rama: `git checkout -b feature/nombre`
- Hacer cambios
- Type-check: `npx tsc --noEmit`
- Build: `npm run build`
- Commit: `git commit -m "feat: descripción"`
- Push: `git push origin feature/nombre`
- PR en GitHub

---

## 15. CONCLUSIONES Y PRÓXIMOS PASOS

### Logros Hasta Ahora
Prima Lex es una **plataforma funcional y escalable** que demuestra:
- Arquitectura técnica sólida (React + TypeScript + Zustand)
- Integración exitosa con IA (Claude API)
- Contenido curado (30 sentencias/dictámenes)
- Experiencia de usuario coherente y accesible

### Oportunidades de Crecimiento
1. **Corto plazo:** Mejoras de UX, testing, optimización
2. **Mediano plazo:** Features premium (generador, análisis de riesgos)
3. **Largo plazo:** Expansión regional, API pública, modelo freemium

### Contacto
- Email: sandovallukas30@gmail.com
- GitHub: https://github.com/sandovallukas30-cyber/lexconsulta
- Deploy: https://prima-lex.vercel.app

---

**Prima Lex v0.1.0 | Julio 2026 | Proyecto en Desarrollo Activo**
