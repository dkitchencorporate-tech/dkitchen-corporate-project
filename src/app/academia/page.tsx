import type { Metadata } from 'next';
import Link from 'next/link';
import { exigirAcademia } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { PRECIOS_TEXTO as P } from '@/lib/academia/banco';
import AcademiaInicio, { type EstadoAcademia, type Tarjeta } from '@/components/academia/AcademiaInicio';
import FirmaContrato from '@/components/academia/FirmaContrato';
import { firmarContratoAction } from './contrato-actions';
import { contratoDe } from '@/lib/contratos';
import { leccionesVista, DATOS_CALCULADORAS } from '@/lib/academia/lecciones';
import type { ContratoFirmado } from '@/lib/contrato-comercial';
import '../admin-dkitchen/central-viva.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academia · DKitchen', robots: { index: false, follow: false } };

/**
 * Academia comercial (0112, 01/11): app aparte para comerciales. «En formación» solo ve esto; la base le
 * rechaza prospectar, dar altas y crear enlaces. Precios siempre de pricing-config (PRECIOS_TEXTO).
 */
const MODULOS: Tarjeta[] = [
  { titulo: 'M1 · Carta QR', frente: 'La carta del local en el móvil: por cantidad, 3 planes.', dorso: [`Carta ${P.carta}/mes · 40 platos, 1 idioma`, `Local ${P.local}/mes · primer mes ${P.primerMes} · 2 idiomas · pedido desde la mesa`, `Sala ${P.sala}/mes · 3 idiomas, reservas`, `Fundador: Sala a ${P.fundMes}/mes, cobro ${P.fundTri} por trimestre`, 'Sin permanencia · garantía 30 días en Local'] },
  { titulo: 'M2 · Signature', frente: 'La app propia del restaurante, para siempre.', dorso: [`Entrada ${P.sigEntrada} o ${P.sigCuotas}`, `Fundador Signature ${P.sigFund} (nunca en cuotas) + ${P.sigFundMes}/mes el 1.er año`, 'Exclusivo: carrito propio y asistente con IA', 'Si deja de pagar, se lleva su app', 'Nunca: «gratis», «te quitamos Glovo»'] },
  { titulo: 'M3 · Experience', frente: 'Eventos con entradas para los días flojos.', dorso: [`Primer evento ${P.exp1} · siendo cliente QR ${P.exp1Qr}`, 'Taquilla 100 % del local, con su Stripe', 'DKitchen: 0 % de comisión', 'Piloto hasta −50 % solo con OK de dirección', 'Nunca: «te llenamos el local»'] },
  { titulo: 'M4 · Dark Kitchen', frente: 'Varias marcas de reparto desde una cocina.', dorso: ['Ruta A (desde cero) y Ruta B (por marca)', 'El comercial cualifica y agenda', 'No cierra precio: va a reunión'] },
  { titulo: 'M5 · Lo que nunca se dice', frente: 'Las reglas que nada contradice.', dorso: ['DKitchen nunca cobra comisión', 'No se prometen resultados', 'Montaje gratis: nunca se anuncia', 'Ofertas solo de Central → Ofertas', 'Correo solo con consentimiento (LSSI)'] },
  { titulo: 'Palancas', frente: 'Qué puedes usar sin pedir permiso.', dorso: [`Sin permiso: Local ${P.primerMes}, Fundador, ofertas de Central, hasta 5 %`, `Puesta a punto a ${P.puestaB} tras pagar`, 'Con OK de dirección: 6–10 %, montaje gratis, piloto Experience, Signature fraccionado'] },
];
const PERFILES: Tarjeta[] = [
  ['Bar o local pequeño', 'Carta', '«¿Cuántas veces al día le preguntan qué hay?»', 'carta en pizarra o PDF, 1 camarero'],
  ['Restaurante con mesas', `Local (${P.primerMes} el 1.er mes)`, '«Le enseño su carta en el móvil, en 2 idiomas»', '10–15 mesas, turistas a ratos'],
  ['Sala con volumen', 'Sala o Fundador', '«Con su volumen, el Fundador le deja la Sala de por vida»', '20+ mesas, varios camareros'],
  ['Reparto o marca fuerte', 'Signature', '«¿Cuánto le deja cada mes en comisiones?»', 'Glovo/Just Eat, marca en redes'],
  ['Días flojos o espacio', 'Experience', '«¿Qué hace el martes con ese salón?»', 'terraza o salón vacío entre semana'],
  ['Varias marcas', 'Dark Kitchen', '«¿Cuántas marcas podría sacar de esta cocina?»', 'cocina grande, solo reparto'],
  ['Zona turística / chiringuito', 'Local o Sala', '«Sus clientes de fuera leen la carta en su idioma»', 'extranjeros, temporada'],
  ['Cafetería / desayunos', 'Carta (o Local)', '«Que pidan desde la mesa y usted no pierda la barra»', 'carta corta, mucha rotación'],
  ['Hotel con restaurante', 'Sala, Signature o Experience', '«Carta en 3 idiomas en habitaciones y terraza»', 'decide otra persona: pide al decisor'],
].map(([t, prod, frase, senales]) => ({ titulo: t, frente: prod, dorso: [`Señales: ${senales}`, `Entrada: ${frase}`] }));

export default async function Academia({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAcademia();
  const sp = await searchParams;
  const [estado, contrato] = await Promise.all([
    comoCliente(jwt, async (c) => (await c.query<{ j: EstadoAcademia }>('SELECT dk.academia_mi_estado() AS j')).rows[0].j),
    comoCliente(jwt, async (c) => (await c.query<{ j: ContratoFirmado }>('SELECT dk.comercial_mi_contrato() AS j')).rows[0].j).catch(() => null),
  ]);
  const dir = estado.rol === 'direccion';
  // 0116: el comercial firma su contrato ANTES de formarse. Dirección puede ver la pantalla con ?vista=contrato.
  const firmar = (!dir && contrato && !contrato.firmado) || (dir && sp.vista === 'contrato');
  const c = contratoDe('comercial');
  return (
    <main className="central-viva min-h-screen bg-crema px-4 py-8 text-tinta sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vino">DKitchen</p>
            <h1 className="font-display text-4xl font-bold">Academia</h1>
          </div>
          {estado.rol !== 'en_formacion' && <Link href="/admin-dkitchen/inicio" className="text-sm font-semibold text-vino">Volver a Central →</Link>}
        </header>
        {sp.firmado && <p className="rounded-2xl bg-exito/10 p-4 text-sm text-exito" role="status">Contrato firmado.{sp.correo === 'no' ? ' No se pudo enviar el PDF por correo: descárgalo con el botón de tu ruta.' : ' Te hemos enviado el PDF a tu correo.'} Empieza por la lección L1.</p>}
        {firmar
          ? <FirmaContrato contrato={{ titulo: c.titulo, version: c.version, fecha: c.fecha, partes: c.partes, clausulas: c.clausulas, anexo: c.anexo }} nombre={contrato?.nombre ?? ''} simulacion={!!contrato?.simulacion} error={sp.e} accion={firmarContratoAction} vistaPrevia={dir} />
          : <AcademiaInicio estado={estado} modulos={MODULOS} perfiles={PERFILES} lecciones={leccionesVista()} datos={DATOS_CALCULADORAS}
              contrato={contrato ? { firmado: !!contrato.firmado, simulacion: !!contrato.simulacion, fecha: contrato.firmado_en ?? null } : null} />}
      </div>
    </main>
  );
}
