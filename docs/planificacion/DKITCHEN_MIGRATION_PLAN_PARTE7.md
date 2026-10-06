# DKITCHEN — PARTE 7: CAPA DE MOVIMIENTO — ESPECIFICACIÓN TÉCNICA (3D, scroll, transiciones)

**Complementa a:** Partes 1-6. **Fuente:** Sección 10 de `DKITCHEN_MIGRACION_COMPLETA.md` (documento único, autocontenido, entregado por Alex el 2026-09-21 — ver nota de reconciliación al final de este documento). Esta Parte 7 formaliza esa sección como fase independiente y la deja cross-referenciada para el agente de código, sustituyendo el placeholder que dejó la Parte 6, Sección 8.

**Orden de ejecución — CONFIRMADO por Alex:** esta fase se ejecuta **después** de la Parte 6 (refactorización de estructura visual y copy de venta). No antes, no en paralelo. La razón de fondo, aunque no fue enunciada explícitamente por Alex, es la que ya aplica el propio documento fuente: la capa de movimiento es un refuerzo sobre una estructura de venta ya correcta, no un sustituto de ella — construirla sobre las páginas actuales (uniformes, sin hero propio) sería animar un problema en vez de resolverlo primero.

---

## 1. Qué es esta fase y qué no es

El sitio pasa de single-page-scroll a multi-página con navegación fija (Parte 6, Sección 8 / documento fuente, Sección 9). Ese cambio estructural exige una capa de movimiento real — al nivel de una web moderna de referencia (tipo Awwwards), no pequeños pulsos de botón — para que la navegación entre peldaños se sienta tan cuidada como el copy que la Parte 6 ya especificó.

**No es:**
- Un rediseño. La paleta de color base y la identidad visual ya definida (naranja `#FF4500` sobre crema `#FDFCF8`, tokens dark del dashboard: `dash-bg #050505`, etc.) **no cambian** — ver Sección 5 de este documento, límite no negociable heredado del documento fuente.
- Un reemplazo de ningún bloque de la Parte 6 (HERO, POWER-STATEMENT, FEATURE-SPLIT, PRICING-BLOCK, OBJECTION-HANDLING, CTA-FINAL). Esta fase anima esos bloques ya existentes; no los redefine ni les añade contenido nuevo.

---

## 2. Componentes técnicos — los cinco elementos, en el orden en que se construyen

### 2.1 Scroll con inercia — la base de todo lo demás

- **Librería:** **Lenis** — opción estándar actual en Next.js/React para smooth-scroll.
- **Por qué va primero:** el resto de la capa de movimiento (parallax, transformaciones ligadas a scroll) se apoya sobre esta base — implementarlo después obligaría a revisar cada animación ya construida para verificar que sigue sincronizada con el nuevo comportamiento de scroll.
- **Alcance:** sustituye el scroll nativo del navegador en todas las páginas multi-bloque (Home, QR, Experience, Auditoría, Base Operativa, Dark Kitchen, `/marcas`). No aplica dentro del panel de administración/dashboard — ahí prima la velocidad de uso operativo sobre la experiencia editorial.

### 2.2 Storytelling real por scroll — transformaciones ligadas a la posición

- **Librería:** **Framer Motion** (`useScroll` + `useTransform`) o **GSAP ScrollTrigger** — cualquiera de las dos es válida, decisión del agente de código según lo que ya esté instalado en el proyecto (Framer Motion es probable que ya exista en `package.json` por las transiciones de página de la Sección 2.4; en ese caso, usar la misma librería para ambas cosas evita una segunda dependencia).
- **Qué anima:** profundidad de paralaje real (varias capas del mismo bloque moviéndose a distinta velocidad), escalado y rotación ligados a la posición de scroll — nunca solo fade-in/fade-out de bloques estáticos, que es exactamente el efecto "PDF convertido en web" que la Parte 6 ya diagnosticó como el problema a resolver.
- **Dónde se aplica con más peso:** las transiciones entre bloques de tipo distinto dentro de una misma página (p. ej. de POWER-STATEMENT a FEATURE-SPLIT en Base Operativa) — es el punto exacto donde el ritmo de sección que pide la Parte 6, Sección 1 se convierte en movimiento real en vez de solo alternancia de fondo estática.

