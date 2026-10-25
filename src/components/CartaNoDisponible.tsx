/**
 * Lo que ve alguien de pie en una mesa cuando el QR no lleva a ninguna parte.
 *
 * Es una pantalla de error, pero el contexto cambia lo que debe decir. Quien la
 * está viendo no es un usuario navegando: es un cliente sentado, esperando a
 * pedir, y probablemente delante de un camarero. Así que no se disculpa en
 * abstracto —le dice qué hacer ahora mismo.
 *
 * Y no distingue entre "ese código no existe" y "ese restaurante está
 * desactivado". Dar esa diferencia permitiría recorrer códigos hasta averiguar
 * quiénes son clientes nuestros y quiénes han dejado de serlo.
 */
export default function CartaNoDisponible() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfaf8] px-6 text-[#1a1a1a]">
      <div className="max-w-sm text-center">
        <p className="text-4xl" aria-hidden="true">
          🍽️
        </p>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Esta carta no está disponible
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-black/55">
          El código no corresponde a ninguna carta activa. Puede que la pegatina esté
          dañada o que el restaurante haya dejado de usar este código.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-black/55">
          Pídele la carta al personal del local: ellos pueden atenderte igual.
        </p>
        <p className="mt-10 text-[11px] text-black/30">Carta digital de DKitchen</p>
      </div>
    </main>
  );
}
