'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, RoundedBox, Torus, Ring, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export type PresetHero3D =
  | 'home'
  | 'qr'
  | 'experience'
  | 'auditoria'
  | 'base-operativa'
  | 'dark-kitchen'
  | 'marcas';

const NARANJA = '#6E0C2B';
const AMBAR = '#B8863B';

/** Sigue el cursor dentro del lienzo y aplica un tilt suave al grupo hijo. */
function GrupoConTilt({ children, intensidad = 0.35 }: { children: React.ReactNode; intensidad?: number }) {
  const grupo = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (!grupo.current) return;
    grupo.current.rotation.y = THREE.MathUtils.lerp(grupo.current.rotation.y, pointer.x * intensidad, 0.06);
    grupo.current.rotation.x = THREE.MathUtils.lerp(grupo.current.rotation.x, -pointer.y * intensidad, 0.06);
  });

  return <group ref={grupo}>{children}</group>;
}

/**
 * Fase de la evolución "QR estático → PWA de Núcleo Operativo", en bucle.
 * No es un morph disparado por scroll entre dos páginas (eso exigiría que
 * ambos Hero3D compartieran una sola instancia) — cada página tiene su
 * propia escena, contando la misma historia con distinto énfasis: `/qr`
 * vive la mayor parte del bucle como carta y solo asoma brevemente lo que
 * llega después; `/base-operativa` hace lo contrario. `dwellQr`/`dwellPwa`
 * son la fracción del ciclo en cada extremo; el resto se reparte a partes
 * iguales entre las dos transiciones.
 */
function useFaseEvolucion(dwellQr: number, dwellPwa: number, periodoSeg = 7) {
  const fase = useRef(0);
  const transicion = (1 - dwellQr - dwellPwa) / 2;

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % periodoSeg) / periodoSeg;
    let f: number;
    if (t < dwellQr) {
      f = 0;
    } else if (t < dwellQr + transicion) {
      f = (t - dwellQr) / transicion;
    } else if (t < dwellQr + transicion + dwellPwa) {
      f = 1;
    } else if (t < dwellQr + 2 * transicion + dwellPwa) {
      f = 1 - (t - (dwellQr + transicion + dwellPwa)) / transicion;
    } else {
      f = 0;
    }
    // Suavizado (smoothstep) para que la transición no se sienta lineal/mecánica.
    fase.current = f * f * (3 - 2 * f);
  });

  return fase;
}

/**
 * Escena compartida por `/qr` y `/base-operativa` (Núcleo Operativo): un
 * mismo panel que alterna entre "carta QR" (cuatro esquinas + recuadro
 * blanco) y "pantalla de pedido en curso" (filas de menú + indicador que
 * sube) — la evolución de un producto al otro, contada dentro de cada
 * página por separado, nunca como una única instancia repartida entre dos
 * rutas.
 */
