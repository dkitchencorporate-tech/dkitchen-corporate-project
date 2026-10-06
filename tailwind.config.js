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
        "linea-cava": "#D9D3CB",
        "linea-calida": "#E4E1DC",
        linea: "#E6E6E2", // borde por defecto
        papel: "#EDEDEA",
        crema: "#F7F5F2", // fondo de sección alterno
        exito: "#2F8F6B", // estados correctos
        background: "#FDFCF8", // Premium warm alabaster white
        foreground: "#0A0A0A", // Deep obsidian luxury black
        brand: "#D9531E", // Naranja quemado/terracota — actualizado 2026-09-21 (Parte 7, Sección 5): el OrangeRed puro leía a acento SaaS genérico, no a hostelería
        brandHover: "#B8451A",
        brandAccent: "#B8863B", // Mostaza/ámbar apagado — acento secundario minoritario, nunca sustituye a `brand` en el CTA principal
        trust: "#10B981", // WhatsApp/Trust Green
        "dash-bg": "#171008", // Negro base espresso — actualizado 2026-09-21 (Parte 7, Sección 5), mismo rol que el #050505 anterior
        "dash-surface": "#121212", // Dashboard surface elements
        "dash-surface-hover": "#1A1A1A", // Dashboard surface elements on hover
        "dash-border": "#2A2A2A", // Dashboard border
        "dash-accent": "#EAB308", // Dashboard gold accent
        "dash-text-primary": "#F3F4F6", // Dashboard main text
        "dash-text-secondary": "#9CA3AF" // Dashboard muted text
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
