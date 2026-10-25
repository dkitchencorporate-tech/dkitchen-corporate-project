'use client';

import Tilt from 'react-parallax-tilt';

/**
 * Micro-interacción de tarjetas (Parte 7, Sección 2.5): tilt 3D real al
 * hover, no un pulso de sombra ni un fade genérico — ese es explícitamente
 * el criterio de aceptación de esta fase. Envuelve las tarjetas de producto
 * de los bloques FEATURE-SPLIT y PRICING-BLOCK.
 */
export default function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tilt
      className={className}
      tiltMaxAngleX={8}
      tiltMaxAngleY={8}
      perspective={1000}
      transitionSpeed={1500}
      scale={1.02}
      glareEnable
      glareMaxOpacity={0.08}
      glareColor="#ffffff"
      glarePosition="all"
    >
      {children}
    </Tilt>
  );
}
