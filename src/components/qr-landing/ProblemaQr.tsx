'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * «El problema»: sección fijada al hacer scroll. Una carta de papel se tacha y
 * se reimprime (coste real), y al bajar se convierte en la carta digital con
 * el precio nuevo al instante. Todo en HTML, sin vídeo.
 */
const PLATOS: [string, string, string][] = [['Croquetas de jamón', '8,50', '9,50'], ['Arroz de marisco', '16', '18'], ['Presa ibérica', '18', '19,50'], ['Tarta de queso', '5,50', '6,50']];

export default function ProblemaQr() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const tachado = useTransform(p, [0.08, 0.32], ['0%', '100%']);
  const papelOp = useTransform(p, [0.45, 0.62], [1, 0]);
  const papelRot = useTransform(p, [0.3, 0.6], [-3, -14]);
  const papelY = useTransform(p, [0.45, 0.65], [0, 120]);
  const digitalOp = useTransform(p, [0.5, 0.66], [0, 1]);
  const digitalY = useTransform(p, [0.5, 0.7], [60, 0]);
  const t1 = useTransform(p, [0, 0.4, 0.46], [1, 1, 0]);
  const t2 = useTransform(p, [0.5, 0.58], [0, 1]);
  const coste = useTransform(p, [0.1, 0.4], [0, 180]);
  const costeTxt = useTransform(coste, (v) => `${Math.round(v)} €`);
  const nuevoOp = useTransform(p, [0.28, 0.36], [0, 1]);

  return (
    <section ref={ref} className="relative h-[260vh] bg-[#F7F7F5]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:px-8">
          <div className="relative min-h-[260px]">
            <motion.div style={{ opacity: t1 }} className="absolute inset-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">El problema</p>
              <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl">Cada subida de precio te cuesta imprenta.</h2>
              <p className="mt-5 max-w-md text-lg text-[#6B7079]">Tachones, fotocopias y cartas que no dicen la verdad. Y el cliente lo nota.</p>
              <p className="mt-6 text-sm text-[#6B7079]">Reimprimir cartas este año: <motion.span className="font-display text-2xl font-semibold text-[#17191E]">{costeTxt}</motion.span></p>
            </motion.div>
            <motion.div style={{ opacity: t2 }} className="absolute inset-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2F8F6B]">Con DKitchen</p>
              <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl">Lo cambias en el móvil. Está en todas las mesas.</h2>
              <p className="mt-5 max-w-md text-lg text-[#6B7079]">El QR no cambia nunca. La carta, cuando tú quieras. Coste de reimprimir: 0 €.</p>
            </motion.div>
          </div>

          <div className="relative mx-auto h-[440px] w-[300px]">
            <motion.div style={{ opacity: papelOp, rotate: papelRot, y: papelY }}
              className="absolute inset-0 rounded-sm bg-[#FBF7EE] p-7 shadow-[0_30px_60px_rgba(23,25,30,.18)] [background-image:repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(0,0,0,.035)_28px)]">
              <p className="text-center font-serif text-2xl text-[#221D17]" style={{ fontFamily: 'var(--fuente-serif-web), Georgia, serif' }}>Carta</p>
              <div className="mt-6 space-y-5">
                {PLATOS.map(([n, viejo, nuevo]) => (
                  <div key={n} className="flex items-baseline justify-between gap-2 text-[15px] text-[#221D17]" style={{ fontFamily: 'var(--fuente-serif-web), Georgia, serif' }}>
                    <span>{n}</span>
                    <span className="relative">
                      <span>{viejo}</span>
                      <motion.span style={{ width: tachado }} className="absolute left-0 top-1/2 h-[2px] -rotate-6 bg-[#B23A48]" />
                      <motion.span style={{ opacity: nuevoOp }} className="absolute -right-2 -top-5 rotate-6 text-sm text-[#B23A48]" aria-hidden="true">{nuevo}</motion.span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="absolute bottom-6 left-7 right-7 text-center text-[11px] text-[#9A9EA6]">Versión 7 · impresa el martes</p>
            </motion.div>

            <motion.div style={{ opacity: digitalOp, y: digitalY }} className="absolute inset-0 rounded-[40px] bg-[#17191E] p-2.5 shadow-[0_40px_90px_rgba(23,25,30,.35)]">
              <div className="h-full rounded-[32px] bg-white p-6">
                <div className="flex items-center justify-between text-xs text-[#6B7079]"><span>Mi carta</span><span className="rounded-full bg-[#2F8F6B]/10 px-2 py-0.5 text-[#2F8F6B]">Publicada</span></div>
                <div className="mt-5 space-y-3">
                  {PLATOS.map(([n, , nuevo]) => (
                    <div key={n} className="flex items-center justify-between rounded-xl border border-[#E6E6E2] px-3 py-2.5 text-sm">
                      <span className="text-[#1B1D22]">{n}</span>
                      <span className="rounded-lg bg-[#F7F7F5] px-2 py-1 font-semibold tabular-nums text-[#17191E]">{nuevo} €</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-[#E8592A] py-3 text-center text-sm font-semibold text-white">Guardado · ya está en las mesas</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
