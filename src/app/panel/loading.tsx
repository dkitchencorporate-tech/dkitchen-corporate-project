/**
 * Esqueleto del panel mientras el servidor verifica la sesión y carga los
 * datos. Sin él, tras «Entrar» la pantalla se queda congelada en el login y
 * parece que la web se ha colgado.
 */
export default function CargandoPanel() {
  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1B1D22]" aria-busy="true" aria-live="polite">
      <header className="border-b border-[#E6E6E2] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">
            D<span className="text-[#6E0C2B]">Kitchen</span>
          </h1>
          <div className="mt-1 h-3 w-28 rounded bg-[#EDEDEA] animate-pulse" />
        </div>
        <div className="h-4 w-20 rounded bg-[#EDEDEA] animate-pulse" />
      </header>
      <nav className="border-b border-[#E6E6E2] px-6 flex gap-4 py-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-20 rounded bg-[#EDEDEA] animate-pulse" />
        ))}
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <p className="text-sm text-[#6B7079]">Preparando tu panel…</p>
        <div className="h-8 w-40 rounded bg-[#EDEDEA] animate-pulse" />
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-[#E6E6E2] p-6 space-y-3">
            <div className="h-5 w-32 rounded bg-[#EDEDEA] animate-pulse" />
            <div className="h-4 w-full rounded bg-[#F3F3F0] animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-[#F3F3F0] animate-pulse" />
          </div>
        ))}
      </main>
    </div>
  );
}