function EscenaEvolucionQrPwa({ enfasis }: { enfasis: 'qr' | 'pwa' }) {
  const dwellQr = enfasis === 'qr' ? 0.6 : 0.15;
  const dwellPwa = enfasis === 'qr' ? 0.15 : 0.6;
  const fase = useFaseEvolucion(dwellQr, dwellPwa);
  const grupoPulso = useRef<THREE.Group>(null);
  const indicador = useRef<THREE.Mesh>(null);
  const cuadroQr = useRef<THREE.Mesh>(null);
  const esquinas = useRef<THREE.Group>(null);
  const pantalla = useRef<THREE.Mesh>(null);
  const filas = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const f = fase.current;

    // Pequeño "salto" de escala justo durante la transición, para que se
    // sienta como una transformación puntual y no un simple fundido.
    if (grupoPulso.current) {
      const pulso = 1 + 0.05 * Math.sin(f * Math.PI);
      grupoPulso.current.scale.setScalar(pulso);
    }

    const opacidad = (m: THREE.Mesh | null, valor: number) => {
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = valor;
    };
    opacidad(cuadroQr.current, 1 - f);
    if (esquinas.current) esquinas.current.children.forEach((c) => opacidad(c as THREE.Mesh, 1 - f));
    opacidad(pantalla.current, f);
    if (filas.current) filas.current.children.forEach((c) => opacidad(c as THREE.Mesh, f));

    if (indicador.current) {
      const t = (clock.getElapsedTime() % 4) / 4;
      indicador.current.position.y = THREE.MathUtils.lerp(-0.7, 0.7, t);
      indicador.current.scale.setScalar(f);
    }
  });

  return (
    <GrupoConTilt intensidad={enfasis === 'qr' ? 0.5 : 0.3}>
      <group ref={grupoPulso}>
        <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.7}>
          <RoundedBox args={[2, 2.9, 0.14]} radius={0.18} smoothness={4}>
            <meshStandardMaterial color="#171008" />
          </RoundedBox>

          {/* Estado QR: recuadro blanco + cuatro esquinas de posicionamiento. */}
          <mesh ref={cuadroQr} position={[0, 0, 0.08]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshStandardMaterial color="#FDFCF8" transparent />
          </mesh>
          <group ref={esquinas}>
            {[-1, 1].map((x) =>
              [-1, 1].map((y) => (
                <mesh key={`${x}-${y}`} position={[x * 0.47, y * 0.47, 0.09]}>
                  <boxGeometry args={[0.32, 0.32, 0.02]} />
                  <meshStandardMaterial color="#171008" transparent />
                </mesh>
              ))
            )}
          </group>

          {/* Estado PWA: pantalla oscura + filas de menú + indicador de pedido. */}
          <mesh ref={pantalla} position={[0, 0, 0.08]}>
            <planeGeometry args={[1.5, 2.6]} />
            <meshStandardMaterial color="#1f1f1f" transparent />
          </mesh>
          <group ref={filas}>
            {[-0.7, 0, 0.7].map((y) => (
              <mesh key={y} position={[0, y, 0.09]}>
                <planeGeometry args={[1.2, 0.35]} />
                <meshStandardMaterial color="#2a2a2a" transparent />
              </mesh>
            ))}
          </group>
          <mesh ref={indicador} position={[-0.55, -0.7, 0.11]}>
            <circleGeometry args={[0.1, 24]} />
            <meshStandardMaterial color={NARANJA} emissive={NARANJA} emissiveIntensity={0.6} transparent />
          </mesh>
        </Float>
      </group>
    </GrupoConTilt>
  );
}

/** `/qr` — la carta vive la mayor parte del bucle; solo asoma brevemente el sistema completo en que se convierte. */
function EscenaQr() {
  return <EscenaEvolucionQrPwa enfasis="qr" />;
}

/** `/dark-kitchen` — cajas apilándose bajo una sola cocina (marcas apilables). */
function EscenaDarkKitchen() {
  const posiciones: [number, number, number][] = [
    [0, -0.9, 0],
    [0.7, -0.1, 0.2],
    [-0.7, 0.3, -0.2],
    [0.2, 1.1, 0.1],
    [-0.4, -0.3, 0.5],
  ];
  return (
    <GrupoConTilt intensidad={0.25}>
      <Float speed={1.1} rotationIntensity={0.3} floatIntensity={0.6}>
        {posiciones.map((p, i) => (
          <RoundedBox key={i} args={[0.9, 0.9, 0.9]} radius={0.08} position={p}>
            <meshStandardMaterial color={i % 2 === 0 ? NARANJA : '#171008'} />
          </RoundedBox>
        ))}
      </Float>
    </GrupoConTilt>
  );
}

/** `/auditoria` — un anillo que gira hasta señalar una zona "en riesgo". */
function EscenaAuditoria() {
  const aguja = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!aguja.current) return;
    // Gira hasta ~40% del círculo (zona "en riesgo") y se detiene ahí.
    const objetivo = Math.PI * 0.8;
    aguja.current.rotation.z = THREE.MathUtils.lerp(aguja.current.rotation.z, -objetivo, delta * 1.2);
  });

  return (
    <GrupoConTilt intensidad={0.3}>
      <Ring args={[1.3, 1.5, 64, 1, 0, Math.PI * 1.5]} rotation={[0, 0, Math.PI]}>
        <meshStandardMaterial color="#e5e7eb" side={THREE.DoubleSide} />
      </Ring>
      <Ring args={[1.3, 1.5, 64, 1, 0, Math.PI * 0.6]} rotation={[0, 0, Math.PI * 1.75]}>
        <meshStandardMaterial color={NARANJA} side={THREE.DoubleSide} />
      </Ring>
      <group ref={aguja}>
        <mesh position={[0, 0.65, 0.05]}>
          <coneGeometry args={[0.08, 1, 8]} />
          <meshStandardMaterial color="#171008" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[0.15, 24]} />
        <meshStandardMaterial color="#171008" />
      </mesh>
    </GrupoConTilt>
  );
}

