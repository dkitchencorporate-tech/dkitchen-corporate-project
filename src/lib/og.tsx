import { ImageResponse } from 'next/og';

/**
 * Imagen para compartir (Open Graph / WhatsApp / redes) con la identidad
 * DKitchen: grafito, acento naranja y titular grande. 1200×630.
 */
export const OG_TAMANO = { width: 1200, height: 630 };

export function imagenOg(etiqueta: string, titulo: string, sub: string) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#111317', color: '#fff', position: 'relative', fontFamily: 'sans-serif' }}>
        <div style={{ position: 'absolute', right: -160, bottom: -200, width: 700, height: 700, borderRadius: 9999, background: 'radial-gradient(closest-side, rgba(232,89,42,.55), rgba(17,19,23,0))', display: 'flex' }} />
        <div style={{ position: 'absolute', left: -200, top: -260, width: 760, height: 760, borderRadius: 9999, background: 'radial-gradient(closest-side, rgba(59,110,165,.45), rgba(17,19,23,0))', display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 800 }}>D<span style={{ color: '#E8592A' }}>Kitchen</span></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color: '#E8592A', fontWeight: 700 }}>{etiqueta}</div>
          <div style={{ marginTop: 18, fontSize: 76, lineHeight: 1.02, fontWeight: 800, letterSpacing: -2, maxWidth: 980 }}>{titulo}</div>
          <div style={{ marginTop: 24, fontSize: 30, color: 'rgba(255,255,255,.7)', maxWidth: 900 }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,.5)' }}>dkitchencorporate.es</div>
      </div>
    ),
    OG_TAMANO,
  );
}
