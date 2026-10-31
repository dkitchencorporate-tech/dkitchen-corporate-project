// Esqueleto de carga de Central (31/10/2026): misma composición que una pantalla tipo
// (cabecera, indicadores y lista) mientras el servidor trae los datos reales.
export default function CargandoCentral() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10" aria-busy="true" aria-label="Cargando Central">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="cv-esqueleto h-8 w-44 rounded-xl" />
          <div className="cv-esqueleto h-3.5 w-64 max-w-[70vw] rounded-full" />
        </div>
        <div className="cv-esqueleto hidden h-11 w-36 rounded-full sm:block" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-linea bg-white p-4">
            <div className="cv-esqueleto h-3 w-20 rounded-full" />
            <div className="cv-esqueleto mt-3 h-7 w-12 rounded-lg" />
            <div className="cv-esqueleto mt-2.5 h-2.5 w-24 rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2.5 rounded-2xl border border-linea bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="cv-esqueleto h-9 w-9 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="cv-esqueleto h-3 w-1/3 rounded-full" />
              <div className="cv-esqueleto h-2.5 w-1/2 rounded-full" />
            </div>
            <div className="cv-esqueleto hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