/** `/base-operativa` (Núcleo Operativo) — el sistema completo domina el bucle; solo asoma brevemente de dónde viene (la carta QR). */
function EscenaBaseOperativa() {
  return <EscenaEvolucionQrPwa enfasis="pwa" />;
}

/** `/experience` — copa/plato del caso Alhambra, entrada tipo reveal. */
function EscenaExperience() {
  return (
    <GrupoConTilt intensidad={0.3}>
      <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.9}>
        <Torus args={[1, 0.35, 32, 64]} rotation={[Math.PI / 2.3, 0, 0]}>
          <meshStandardMaterial color={NARANJA} metalness={0.3} roughness={0.4} />
        </Torus>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.15, 32]} />
          <meshStandardMaterial color={AMBAR} metalness={0.4} roughness={0.3} />
        </mesh>
      </Float>
    </GrupoConTilt>
  );
}

/** `/` (Home) — la escalera como composición 3D: 5 formas en distintos planos. */
function EscenaHome() {
  const formas = [
    { pos: [-2.2, 0.6, -0.5], color: NARANJA, tipo: 'box' },
    { pos: [-1.1, -0.4, 0.3], color: '#171008', tipo: 'sphere' },
    { pos: [0, 0.8, 0], color: AMBAR, tipo: 'box' },
    { pos: [1.1, -0.3, -0.3], color: '#171008', tipo: 'sphere' },
    { pos: [2.2, 0.5, 0.4], color: NARANJA, tipo: 'box' },
  ] as const;

  return (
    <GrupoConTilt intensidad={0.2}>
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.7}>
        {formas.map((f, i) =>
          f.tipo === 'box' ? (
            <RoundedBox key={i} args={[0.7, 0.7, 0.7]} radius={0.1} position={f.pos as [number, number, number]}>
              <meshStandardMaterial color={f.color} />
            </RoundedBox>
          ) : (
            <mesh key={i} position={f.pos as [number, number, number]}>
              <icosahedronGeometry args={[0.4, 0]} />
              <meshStandardMaterial color={f.color} />
            </mesh>
          )
        )}
      </Float>
    </GrupoConTilt>
  );
}

/** `/marcas` — estante 3D de las 6 marcas, rotable al arrastrar. */
function EscenaMarcas() {
  const radio = 2.2;
  const n = 6;
  return (
    <>
      <group>
        {Array.from({ length: n }).map((_, i) => {
          const angulo = (i / n) * Math.PI * 2;
          return (
            <RoundedBox
              key={i}
              args={[0.9, 0.9, 0.15]}
              radius={0.1}
              position={[Math.sin(angulo) * radio, 0, Math.cos(angulo) * radio]}
              rotation={[0, angulo, 0]}
            >
              <meshStandardMaterial color={i % 2 === 0 ? NARANJA : AMBAR} />
            </RoundedBox>
          );
        })}
      </group>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
    </>
  );
}

const ESCENAS: Record<PresetHero3D, () => React.ReactNode> = {
  home: EscenaHome,
  qr: EscenaQr,
  experience: EscenaExperience,
  auditoria: EscenaAuditoria,
  'base-operativa': EscenaBaseOperativa,
  'dark-kitchen': EscenaDarkKitchen,
  marcas: EscenaMarcas,
};

/**
 * Elemento 3D real por página (Parte 7, Sección 2.3): rotación continua sutil
 * + reacción al cursor, nunca un modelo estático. Se importa siempre vía
 * `next/dynamic` con `ssr: false` (ver Hero3DLazy) — WebGL no existe en el
 * servidor.
 */
export default function Hero3D({ preset, className }: { preset: PresetHero3D; className?: string }) {
  const Escena = ESCENAS[preset];
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 40 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 3, 4]} intensity={1.1} />
        <Escena />
      </Canvas>
    </div>
  );
}
