'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import CartaMini, { type EstiloMini } from './CartaMini';

/**
 * Móvil 3D del hero (React Three Fiber): cuerpo de grafito con reflejos y la
 * carta REAL en HTML dentro de la pantalla. Sigue al puntero y gira al hacer
 * scroll. Si el dispositivo no tiene WebGL, es de gama baja o el usuario pide
 * reducir movimiento, se usa la versión CSS 3D (MovilCss).
 */
const ESTILO: EstiloMini = { plantilla: 'editorial', fondo: 'papel', letra: 'serif', color: '#E8592A' };

function Telefono() {
  const g = useRef<Group>(null);
  useFrame(({ pointer, clock }) => {
    if (!g.current) return;
    const giroScroll = Math.min(1, window.scrollY / 700) * 0.6;
    g.current.rotation.y += (-0.32 + pointer.x * 0.22 + giroScroll - g.current.rotation.y) * 0.06;
    g.current.rotation.x += (0.06 - pointer.y * 0.1 - g.current.rotation.x) * 0.06;
    g.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.06;
  });
  return (
    <group ref={g}>
      <RoundedBox args={[3.05, 6.25, 0.3]} radius={0.44} smoothness={8}>
        <meshStandardMaterial color="#17191E" metalness={0.75} roughness={0.28} />
      </RoundedBox>
      <Html transform position={[0, 0, 0.16]} scale={0.1} occlude={false} zIndexRange={[10, 0]}>
        <div style={{ width: 272, height: 566, borderRadius: 34, overflow: 'hidden' }}>
          <CartaMini e={ESTILO} desplazar />
        </div>
      </Html>
    </group>
  );
}

export function MovilCss() {
  const [giro, setGiro] = useState({ x: 4, y: -16 });
  useEffect(() => {
    const mover = (ev: PointerEvent) => setGiro({ x: 4 - (ev.clientY / window.innerHeight - 0.5) * 8, y: -16 + (ev.clientX / window.innerWidth - 0.5) * 14 });
    window.addEventListener('pointermove', mover);
    return () => window.removeEventListener('pointermove', mover);
  }, []);
  return (
    <div className="mx-auto w-[270px] sm:w-[300px]" style={{ perspective: 1400 }}>
      <div className="rounded-[48px] bg-[#17191E] p-3 shadow-[0_50px_120px_rgba(23,25,30,.45)] transition-transform duration-300 ease-out"
        style={{ transform: `rotateX(${giro.x}deg) rotateY(${giro.y}deg)`, transformStyle: 'preserve-3d' }}>
        <div className="aspect-[9/19] overflow-hidden rounded-[38px]"><CartaMini e={ESTILO} desplazar /></div>
      </div>
    </div>
  );
}

export default function Movil3D() {
  const [modo, setModo] = useState<'cargando' | '3d' | 'css'>('cargando');
  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    let webgl = false;
    try { webgl = !!document.createElement('canvas').getContext('webgl2'); } catch { webgl = false; }
    setModo(!reducir && webgl && memoria >= 4 ? '3d' : 'css');
  }, []);

  if (modo !== '3d') return <MovilCss />;
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[460px] sm:h-[640px]">
      <Canvas camera={{ position: [0, 0, 9.5], fov: 38 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} />
        <pointLight position={[-5, -2, 4]} intensity={40} color="#E8592A" />
        <pointLight position={[5, 3, 6]} intensity={30} color="#ffffff" />
        <Telefono />
      </Canvas>
    </div>
  );
}
