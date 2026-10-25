/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { 
    extend: { 
      colors: { 
        // ── Gran Reserva (paleta vigente desde el 29-30/09/2026; Parte 7 §5-bis). Migrado desde hexadecimales sueltos el 06/10/2026. ──
        vino: "#6E0C2B", // acento y CTA principal (globals.css da el degradado metalizado a .bg-vino)
        "vino-hondo": "#4A0819", // hover del CTA
        "vino-fondo": "#3E0515", // fondos vino profundos
        oro: "#D9B25C", // acento sobre fondo oscuro
        noche: "#0A080C", // negro profundo de las secciones oscuras
        obsidiana: "#0B0C0F",
        carbon: "#1B1D22", // superficies oscuras del panel
        tinta: "#17191E", // texto principal sobre claro
        grafito: "#3F434B", // texto secundario fuerte
        pizarra: "#5C616A", // texto de ayuda (AA sobre crema)
        niebla: "#6B7079", // texto secundario
        acero: "#8B8F97", // borde de controles (3:1)
        ceniza: "#9A9EA6", // texto terciario e iconos
        "linea-fuerte": "#D6D6D1",
        linea: "#E6E6E2", // borde por defecto
        papel: "#EDEDEA",
        crema: "#F7F5F2", // fondo de sección alterno
        exito: "#2F8F6B", // estados correctos
        background: "#FDFCF8", // Premium warm alabaster white
        foreground: "#0A0A0A", // Deep obsidian luxury black
      },
      boxShadow: {
        'premium': '0 40px 60px -15px rgba(0, 0, 0, 0.05)',
        'float': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }
    } 
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