### 2.3 Elemento 3D real en el hero de cada página de producto

- **Librería:** **React Three Fiber**, o un embed de **Spline** si se prioriza velocidad de desarrollo sobre control fino.
- **Comportamiento:** rotación continua sutil + reacción al movimiento del ratón (tilt reactivo al cursor) — nunca un modelo estático ni un GIF/video pregrabado disfrazado de 3D.
- **Qué renderizar, por página — DECIDIDO, aplicable directamente por el agente de código** (el documento fuente daba solo dos ejemplos, `/qr` y `/dark-kitchen`, con la instrucción general "cada página de producto"; Alex delegó completar el resto por iniciativa propia, maximizando el efecto "wow" moderno en las 7 páginas, no solo donde el documento fuente ya lo mencionaba explícitamente):

  | Página | Elemento 3D — decidido |
  |---|---|
  | `/` (Home) | La escalera completa como composición 3D: 5 formas/iconos (uno por peldaño) flotando en distintos planos de profundidad, con un movimiento de "ensamblaje" al entrar en viewport (cada pieza llega desde su lado y encaja) — comunica "sistema completo", no un producto suelto, y es el primer momento 3D que ve cualquier visitante. |
  | `/qr` | Una carta/QR flotando con inclinación reactiva al cursor (tal cual especifica el documento fuente). |
  | `/experience` | Composición 3D ligada a uno de los 7 formatos (ej. copa/plato del caso Alhambra), con una entrada tipo "reveal" (aparece desde opacidad/escala 0 al hacer scroll hasta el hero) — reforzando la idea de evento montado, no de producto estático. |
  | `/auditoria` | Un dial/medidor 3D (aguja o anillo de progreso) que gira hasta señalar una zona "en riesgo" al entrar en viewport — representa el diagnóstico sin necesitar la cifra de precio para funcionar; coherente con "un diagnóstico, no una promesa" y no depende de que el precio de este peldaño (Parte 6, Sección 5) esté cerrado. |
  | `/base-operativa` | Pantalla/dispositivo flotante mostrando el flujo de pedido en curso (recibido → preparación → entregado animándose en bucle sutil dentro de la propia pantalla 3D), coherente con el mockup real que pide el HERO de Parte 6, Sección 6. |
  | `/dark-kitchen` | Composición 3D de plato/marca con varias "cajas" o cubos apilándose (representando marcas apilables bajo una sola cocina) — refuerza visualmente el concepto de multimarca mejor que un solo plato aislado. |
  | `/marcas` | Un carrusel/estante 3D de las 6 marcas (logos o packs de marca flotando en arco, rotables al arrastrar o con auto-rotación lenta) — convierte el catálogo en un momento de exploración, no solo una grid de tarjetas; compatible con el tratamiento de galería ya especificado en Parte 6, Sección 7. |

  Todas las filas quedan **decididas y aplicables**, incluidas `/auditoria` y `/marcas` (antes tratadas como opcionales/pendientes) — ninguna depende de que se cierre el precio de Auditoría ni de ningún otro bloqueante ajeno a esta Parte 7.

  **Requisito nuevo, CONFIRMADO en la Parte 11 — bloque SALTO-CUÁNTICO:** los elementos 3D de `/qr` y `/base-operativa` (nombre público "Núcleo Operativo", ver Parte 6 Sección 6) no se construyen como dos escenas aisladas — deben compartir sistema de coordenadas/escala desde el principio, porque la Parte 6, Sección 3, especifica una transición en scroll donde la tarjeta QR flotante de `/qr` se transforma directamente en el dispositivo/pantalla de Núcleo Operativo (interpolación de geometría o cross-fade entre ambas escenas). Construir estas dos piezas por separado y adaptarlas después es más caro que coordinarlas desde el diseño inicial de la escena — el agente de código debe tratarlas como un único sistema con dos estados, no como dos componentes independientes.

  > **CORRECCIÓN aplicada 2026-09-22 (ver Parte 15):** esto NO es lo que se construyó, y quedó aceptado así por Alex. `src/components/motion/Hero3D.tsx` implementa **dos escenas independientes** (una instancia por página, `/qr` y `/base-operativa`), cada una autosuficiente, corriendo su propio bucle entre el estado "carta QR" y el estado "pantalla de Núcleo Operativo", con salto de escala en el cruce y énfasis de tiempo propio por página — no un sistema de coordenadas compartido ni interpolación de geometría entre dos escenas. Verificado por auditoría de código (2026-09-22) contra `claude/github-repository-access-1cf0ss`. Es más simple de mantener que lo especificado aquí originalmente; se deja este párrafo como registro de la especificación original, no como instrucción vigente.

