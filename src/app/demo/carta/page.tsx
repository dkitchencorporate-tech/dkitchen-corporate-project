'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  DEMO_MENU_SUSHI, CATEGORIES_SUSHI, 
  DEMO_MENU_TAPAS, CATEGORIES_TAPAS,
  DEMO_MENU_BURGER, CATEGORIES_BURGER,
  ALLERGEN_ICONS, UI_TRANSLATIONS, LanguageCode, MenuItem, TemplateType 
} from '@/lib/demo-data';

interface CartItem extends MenuItem {
  qty: number;
  dinerId: number;
}

// Helper to handle broken images gracefully
const ImageWithFallback = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <Image 
      src={imgSrc} 
      alt={alt} 
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className + " object-cover"}
      onError={() => setImgSrc('/images/demo/s1.png')} // Fallback local de alta calidad garantizado
    />
  );
};

// ==========================================
// 1. LAYOUT: ALTA COCINA (EDITORIAL)
// ==========================================
function EditorialSushiLayout({ menu, categories, lang, t, activeDiner, setActiveDiner, tableParam, setLang, onAdd, onAsk, onImageClick }: any) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-serif pb-48">
      
      {/* 1. Unique Header (Inline, elegant, transparent) */}
      <header className="px-4 sm:px-8 py-6 sm:py-10 flex flex-col md:flex-row justify-between items-center border-b border-white/10">
        <div className="text-center md:text-left mb-6 md:mb-0">
          <h1 className="text-2xl sm:text-3xl tracking-[0.2em] uppercase font-light">Nobu <span className="text-amber-600 font-serif">Sense</span></h1>
          <p className="text-[9px] sm:text-[10px] tracking-widest text-amber-600/70 mt-2 uppercase">{t.table_prefix} {tableParam}</p>
        </div>
        
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="flex gap-3 sm:gap-4">
            {(['es', 'en', 'fr'] as LanguageCode[]).map(l => (
              <button key={l} onClick={() => setLang(l)} className={`text-[9px] sm:text-[10px] uppercase tracking-widest transition-colors ${lang === l ? 'text-amber-500' : 'text-gray-600 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 w-full sm:w-auto">
            {[1, 2, 3, 4].map(d => (
              <button key={d} onClick={() => setActiveDiner(d)} className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full transition-all ${activeDiner === d ? 'bg-amber-600 text-white' : 'text-gray-500'}`}>
                {t.diner_prefix} {d}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Unique Hero Promo */}
      <div className="relative py-20 sm:py-32 px-4 sm:px-6 flex items-center justify-center border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=1200&q=30')] bg-cover bg-center mix-blend-luminosity"></div>
        <div className="relative z-10 text-center max-w-2xl">
          <span className="text-amber-500 text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-4 block">{t.sushi_promo_tag}</span>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-light leading-tight mb-6 sm:mb-8">
            {t.sushi_promo_title}
          </h2>
          <button className="px-6 sm:px-8 py-3 border border-amber-500 text-amber-500 text-[10px] sm:text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-colors">
            {t.sushi_promo_btn}
          </button>
        </div>
      </div>

      {/* 3. Menu Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-24 sm:space-y-32">
        {categories.map((cat: any, index: number) => {
          const items = menu.filter((i: any) => i.category === cat.id);
          if (!items.length) return null;

          return (
            <section key={cat.id}>
              <h3 className="text-xl sm:text-2xl text-white mb-10 sm:mb-16 pb-4 flex items-center gap-4 sm:gap-6">
                <span className="w-8 sm:w-12 h-[1px] bg-amber-500/50"></span>
                {cat.name[lang]}
              </h3>
              
              <div className="flex flex-col space-y-16 sm:space-y-24">
                {items.map((item: any, idx: number) => (
                  <div key={item.id} className={`flex flex-col ${idx % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-6 sm:gap-12 items-center`}>
                    <div className="w-full md:w-1/2">
                      <div onClick={() => onImageClick(item)} className="aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden bg-white/5 relative rounded-sm sm:rounded-none cursor-pointer group">
                        <ImageWithFallback src={item.image} alt={item.name[lang]} className="grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100"><span className="bg-black/80 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full uppercase tracking-widest border border-white/20 shadow-xl">{t.zoom_dish}</span></div>
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col justify-center text-center md:text-left">
                      <div className="flex justify-between items-baseline mb-2">
                        <h4 className="text-lg sm:text-xl text-white font-light">{item.name[lang]}</h4>
                        <span className="text-base sm:text-lg text-amber-500 ml-4">{item.price.toFixed(2)}€</span>
                      </div>
                      {item.isChefRecommendation && <span className="text-[9px] uppercase tracking-[0.2em] text-amber-500 mb-2 block">✧ {t.chef_rec}</span>}
                      {item.allergens.length > 0 && (
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                          {item.allergens.map((a: string) => (
                            <span key={a} title={ALLERGEN_ICONS[a]} className="text-[8px] border border-amber-500/30 text-amber-500/70 px-1.5 py-0.5 uppercase tracking-widest">{a}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-400 font-sans font-light text-xs sm:text-sm mb-6 sm:mb-10 leading-relaxed px-2 md:px-0">
                        {item.description[lang]}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
                        <button onClick={() => onAdd(item)} className="px-6 py-3 border border-white/20 text-white text-[10px] tracking-[0.2em] uppercase hover:border-amber-500 hover:text-amber-500 transition-colors w-full sm:w-auto">
                          {t.add_to_order} ({activeDiner})
                        </button>
                        <button onClick={() => onAsk(item.name[lang])} className="px-4 py-3 text-gray-500 text-[10px] tracking-[0.2em] uppercase hover:text-amber-500 transition-colors w-full sm:w-auto">
                          {t.ask_ai}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 4. Unique Loyalty Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center border-t border-white/10 mt-8 sm:mt-16">
        <h3 className="text-2xl sm:text-3xl font-light mb-4">{t.sushi_loyalty_title}</h3>
        <p className="text-xs sm:text-sm text-gray-400 mb-8 font-sans font-light">{t.sushi_loyalty_desc}</p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <input type="email" placeholder={t.email_placeholder} className="flex-1 bg-transparent border-b border-white/30 px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-sans text-center sm:text-left" />
          <button className="px-6 py-3 sm:py-0 bg-amber-600 text-white text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-colors shrink-0">
            {t.loyalty_submit}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. LAYOUT: BAR GRANADINO (LISTA DENSA)
// ==========================================
// ==========================================
// 2. LAYOUT: BAR GRANADINO (LISTA DENSA)
// ==========================================
function ListTapasLayout({ menu, categories, lang, t, activeDiner, setActiveDiner, tableParam, setLang, onAdd, onAsk, onImageClick }: any) {
  const [loyaltyStep, setLoyaltyStep] = useState(1);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [loyaltyName, setLoyaltyName] = useState('');
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const rewards = [
    { id: 'beer', name: 'Caña de Alhambra 1925', desc: 'Una caña helada de nuestra cerveza artesana estrella.', icon: '🍺' },
    { id: 'croquetas', name: 'Ración de Croquetas', desc: 'Dos croquetas melosas de rabo de toro crujientes.', icon: '🧆' },
    { id: 'dessert', name: 'Pionono de Santa Fe', desc: 'Bizcocho humedecido tradicional con crema tostada.', icon: '🍰' }
  ];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyName || !loyaltyPhone) return;
    setLoyaltyStep(3);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c3e2e] font-sans pb-48">
      
      {/* 1. Unique Header (Chalkboard style) */}
      <header className="bg-[#2c3e2e] text-[#f4ecd8] px-4 py-6 shadow-md border-b border-[#cc5203]/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-serif font-bold italic tracking-tight">
              {t.tapas_brand}
            </h1>
            <div className="text-xs uppercase tracking-widest mt-1 opacity-80 border-t border-[#f4ecd8]/20 pt-1 inline-block">
              {t.tapas_subtitle} • {t.table_prefix} {tableParam}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex bg-[#1e2a1f] p-1 rounded-md shadow-inner">
              {[1, 2, 3, 4].map(d => (
                <button key={d} onClick={() => setActiveDiner(d)} className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors ${activeDiner === d ? 'bg-[#f4ecd8] text-[#2c3e2e]' : 'text-white/60'}`}>
                  {t.diner_prefix} {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['es', 'en', 'fr'] as LanguageCode[]).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`w-6 h-6 rounded-full text-[9px] font-bold border ${lang === l ? 'bg-[#f4ecd8] text-[#2c3e2e] border-transparent' : 'border-white/30 text-white/80'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Unique Hero Promo */}
      <div className="bg-[#e85d04] text-white py-8 px-4 text-center shadow-inner relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16 pointer-events-none"></div>
        <div className="max-w-xl mx-auto border-2 border-white/30 p-6 rounded-lg border-dashed relative z-10">
          <span className="text-4xl block mb-2">🍻</span>
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">¡2x1 en tus Primeras Cañas!</h2>
          <p className="text-sm font-medium opacity-90 mb-0">Solo para miembros registrados del Club del Tapeo VIP. Únete abajo.</p>
        </div>
      </div>

      {/* 3. Menu Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        {categories.map((cat: any) => {
          const items = menu.filter((i: any) => i.category === cat.id);
          if (!items.length) return null;

          return (
            <section key={cat.id} className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-[#e8e4d9]">
              <h3 className="text-3xl font-serif font-bold text-[#2c3e2e] mb-8 border-b-2 border-[#cc5203] pb-3 inline-block">
                {cat.name[lang]}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {items.map((item: any) => (
                  <div key={item.id} className="bg-[#fefdfa] border border-[#e6dfcf] rounded-3xl p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center hover:shadow-lg hover:border-[#cc5203] transition-all duration-300 group relative">
                    <div onClick={() => onImageClick(item)} className="relative w-full sm:w-32 aspect-[4/3] sm:aspect-square shrink-0 rounded-2xl overflow-hidden shadow-sm border border-[#e8e4d9] bg-[#f4ecd8] cursor-pointer group/img">
                      <ImageWithFallback src={item.image} alt={item.name[lang]} className="group-hover/img:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover/img:opacity-100">
                        <span className="bg-white/95 text-[#2c3e2e] text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          {t.zoom_dish}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="text-lg md:text-xl font-bold text-[#2c3e2e] leading-tight pr-2">{item.name[lang]}</h4>
                          <span className="text-lg font-black text-[#e85d04] bg-[#e85d04]/10 px-2.5 py-1 rounded-xl shrink-0">{item.price.toFixed(2)}€</span>
                        </div>
                        {item.isChefRecommendation && (
                          <span className="inline-block text-[9px] font-black tracking-widest bg-[#e85d04]/10 text-[#e85d04] px-2 py-0.5 rounded-full mb-2 uppercase">
                            {t.chef_rec}
                          </span>
                        )}
                        {item.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.allergens.map((a: string) => (
                              <span key={a} title={ALLERGEN_ICONS[a]} className="text-[10px] bg-[#f4ecd8] text-[#2c3e2e] px-1.5 py-0.5 rounded font-bold uppercase">{a}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[#6b7264] text-sm leading-relaxed mb-4 line-clamp-3">
                          {item.description[lang]}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => onAdd(item)} className="flex-1 h-12 bg-[#2c3e2e] text-white px-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#1e2a1f] transition-colors active:scale-95 flex items-center justify-center gap-1.5">
                          <span className="text-lg leading-none">+</span> {t.add_to_order}
                        </button>
                        <button onClick={() => onAsk(item.name[lang])} className="w-12 h-12 shrink-0 bg-[#f4ecd8] text-[#2c3e2e] rounded-xl text-xl font-bold hover:bg-[#e8e4d9] transition-colors flex items-center justify-center" title={t.ask_ai}>
                          🤖
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 4. Interactive Loyalty Widget */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-[#2c3e2e] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-[#d4af37]/20">
          <div className="absolute -top-10 -right-10 text-[180px] opacity-5 pointer-events-none">🍷</div>
          
          <div className="relative z-10">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-[#e85d04] text-xs font-bold tracking-[0.3em] uppercase block mb-2">{t.tapas_loyalty_title}</span>
              <h3 className="text-3xl font-serif font-bold mb-3">Programa de Recompensas</h3>
              <p className="text-sm text-white/70">{t.tapas_loyalty_desc}</p>
            </div>

            {loyaltyStep === 1 && (
              <div className="space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-center text-[#f4ecd8] mb-4">Paso 1: Selecciona tu regalo de bienvenida</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rewards.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedReward(r.name); setLoyaltyStep(2); }}
                      className="bg-white/5 border border-white/10 hover:border-[#e85d04] hover:bg-white/10 p-6 rounded-2xl text-left transition-all duration-300 group flex flex-col justify-between h-40"
                    >
                      <span className="text-3xl mb-3">{r.icon}</span>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#e85d04] transition-colors">{r.name}</div>
                        <div className="text-[11px] text-white/50 mt-1 line-clamp-2">{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loyaltyStep === 2 && (
              <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-white/50 block">Regalo seleccionado:</span>
                    <span className="font-bold text-white">{selectedReward}</span>
                  </div>
                  <button type="button" onClick={() => setLoyaltyStep(1)} className="text-xs text-[#e85d04] underline">Cambiar</button>
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-center text-[#f4ecd8]">Paso 2: Completa tus datos de registro</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre completo..."
                    value={loyaltyName}
                    onChange={e => setLoyaltyName(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl bg-black/40 text-white border border-white/10 focus:outline-none focus:border-[#e85d04] font-medium text-sm"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Tu número de teléfono..."
                    value={loyaltyPhone}
                    onChange={e => setLoyaltyPhone(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl bg-black/40 text-white border border-white/10 focus:outline-none focus:border-[#e85d04] font-medium text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-[#e85d04] text-white font-bold rounded-xl uppercase tracking-wider hover:bg-[#cc5203] transition-colors text-xs"
                >
                  Solicitar Recompensa
                </button>
              </form>
            )}

            {loyaltyStep === 3 && (
              <div className="max-w-md mx-auto text-center space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#f4ecd8]">Paso 3: Verificación de Teléfono</h4>
                <p className="text-xs text-white/60">Simulando el envío de un código SMS de verificación de 4 dígitos al número: <span className="text-white font-bold">{loyaltyPhone}</span></p>
                
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="text-[11px] text-white/40">Ingresa cualquier código de 4 dígitos (ej: 1234)</div>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="0000"
                    value={otpInput}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtpInput(val);
                      if (val.length === 4) {
                        setIsOtpVerifying(true);
                        setTimeout(() => {
                          setIsOtpVerifying(false);
                          setLoyaltyStep(4);
                        }, 1200);
                      }
                    }}
                    className="w-32 px-4 py-3 text-center tracking-[0.5em] text-xl rounded-xl bg-black/50 text-white border border-white/10 focus:outline-none focus:border-[#e85d04] font-bold"
                  />
                  
                  {isOtpVerifying && (
                    <div className="text-xs text-[#e85d04] flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-t-transparent border-[#e85d04] rounded-full animate-spin"></div>
                      <span>Verificando número...</span>
                    </div>
                  )}
                </div>
                
                <button type="button" onClick={() => setLoyaltyStep(2)} className="text-xs text-white/50 hover:text-white underline">Volver al paso anterior</button>
              </div>
            )}

            {loyaltyStep === 4 && (
              <div className="max-w-md mx-auto space-y-8 animate-fade-in">
                {/* Virtual Card */}
                <div className="bg-gradient-to-br from-[#d4af37]/80 to-[#aa7c11] text-[#2c3e2e] p-6 rounded-3xl shadow-xl relative overflow-hidden border border-white/30 flex flex-col justify-between min-h-[220px] shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest font-black opacity-60">Tarjeta de Fidelización VIP</div>
                      <div className="text-xl font-serif font-black italic tracking-tight text-[#1b2b1d] mt-1">Club de Baco</div>
                    </div>
                    <span className="text-2xl">🍷</span>
                  </div>

                  {/* Stamp grid */}
                  <div className="my-4">
                    <div className="text-[8px] uppercase tracking-wider font-bold mb-2 opacity-80">Mis Sellos de Consumo</div>
                    <div className="grid grid-cols-5 gap-2">
                      {/* Active reward stamp */}
                      <div className="aspect-square bg-[#1b2b1d] text-[#d4af37] rounded-xl flex items-center justify-center text-xs font-bold border border-white/20 shadow-inner flex-col">
                        <span>🎁</span>
                        <span className="text-[6px] tracking-tighter opacity-80 mt-0.5">LISTO</span>
                      </div>
                      {/* Empty stamps */}
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div key={idx} className="aspect-square border border-[#1b2b1d]/30 rounded-xl flex items-center justify-center text-[10px] font-bold opacity-30 bg-black/5">
                          {idx + 2}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-[#1b2b1d]/20 pt-3">
                    <div>
                      <div className="text-[8px] uppercase tracking-wider opacity-60">Socio Titular</div>
                      <div className="text-xs font-black uppercase text-[#1b2b1d]">{loyaltyName}</div>
                    </div>
                    <div className="text-[9px] font-mono tracking-widest font-bold bg-[#1b2b1d]/10 px-2 py-1 rounded">
                      Nº {loyaltyPhone.slice(-4)}-VIP
                    </div>
                  </div>
                </div>

                {/* QR scanner mockup */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-4">
                  <div className="font-bold text-sm text-[#f4ecd8]">¡Registro Completado con Éxito!</div>
                  <div className="text-xs text-white/70">Tu regalo de bienvenida **({selectedReward})** ha sido cargado a la mesa {tableParam}.</div>
                  
                  {/* QR code container */}
                  <div className="bg-white p-3 rounded-2xl w-32 h-32 mx-auto flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                      <path d="M10,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M60,10 h30 v30 h-30 z" fill="currentColor" />
                      <path d="M15,15 h20 v20 h-20 z M15,65 h20 v20 h-20 z M65,15 h20 v20 h-20 z" fill="white" />
                      <path d="M20,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M70,20 h10 v10 h-10 z" fill="currentColor" />
                      <path d="M45,45 h10 v10 h-10 z M60,60 h10 v10 h-10 z M75,75 h15 v15 h-15 z M60,80 h10 v10 h-10 z M80,60 h10 v10 h-10 z" fill="currentColor" />
                    </svg>
                  </div>
                  
                  <div className="text-[10px] text-white/50">Muestra el código QR al camarero para que valide la recompensa de bienvenida.</div>
                  
                  <button type="button" onClick={() => { setLoyaltyStep(1); setSelectedReward(null); }} className="text-xs text-[#e85d04] hover:text-[#ff7b00] underline font-bold mt-2">Registrar otra cuenta</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. LAYOUT: FAST FOOD (APP GRID / NEON)
// ==========================================
function GridBurgerLayout({ menu, categories, lang, t, activeDiner, setActiveDiner, tableParam, setLang, onAdd, onAsk, onImageClick }: any) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  return (
    <div className="min-h-screen bg-[#171008] text-white font-sans pb-48 selection:bg-[#ff003c] selection:text-white">
      
      {/* 1. Unique Header (Cyberpunk / Delivery App style) */}
      <header className="sticky top-0 z-30 bg-[#171008]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff003c] rounded-xl flex items-center justify-center font-black text-2xl italic shadow-[0_0_15px_rgba(255,0,60,0.5)] animate-pulse">
              B
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">{t.burger_brand}</h1>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{tableParam}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex gap-1">
              {(['es', 'en', 'fr'] as LanguageCode[]).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`w-6 h-6 rounded-full text-[9px] font-black uppercase border ${lang === l ? 'bg-[#ff003c] text-white border-transparent' : 'border-zinc-800 text-zinc-500'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex bg-[#111] p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none flex-nowrap">
              {[1, 2, 3, 4].map(d => (
                <button key={d} onClick={() => setActiveDiner(d)} className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${activeDiner === d ? 'bg-[#ff003c] text-white shadow-[0_0_10px_rgba(255,0,60,0.4)]' : 'text-zinc-500'}`}>
                  {t.diner_prefix} {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Unique Hero Promo */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-[#ff003c] to-[#ff7b00] rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-[0_20px_50px_rgba(255,0,60,0.2)]">
          <div className="relative z-10">
            <div className="bg-black text-white text-[10px] font-black px-3 py-1 inline-block uppercase tracking-widest rounded-full mb-4">{t.burger_promo_tag}</div>
            <h2 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter mb-4 text-white drop-shadow-lg">
              {t.burger_promo_title}
            </h2>
            <p className="text-base md:text-lg font-bold opacity-90 mb-6 max-w-md">{t.burger_promo_desc}</p>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[url('/images/demo/burger/b06_smash_double.jpeg')] bg-cover bg-center rounded-full border-8 border-[#ff003c] shadow-[0_0_50px_rgba(255,0,60,0.3)] transform -rotate-12 hidden md:block"></div>
        </div>
      </div>

      {/* 3. Menu Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">
        {categories.map((cat: any) => {
          const items = menu.filter((i: any) => i.category === cat.id);
          if (!items.length) return null;

          return (
            <section key={cat.id}>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-4 text-zinc-100">
                {cat.name[lang]}
                <span className="h-1 flex-1 bg-gradient-to-r from-zinc-800 to-transparent rounded-full"></span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map((item: any) => (
                  <div key={item.id} className="bg-[#111] rounded-3xl overflow-hidden border border-zinc-800 flex flex-col group relative hover:shadow-[0_0_30px_rgba(255,0,60,0.15)] transition-shadow duration-500">
                    <div className="absolute inset-0 border-2 border-[#ff003c] opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity z-20 pointer-events-none"></div>
                    
                    <div onClick={() => onImageClick(item)} className="aspect-[4/3] w-full relative overflow-hidden bg-black cursor-pointer group/img">
                      <ImageWithFallback src={item.image} alt={item.name[lang]} className="group-hover/img:scale-110 transition-transform duration-500 opacity-90 group-hover/img:opacity-100" />
                      {item.isChefRecommendation && (
                        <div className="absolute top-3 left-3 z-10 bg-[#ff003c] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                          {t.chef_rec}
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 z-10 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl font-black text-lg border border-white/10">
                        {item.price.toFixed(2)}€
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <h4 className="text-xl font-black uppercase tracking-tight mb-1 line-clamp-1">{item.name[lang]}</h4>
                      {item.allergens.length > 0 && (
                        <div className="flex gap-1 mb-2">
                          {item.allergens.map((a: string) => (
                            <span key={a} title={ALLERGEN_ICONS[a]} className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-sm font-bold uppercase">{a}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-zinc-400 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">
                        {item.description[lang]}
                      </p>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => onAsk(item.name[lang])} className="col-span-1 h-12 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title={t.ask_ai}>
                          🤖
                        </button>
                        <button onClick={() => onAdd(item)} className="col-span-3 h-12 flex items-center justify-center rounded-2xl bg-[#ff003c] text-white font-black uppercase tracking-widest text-xs hover:bg-[#ff3366] transition-colors active:scale-95">
                          {t.add_to_order}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 4. Unique Loyalty Form */}
      <div className="px-4 py-16">
        <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 text-[200px] opacity-5">💀</div>
          <div className="flex-1 relative z-10 text-center md:text-left">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-white">{t.burger_loyalty_title}</h3>
            <p className="text-zinc-400 text-sm mb-0">{t.burger_loyalty_desc}</p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 relative z-10">
            {!isSubscribed ? (
              <>
                <input type="email" placeholder={t.burger_email_placeholder} className="w-full sm:w-64 px-5 py-4 rounded-2xl bg-black text-white border border-zinc-700 focus:outline-none focus:border-[#ff003c] font-black uppercase text-sm" />
                <button onClick={() => setIsSubscribed(true)} className="px-8 py-4 bg-white text-black font-black rounded-2xl uppercase tracking-widest hover:bg-gray-200 transition-colors w-full sm:w-auto">
                  {t.burger_loyalty_submit}
                </button>
              </>
            ) : (
              <div className="px-6 py-4 bg-white/10 text-white font-black rounded-2xl border border-white/20 uppercase tracking-widest flex items-center justify-center gap-2 w-full sm:w-auto animate-fade-in">
                ¡Bienvenido al Sindicato!
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}


// ==========================================
// MAIN CONTROLLER (STATE & GLOBAL COMPONENTS)
// ==========================================
function CartaContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || 'Demo';

  const [lang, setLang] = useState<LanguageCode>('es');
  // ?plantilla=sushi|tapas|burger abre un diseño concreto; ?embed=1 oculta los controles de DKitchen (para incrustarla en la web)
  const plantillaParam = searchParams.get('plantilla');
  const incrustada = searchParams.get('embed') === '1';
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(plantillaParam === 'tapas' || plantillaParam === 'burger' ? plantillaParam : 'sushi');
  const [activeDiner, setActiveDiner] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isSwitcherModalOpen, setIsSwitcherModalOpen] = useState(false);
  const [selectedImageItem, setSelectedImageItem] = useState<MenuItem | null>(null);

  // THEME GENERATOR
  const theme = {
    sushi: { 
      bg: 'bg-[#0a0a0a]', card: 'bg-[#1a1a1a]', border: 'border-white/10', text: 'text-white', textSec: 'text-gray-400',
      primary: 'bg-amber-600', primaryHover: 'hover:bg-amber-500', textPrimary: 'text-amber-500', 
      btnText: 'text-white', sendBtn: 'bg-emerald-500 text-black hover:bg-emerald-400', secondaryBtn: 'border border-white/20 text-white hover:bg-white/10'
    },
    tapas: { 
      bg: 'bg-[#faf8f5]', card: 'bg-white', border: 'border-[#e8e4d9]', text: 'text-[#2c3e2e]', textSec: 'text-[#6b7264]',
      primary: 'bg-[#cc5203]', primaryHover: 'hover:bg-[#e85d04]', textPrimary: 'text-[#e85d04]', 
      btnText: 'text-white', sendBtn: 'bg-[#2c3e2e] text-white hover:bg-[#1e2a1f]', secondaryBtn: 'border border-[#2c3e2e]/20 text-[#2c3e2e] hover:bg-[#2c3e2e]/5'
    },
    burger: { 
      bg: 'bg-[#171008]', card: 'bg-[#111]', border: 'border-zinc-800', text: 'text-white', textSec: 'text-zinc-400',
      primary: 'bg-[#ff003c]', primaryHover: 'hover:bg-[#ff3366]', textPrimary: 'text-[#ff003c]', 
      btnText: 'text-white', sendBtn: 'bg-[#ff003c] text-white hover:bg-[#ff3366]', secondaryBtn: 'border border-zinc-700 text-white hover:bg-zinc-800'
    }
  }[activeTemplate];

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeDishContext, setActiveDishContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = UI_TRANSLATIONS[lang];

  let currentMenu = DEMO_MENU_SUSHI;
  let currentCategories = CATEGORIES_SUSHI;
  if (activeTemplate === 'tapas') { currentMenu = DEMO_MENU_TAPAS; currentCategories = CATEGORIES_TAPAS; } 
  else if (activeTemplate === 'burger') { currentMenu = DEMO_MENU_BURGER; currentCategories = CATEGORIES_BURGER; }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isTyping]);
  useEffect(() => { 
    setCart([]); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTemplate]);

  const addToCart = (item: MenuItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.id === item.id && i.dinerId === activeDiner);
      if (existing >= 0) { const nc = [...prev]; nc[existing].qty += qty; return nc; }
      return [...prev, { ...item, qty, dinerId: activeDiner }];
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const getDinerTotal = (dinerId: number) => cart.filter(c => c.dinerId === dinerId).reduce((acc, item) => acc + (item.price * item.qty), 0);

  const openContextualChat = (dishName: string) => {
    setActiveDishContext(dishName);
    setIsChatOpen(true);
    const initialPrompt = `Me gustaría consultar sobre: ${dishName}.`;
    setChatMessages(prev => [...prev, { role: 'user', content: initialPrompt }]);
    sendToAi(initialPrompt, dishName);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    sendToAi(userMsg, activeDishContext);
  };

  // "Llamar al camarero" en el producto real es un aviso al personal de sala, no una
  // conversación: el pedido lo compone el comensal desde la carta. Aquí se confirma
  // la llamada en local; el aviso a cocina se conecta con el motor de QR.
  const sendToAi = async (_userMsg: string, _context: string | null) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Aviso enviado a sala. Un camarero se acerca a tu mesa enseguida.',
      }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className={`relative transition-colors duration-500 bg-black`}>

      {/* RENDER ACTIVE LAYOUT (HEADERS ARE INSIDE THEM NOW) */}
      {activeTemplate === 'sushi' && <EditorialSushiLayout menu={currentMenu} categories={currentCategories} lang={lang} t={t} activeDiner={activeDiner} setActiveDiner={setActiveDiner} tableParam={tableParam} setLang={setLang} onAdd={addToCart} onAsk={openContextualChat} onImageClick={setSelectedImageItem} />}
      {activeTemplate === 'tapas' && <ListTapasLayout menu={currentMenu} categories={currentCategories} lang={lang} t={t} activeDiner={activeDiner} setActiveDiner={setActiveDiner} tableParam={tableParam} setLang={setLang} onAdd={addToCart} onAsk={openContextualChat} onImageClick={setSelectedImageItem} />}
      {activeTemplate === 'burger' && <GridBurgerLayout menu={currentMenu} categories={currentCategories} lang={lang} t={t} activeDiner={activeDiner} setActiveDiner={setActiveDiner} tableParam={tableParam} setLang={setLang} onAdd={addToCart} onAsk={openContextualChat} onImageClick={setSelectedImageItem} />}

      {/* GLOBAL FIXED DOCK (B2B SALES & SWITCHER) */}
      <div className="fixed bottom-0 left-0 w-full z-40 p-4 pointer-events-none pb-8">
        <div className="max-w-md mx-auto flex flex-col gap-3 pointer-events-auto">
          {cartItemCount > 0 && (
            <button onClick={() => setIsCartOpen(true)} className={`bg-black/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex justify-between items-center hover:scale-[1.02] animate-fade-in`}>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-black">{cartItemCount}</span>
                <span className="text-sm uppercase tracking-[0.1em] font-bold text-white">{t.view_order}</span>
              </div>
              <span className="font-serif text-xl text-white">{cartTotal.toFixed(2)}€</span>
            </button>
          )}

          {!incrustada && (
          <div className="flex w-full gap-1.5 rounded-full border border-white/10 bg-[#17191E]/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-xl" style={{ fontFamily: 'var(--fuente-display), Inter, sans-serif' }}>
            <button onClick={() => setIsSwitcherModalOpen(true)} className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
              Cambiar diseño
            </button>
            <button onClick={() => setIsSalesModalOpen(true)} className="flex-1 rounded-full bg-[#6E0C2B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4A0819]">
              Quiero esta carta
            </button>
          </div>
          )}

          {/* GLOBAL BACK BUTTON (MOVED HERE) */}
          {!incrustada && (
          <div className="flex justify-center pointer-events-auto">
            <a href="/qr" className="rounded-full border border-white/10 bg-[#17191E]/70 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-sm hover:text-white">
              Volver a DKitchen
            </a>
          </div>
          )}
        </div>
      </div>

      {/* TEMPLATE SWITCHER MODAL */}
      {isSwitcherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsSwitcherModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#17191E] border border-white/10 rounded-[28px] p-6 md:p-10 shadow-2xl animate-fade-in" style={{ fontFamily: 'var(--fuente-display), Inter, sans-serif' }}>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#6E0C2B]">Tres cartas de autor</p><h3 className="mt-3 mb-8 text-center text-3xl font-semibold text-white">{t.select_design}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => { setActiveTemplate('sushi'); setIsSwitcherModalOpen(false); }} className={`p-8 text-left rounded-2xl border transition-all ${activeTemplate === 'sushi' ? 'border-[#6E0C2B] bg-[#6E0C2B]/10' : 'border-white/10 hover:border-white/30'}`}>
                <div className="font-serif text-white text-2xl mb-2">Alta Cocina</div><div className="text-sm text-gray-500">Diseño Editorial y Minimalista.</div>
              </button>
              <button onClick={() => { setActiveTemplate('tapas'); setIsSwitcherModalOpen(false); }} className={`p-8 text-left rounded-2xl border transition-all ${activeTemplate === 'tapas' ? 'border-[#6E0C2B] bg-[#6E0C2B]/10' : 'border-white/10 hover:border-white/30'}`}>
                <div className="font-serif text-white text-2xl mb-2">Bar & Tapas</div><div className="text-sm text-gray-500">Diseño Lista. Tradición y Cuchareo.</div>
              </button>
              <button onClick={() => { setActiveTemplate('burger'); setIsSwitcherModalOpen(false); }} className={`p-8 text-left rounded-2xl border transition-all ${activeTemplate === 'burger' ? 'border-[#6E0C2B] bg-[#6E0C2B]/10' : 'border-white/10 hover:border-white/30'}`}>
                <div className="font-sans font-black uppercase text-white text-2xl mb-2">Fast Food App</div><div className="text-sm text-gray-500">Diseño en cuadrícula. Compra por impulso.</div>
              </button>
            </div>
            <button onClick={() => setIsSwitcherModalOpen(false)} className="mt-10 w-full text-xs uppercase tracking-[0.2em] text-gray-500 hover:text-white">{t.close}</button>
          </div>
        </div>
      )}

      {/* SALES MODAL B2B (UPDATED WITH WEBSITE BUTTON) */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsSalesModalOpen(false)}></div>
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#17191E] border border-white/10 rounded-[28px] p-8 shadow-2xl text-center animate-fade-in" style={{ fontFamily: 'var(--fuente-display), Inter, sans-serif' }}>
            <h3 className="font-serif text-3xl text-white mb-4">{t.sales_title}</h3>
            <p className="text-gray-400 text-sm font-light leading-relaxed mb-8">
              {t.sales_desc}
            </p>
            <div className="space-y-4">
              <a href="/qr#planes" className="block w-full rounded-full bg-[#6E0C2B] py-4 text-[15px] font-semibold text-white hover:bg-[#4A0819]">
                Quiero mi carta · primer mes 1 €
              </a>
              <a href="https://wa.me/34622652659?text=Hola,%20he%20visto%20las%20cartas%20de%20autor%20y%20quiero%20una%20para%20mi%20local." target="_blank" rel="noopener noreferrer" className="block w-full rounded-full border border-white/20 py-4 text-[15px] font-semibold text-white hover:border-white/50">
                Hablar por WhatsApp
              </a>
              <a href="https://calendly.com/dkitchencorporate/30min" target="_blank" rel="noopener noreferrer" className="block w-full py-2 text-sm text-white/55 hover:text-white">
                O reserva una llamada de 30 min
              </a>
            </div>
            <button onClick={() => setIsSalesModalOpen(false)} className="mt-6 text-xs uppercase tracking-[0.2em] text-gray-600 hover:text-white">{t.close}</button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* GLOBAL CART MODAL (DESACOPLADO Y CAMALEONICO) */}
      {/* --------------------------------------------------------- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end px-4 pb-4 sm:px-8 sm:pb-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className={`relative w-full max-w-3xl mx-auto h-[80vh] sm:h-[85vh] rounded-3xl p-6 sm:p-8 flex flex-col ${theme.bg} ${theme.border} border shadow-2xl animate-fade-in-up`}>
            
            {/* Header Comanda */}
            <div className={`flex justify-between items-center mb-6 pb-4 shrink-0 border-b ${theme.border}`}>
              <h2 className={`font-serif text-2xl sm:text-3xl ${theme.text} flex items-center gap-3`}>
                <span>{t.cart_title}</span>
                <span className={`text-[10px] sm:text-xs uppercase tracking-widest ${theme.primary} ${theme.btnText} px-3 py-1 rounded-full font-sans font-bold`}>{t.table_prefix} {tableParam}</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className={`${theme.text} bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition-colors`}>✕</button>
            </div>

            {/* Listado de Platos */}
            <div className={`flex-1 overflow-y-auto space-y-6 pr-2 mb-6 scrollbar-thin`}>
              {[1, 2, 3, 4].map(d => {
                const dinerCart = cart.filter(c => c.dinerId === d);
                if (dinerCart.length === 0) return null;
                return (
                  <div key={d} className={`${theme.card} border ${theme.border} rounded-2xl p-4 sm:p-6 shadow-sm`}>
                    <div className={`flex justify-between items-center mb-4 border-b ${theme.border} pb-3`}>
                      <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${theme.textSec}`}>{t.diner_prefix} {d}</h3>
                      <span className={`font-serif text-base sm:text-lg ${theme.textPrimary}`}>{getDinerTotal(d).toFixed(2)}€</span>
                    </div>
                    <div className="space-y-4">
                      {dinerCart.map(item => (
                        <div key={item.id} className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`text-sm sm:text-base ${theme.text} truncate font-medium`}>{item.name[lang]}</div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <span className={`font-serif text-sm sm:text-base ${theme.textSec}`}>{(item.price * item.qty).toFixed(2)}€</span>
                            <div className={`flex items-center border ${theme.border} rounded-xl overflow-hidden shadow-sm`}>
                              <button onClick={() => {
                                setCart(prev => {
                                  const existing = prev.findIndex(i => i.id === item.id && i.dinerId === d);
                                  if (existing >= 0) {
                                    const nc = [...prev];
                                    if (nc[existing].qty > 1) { nc[existing].qty -= 1; } else { nc.splice(existing, 1); }
                                    return nc;
                                  }
                                  return prev;
                                });
                              }} className={`w-8 h-8 flex items-center justify-center ${item.qty === 1 ? 'text-red-500 hover:bg-red-500/10' : theme.text + ' hover:bg-black/5 dark:hover:bg-white/5'} transition-colors font-black text-lg`}>
                                -
                              </button>
                              <span className={`w-6 text-center text-xs font-bold ${theme.text}`}>{item.qty}</span>
                              <button onClick={() => {
                                setCart(prev => {
                                  const existing = prev.findIndex(i => i.id === item.id && i.dinerId === d);
                                  if (existing >= 0) {
                                    const nc = [...prev];
                                    nc[existing].qty += 1;
                                    return nc;
                                  }
                                  return prev;
                                });
                              }} className={`w-8 h-8 flex items-center justify-center text-green-500 hover:bg-green-500/10 transition-colors font-black text-lg`}>
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className={`h-full flex flex-col items-center justify-center text-center py-12 ${theme.textSec}`}>
                  <span className="text-5xl mb-4 grayscale opacity-50">🛒</span>
                  <p className={`text-sm sm:text-base font-bold ${theme.text}`}>{t.empty_cart}</p>
                  <p className="text-xs mt-2 max-w-[200px] mx-auto">{t.empty_cart_desc}</p>
                </div>
              )}
            </div>

            {/* Footer con Total y los 3 Botones Solicitados */}
            <div className={`shrink-0 border-t ${theme.border} pt-6 ${theme.bg}`}>
              {cartTotal > 0 && (
                <div className="flex justify-between items-end mb-6">
                  <span className={`text-xs sm:text-sm uppercase tracking-[0.2em] font-bold ${theme.textSec}`}>{t.total_pay}</span>
                  <span className={`font-serif text-3xl sm:text-4xl ${theme.text}`}>{cartTotal.toFixed(2)}€</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Botón Principal: Enviar Comanda */}
                {cartTotal > 0 && (
                  <button 
                    onClick={() => { alert(t.order_sent); setCart([]); setIsCartOpen(false); }} 
                    className={`col-span-2 py-4 sm:py-5 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest ${theme.sendBtn} transition-transform active:scale-[0.98] shadow-lg`}
                  >
                    {t.send_to_kitchen}
                  </button>
                )}

                {/* Botón Secundario: Camarero IA */}
                <button 
                  onClick={() => { setIsCartOpen(false); setIsChatOpen(true); }}
                  className={`py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme.primary} ${theme.primaryHover} ${theme.btnText} transition-colors flex items-center justify-center gap-2 shadow-sm ${cartTotal === 0 ? 'col-span-2' : 'col-span-1'}`}
                >
                  {t.open_ai}
                </button>

                {/* Botón Terciario: Llamar Camarero Humano */}
                <button 
                  onClick={() => alert('El camarero ha sido notificado y se dirige a su mesa.')}
                  className={`py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme.secondaryBtn} transition-colors flex items-center justify-center gap-2 ${cartTotal === 0 ? 'col-span-2' : 'col-span-1'}`}
                >
                  {t.call_waiter}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* GLOBAL AI CHAT MODAL (NUEVO - CAMALEONICO) */}
      {/* --------------------------------------------------------- */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center px-0 sm:px-8 pb-0 sm:pb-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsChatOpen(false)}></div>
          
          <div className={`relative w-full h-[90vh] sm:h-[85vh] max-w-2xl mx-auto ${theme.bg} sm:border ${theme.border} sm:rounded-3xl flex flex-col shadow-2xl animate-fade-in-up`}>
            
            {/* Header Chat */}
            <div className={`${theme.card} px-6 py-5 sm:rounded-t-3xl border-b ${theme.border} flex items-center justify-between shrink-0 shadow-sm z-10`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full ${theme.primary} flex items-center justify-center text-2xl shadow-lg`}>🤖</div>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 ${theme.card} animate-pulse`}></div>
                </div>
                <div>
                  <div className={`text-base font-bold ${theme.text} tracking-wider`}>{t.ai_assistant_title}</div>
                  <div className={`text-[10px] ${theme.textPrimary} font-black uppercase tracking-widest`}>{t.online} {tableParam}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsChatOpen(false)} className={`${theme.secondaryBtn} px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hidden sm:flex items-center gap-2`}>
                  {t.continue_ordering}
                </button>
                <button onClick={() => setIsChatOpen(false)} className={`text-gray-400 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 hover:${theme.text} w-10 h-10 rounded-full flex items-center justify-center transition-colors`}>✕</button>
              </div>
            </div>
            
            {/* Mensajes del Chat */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 text-sm ${theme.bg} ${activeTemplate==='sushi'? "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" : ""} bg-fixed`}>
              {/* Mensaje de Bienvenida */}
              <div className="flex justify-start">
                <div className={`p-5 rounded-2xl rounded-tl-sm max-w-[85%] ${theme.card} ${theme.text} border ${theme.border} font-medium leading-relaxed shadow-sm`}>
                  ¡Hola! Soy el asistente inteligente de DKitchen. Estoy conectado a la carta de este restaurante. Puedo recomendarte maridajes, explicarte ingredientes o añadir platos a tu comanda. ¿Qué te apetece hoy?
                </div>
              </div>
              
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-5 rounded-2xl max-w-[85%] font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? `${theme.primary} ${theme.btnText} rounded-tr-sm` : `${theme.card} ${theme.text} border ${theme.border} rounded-tl-sm`}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className={`p-5 rounded-2xl rounded-tl-sm ${theme.card} border ${theme.border} flex gap-1.5 shadow-sm`}>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:'150ms'}}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:'300ms'}}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Sugerencias Rápidas */}
            <div className={`${theme.card} px-6 py-4 border-t ${theme.border} flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0`}>
              <button onClick={() => {
                const msg = "Quiero ver las opciones sin gluten.";
                setChatInput(msg); handleSendMessage();
              }} className={`text-[11px] ${theme.secondaryBtn} rounded-full px-4 py-2 font-bold transition-colors`}>
                🌾 Sin Gluten
              </button>
              <button onClick={() => {
                const msg = "¿Qué me recomiendas que sea rápido?";
                setChatInput(msg); handleSendMessage();
              }} className={`text-[11px] ${theme.secondaryBtn} rounded-full px-4 py-2 font-bold transition-colors`}>
                ⚡ Algo Rápido
              </button>
              {cartItemCount > 0 && (
                <button onClick={() => {
                  const msg = "¿Con qué bebida puedo acompañar mi pedido actual?";
                  setChatInput(msg); handleSendMessage();
                }} className={`text-[11px] ${theme.primary} ${theme.btnText} bg-opacity-20 hover:bg-opacity-30 border ${theme.border} rounded-full px-4 py-2 transition-colors font-bold`}>
                  🍷 Maridar mi pedido
                </button>
              )}
            </div>
            
            {/* Input de Texto */}
            <div className={`p-6 ${theme.bg} border-t ${theme.border} flex flex-col sm:flex-row gap-4 shrink-0 sm:rounded-b-3xl`}>
              <button onClick={() => setIsChatOpen(false)} className={`sm:hidden w-full ${theme.secondaryBtn} py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-2`}>
                {t.continue_ordering}
              </button>
              <div className="flex gap-3 w-full">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t.ai_placeholder}
                  className={`flex-1 rounded-2xl px-6 py-4 ${theme.card} ${theme.text} border ${theme.border} focus:outline-none focus:border-opacity-100 font-medium text-sm transition-colors shadow-inner`}
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={isTyping || !chatInput.trim()} 
                  className={`w-14 h-14 flex items-center justify-center rounded-2xl ${theme.primary} ${theme.btnText} ${theme.primaryHover} disabled:opacity-50 transition-colors shadow-lg active:scale-95 shrink-0`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* FULLSCREEN IMAGE MODAL (VISOR DE PLATOS) */}
      {/* --------------------------------------------------------- */}
      {selectedImageItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 sm:p-8 animate-fade-in" onClick={() => setSelectedImageItem(null)}>
          <div className={`relative w-full max-w-md sm:max-w-4xl flex flex-col sm:flex-row ${theme.bg} rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border ${theme.border} animate-fade-in-up`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImageItem(null)} className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors border border-white/20">✕</button>
            <div className="relative w-full sm:w-1/2 aspect-[4/3] sm:aspect-[4/4] bg-black shrink-0">
              <Image src={selectedImageItem.image} alt={selectedImageItem.name[lang]} fill className="object-cover" />
            </div>
            <div className={`w-full sm:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center gap-4 relative z-10`}>
               <div className="flex justify-between items-start sm:items-end gap-4 flex-col sm:flex-row">
                 <div>
                   <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black ${theme.text} mb-3 leading-tight`}>{selectedImageItem.name[lang]}</h3>
                   {selectedImageItem.allergens.length > 0 && (
                     <div className="flex gap-1.5 flex-wrap">
                       {selectedImageItem.allergens.map((a: string) => (
                         <span key={a} title={ALLERGEN_ICONS[a]} className={`text-[9px] ${theme.card} ${theme.textSec} border ${theme.border} px-2 py-1 rounded-sm font-bold uppercase`}>{a}</span>
                       ))}
                     </div>
                   )}
                 </div>
                 <span className={`text-2xl sm:text-4xl ${theme.textPrimary} font-black shrink-0`}>{selectedImageItem.price.toFixed(2)}€</span>
               </div>
               <p className={`text-sm sm:text-base ${theme.textSec} leading-relaxed mt-2 font-medium`}>{selectedImageItem.description[lang]}</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                 <button onClick={() => { addToCart(selectedImageItem); setSelectedImageItem(null); setIsCartOpen(true); }} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm ${theme.primary} ${theme.btnText} ${theme.primaryHover} shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 order-1 sm:order-2`}>
                   {t.add_to_order_modal}
                 </button>
                 <button onClick={() => { openContextualChat(selectedImageItem.name[lang]); setSelectedImageItem(null); }} className={`py-4 rounded-2xl font-bold uppercase tracking-widest text-xs sm:text-sm ${theme.secondaryBtn} transition-colors flex items-center justify-center gap-2 order-2 sm:order-1`}>
                   {t.smart_waiter}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CartaPremiumDemo() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="font-serif text-white italic text-xl animate-pulse">Cargando Ecosistema...</div></div>}>
      <CartaContent />
    </Suspense>
  );
}
