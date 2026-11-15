/** Lo inyecta `define` en vite.config.ts al compilar. */
declare const __VERSION_APP__: string

// pdfmake no trae tipos: se usa solo en services/apunteDescargarPdf.ts (carga diferida)
declare module 'pdfmake/build/pdfmake'
declare module 'pdfmake/build/vfs_fonts'