### 2.4 Transiciones entre páginas

- **Mecanismo:** `AnimatePresence` de Framer Motion sobre el App Router de Next.js.
- **Comportamiento:** crossfade + slide/scale real al navegar entre peldaños — nunca un salto brusco de una página a otra.
- **Alcance:** aplica a la navegación entre las páginas de producto (`/`, `/qr`, `/experience`, `/auditoria`, `/base-operativa`, `/dark-kitchen`, `/marcas`). No aplica a la navegación dentro del panel de administración del cliente ni del panel interno (`/admin-architect`), por el mismo criterio de velocidad operativa de la Sección 2.1.

### 2.5 Micro-interacciones en tarjetas de producto

- **Mecanismo:** tilt 3D real al hover — `transform-style: preserve-3d` + seguimiento del cursor, o la librería `react-parallax-tilt`.
- **Dónde:** las tarjetas de producto dentro de bloques FEATURE-SPLIT y PRICING-BLOCK (Parte 6) — ej. las tarjetas de los 7 formatos de Experience, las tarjetas de marcas virtuales en Dark Kitchen y en `/marcas`.
- **Qué evitar, explícitamente (regla directa del documento fuente, no interpretación):** animaciones limitadas a pulsos pequeños de botón, o fade-in genérico de Tailwind. Si una tarjeta solo cambia de sombra o de escala al hover, no cumple con esta fase — el criterio de aceptación es el tilt real, no un placeholder de transición CSS.

---

## 3. Orden de construcción recomendado dentro de esta fase

No es indiferente el orden interno — cada paso depende del anterior:

1. **Lenis** (Sección 2.1) — se integra primero porque todo lo demás se apoya sobre el comportamiento de scroll que define.
2. **Framer Motion / GSAP ScrollTrigger** para transformaciones ligadas a scroll (Sección 2.2) — sobre el scroll ya suavizado.
3. **`AnimatePresence`** para transiciones entre páginas (Sección 2.4) — reutiliza la misma librería del paso 2 si se eligió Framer Motion, evitando instalar GSAP solo para esto.
4. **Elementos 3D por página** (Sección 2.3) — el más costoso en tiempo de desarrollo, se hace después de que el esqueleto de movimiento (scroll + transiciones) ya esté validado, para no tener que ajustar el 3D dos veces si cambia el timing general de las animaciones.
5. **Micro-interacciones de tarjetas** (Sección 2.5) — el detalle más pequeño, se deja para el final.

---

## 4. Criterio de aceptación por página

Antes de dar por cerrada esta fase en una página concreta, debe cumplir las cinco condiciones — las 7 páginas de producto tienen elemento 3D asignado (Sección 2.3), así que esta lista aplica completa a todas ellas, sin excepciones:

- [ ] Scroll con Lenis activo, sin salto ni comportamiento nativo del navegador visible.
- [ ] Al menos una transformación real ligada a scroll (paralaje, escala o rotación) entre dos bloques de tipo distinto de la Parte 6.
- [ ] Elemento 3D en el hero (o, en Home, en el punto de entrada del bloque de escalera) según la Sección 2.3 — con reacción al cursor o movimiento propio, nunca estático.
- [ ] Transición de entrada/salida vía `AnimatePresence` al navegar desde y hacia esta página.
- [ ] Ninguna tarjeta de producto de esta página usa solo pulso/sombra/fade genérico — todas las tarjetas interactivas tienen tilt real.

---

## 5. Paleta de color — actualizada por decisión explícita de Alex (2026-09-21), sustituye la regla anterior

**Esta sección revierte, con autorización directa de Alex, la regla "no tocar la paleta de color base" que traía tanto la Parte 6 como la Sección 15 de `DKITCHEN_MIGRACION_COMPLETA.md` ("Reglas no negociables").** Esa regla ya no aplica desde este documento en adelante. Motivo: revisión deliberada, no un desliz de diseño — el naranja original (`#FF4500`, "OrangeRed puro") y el negro puro del dashboard (`#050505`) leían más a acento de SaaS/dashboard tech genérico que a hostelería, pese a que el naranja como familia de color sí es la elección correcta para el sector (confirmado por investigación: es el segundo color más asociado a apetito/calidez tras el rojo, y es el mismo que usa Toast, el líder de POS para restaurantes, como acento de marca sobre fondo claro). El ajuste es deliberadamente sutil — mismo esqueleto de marca, ningún tono se mueve hacia azul/morado/negro-azulado (los que más suprimen apetito según la misma investigación).

**Paleta final — aplicable de inmediato, en todo el sitio (no solo en esta Parte 7 de movimiento):**

| Token | Valor anterior | Valor nuevo | Uso |
|---|---|---|---|
| Naranja primario (marca, CTA, acentos principales) | `#FF4500` | **`#D9531E`** | Naranja quemado/terracota — sustituye al naranja primario en todos los usos actuales (nav, botones, hero, logo si aplica) |
| Acento secundario (nuevo, no existía) | — | **`#B8863B`** | Mostaza/ámbar apagado — uso deliberadamente minoritario: alternancia de fondo en algún POWER-STATEMENT (Parte 6, Sección 1), algún icono o detalle de FEATURE-SPLIT; nunca sustituye al naranja como protagonista ni se usa en el CTA principal |
| Fondo claro (crema) | `#FDFCF8` | `#FDFCF8` — **sin cambio** | Ya funcionaba como fondo neutro cálido, se mantiene igual |
| Negro/dark del dashboard (`dash-bg` y tokens relacionados) | `#050505` | **`#171008`** | Negro con base marrón/espresso muy sutil — mismo rol de "dark mode premium" del panel de administración, deja de leer como dashboard tech/gaming |

**Alcance de este cambio:** aplica a todo el sitio público (Home, QR, Experience, Auditoría, Base Operativa, Dark Kitchen, `/marcas`) y al dashboard/panel de administración por igual — no es exclusivo de las páginas trabajadas en la Parte 6, aunque es en esas páginas donde más se nota por el nuevo uso del acento secundario en bloques POWER-STATEMENT.

**Lo que sigue siendo válido de la regla original, sin cambios:** esta fase (Parte 7) sigue siendo una capa de refuerzo de movimiento, no un rediseño de layout — el cambio de paleta es la única excepción explícitamente autorizada; no se introduce tipografía nueva ni se reestructuran los bloques ya definidos en la Parte 6 por este documento.

---

## 5-bis. Paleta VIGENTE: Gran Reserva (sustituye a la §5; decisión de karc0, 29-30/09/2026, documentada el 06/10/2026)

La paleta naranja de la §5 (`brand` #D9531E) **ya no es la identidad de la web pública**. Desde el 29-30/09 la web usa **Gran Reserva**: vino metalizado, oro técnico y negro profundo. El 06/10/2026 se migraron 1.783 colores escritos a mano (121 archivos) a tokens de `tailwind.config.js`, con el mismo color y otro nombre:

| Token | Hex | Uso |
|---|---|---|
| `vino` | #6E0C2B | Acento y CTA principal (`globals.css` da el degradado metalizado a `.bg-vino`) |
| `vino-hondo` | #4A0819 | Hover del CTA |
| `vino-fondo` | #3E0515 | Fondos vino profundos |
| `oro` | #D9B25C | Acento sobre fondo oscuro (el vino no se lee sobre negro) |
| `noche` / `obsidiana` / `carbon` | #0A080C / #0B0C0F / #1B1D22 | Secciones y superficies oscuras |
| `tinta` / `grafito` / `pizarra` / `niebla` / `ceniza` | #17191E / #3F434B / #5C616A / #6B7079 / #9A9EA6 | Escala de texto, de principal a terciario |
| `acero` | #8B8F97 | Borde de controles de formulario (3:1, WCAG 1.4.11) |
| `linea` / `linea-calida` / `linea-cava` / `linea-fuerte` / `papel` | #E6E6E2 / #E4E1DC / #D9D3CB / #D6D6D1 / #EDEDEA | Bordes y separadores |
| `crema` | #F7F5F2 | Fondo de sección alterno |
| `exito` | #2F8F6B | Estados correctos |

Reglas:
- Ningún componente nuevo escribe un hexadecimal de esta paleta a mano: se usa el token (`bg-vino`, `text-niebla`…).
- Las reglas de `globals.css` dependen de esos nombres de clase (`.bg-vino`, `[class*="bg-noche"]`…): si se renombra un token, se cambia también allí.
- Los tokens antiguos (`brand`, `brandAccent`, `dash-*`) siguen en uso en algunas pantallas antiguas y no se borran hasta migrarlas.
- Los colores de las demos y plantillas de clientes (temas de carta, WhatsApp…) no forman parte de esta paleta.
- Pendiente: unificar los grises de borde casi iguales (`linea`, `linea-calida`, `papel`, `linea-fuerte`) en una escala más corta. Es una decisión de diseño aparte.

## 6. Referencia cruzada — actualización de la Parte 6, Sección 8

La Parte 6, Sección 8 ("Orden de fases — CONFIRMADO por Alex") queda actualizada así (sustituye el placeholder anterior, que decía que el documento de movimiento "esta sesión no tiene delante"):

> Esta parte (estructura visual + copy de venta) es la fase que se ejecuta primero. A continuación sigue la **Parte 7** (movimiento e interacción — Lenis, Framer Motion/GSAP ScrollTrigger, elementos 3D vía React Three Fiber o Spline, transiciones de página con `AnimatePresence`, micro-interacciones de tarjetas), formalizada a partir de la Sección 10 de `DKITCHEN_MIGRACION_COMPLETA.md`.

(Este cambio se aplica también directamente al archivo `DKITCHEN_MIGRATION_PLAN_PARTE6.md` en este mismo momento — ver confirmación al final de la respuesta a Alex.)

---

## 7. Estado del resto del proyecto — confirmado por Alex, no se reabre

Todo lo que `DKITCHEN_MIGRACION_COMPLETA.md` cubre por delante de su Sección 10 (identidad, escalera de precios, Experience, Dark Kitchen, ciclo de vida, mapa de páginas, desmontaje de Growth, psico-marketing por peldaño) ya está resuelto y aplicado — Alex lo confirma explícitamente: el documento se compartió únicamente para verificar que la fase de movimiento (Sección 10) ya estaba descrita de antes, no para reabrir ningún punto anterior. No se trata como pendiente de reconciliación ni se vuelve a tocar Parte 1 o Parte 2 por esto. El punto de trabajo actual es exactamente este — Parte 6 (ya entregada) + esta Parte 7 (movimiento) — y ahí es donde se concentra el trabajo de aquí en adelante.
