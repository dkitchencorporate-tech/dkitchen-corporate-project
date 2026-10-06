# DKitchen Corporate — instrucciones de proyecto para cualquier sesión de Claude Code

Este archivo aplica a **toda sesión** que trabaje en este repositorio (local, cloud o desde la app móvil), no solo a la sesión que lo escribió. No es una preferencia — es una regla de proyecto.

## Regla no negociable: nivel de diseño

Esta web vende los propios servicios de diseño/implementación de DKitchen a clientes de hostelería. Por tanto **no puede verse por debajo del nivel que le entregamos a un cliente pagador** — verse como una plantilla genérica o "un PDF hiper-editado" es, literalmente, la peor prueba social posible para este negocio.

Diagnóstico vigente (2026-09-22): el estado visual actual **no cumple el nivel exigido**. No es un ajuste cosmético pendiente — es un refactor de diseño de autor real, con movimiento y 3D genuinos (Parte 7 del plan), no decoración superficial sobre un layout de tarjetas estándar.

**Antes de tocar cualquier página pública (Home, /qr, /experience, /auditoria, /nucleo-operativo (ruta `/base-operativa`), /dark-kitchen, /marcas, /casos-de-exito) o el dashboard, invoca a los subagentes de diseño de este repositorio:**

- `.claude/agents/design-brand-guardian.md` — coherencia de identidad de marca, paleta (ver Parte 7, §5-bis «Gran Reserva»; la §5 está obsoleta), voz.
- `.claude/agents/design-ui-designer.md` — sistema de componentes, jerarquía visual, accesibilidad.
- `.claude/agents/design-ux-architect.md` — arquitectura CSS, layout, fundamentos técnicos antes de implementar.

Esto aplica tanto para **construir lo que falta** (piezas de la Fase 5 del plan, capa de movimiento de la Parte 7) como para **elevar lo que ya existe** — ninguna sesión debe limitarse a "que funcione", el criterio de aceptación incluye que el resultado esté a la altura de lo que se le entrega a un cliente.

## Contexto del proyecto — leer antes de trabajar

La documentación completa de la migración de Architect.Sys a DKitchen vive en `docs/planificacion/` (14+ partes, numeradas — el número más alto gana en caso de conflicto entre partes). Antes de cualquier cambio de producto, precio, copy o arquitectura, revisa el índice (`docs/planificacion/DKITCHEN_INDICE_PARTES_1-9.md`) y las partes relevantes. No asumas que un documento anterior sigue vigente sin comprobar si una parte posterior lo corrigió.

**Importante:** los documentos de planificación pueden describir como "ya construido" o "ya confirmado" algo que en la práctica no llegó a implementarse o desplegarse. Verifica siempre contra el código real y, si aplica, contra el estado real del servicio externo (Whop, Vercel), no solo contra lo que dice el documento.

## Pagos

Único proveedor: **Stripe** (decisión de karc0 del 07/10/2026; sustituye a Whop, que se retira por completo). Checkout NATIVO en `/pago` con el Payment Element embebido (nunca páginas alojadas de Stripe), IVA del 21 % siempre aparte y desglosado, y factura de Stripe en todos los cobros. Código: `src/lib/payments/stripe.ts` (API REST, versión fijada) y `src/lib/payments/cobros.ts` (un creador por producto); webhook en `/api/webhooks/stripe`. Todo precio se lee de `src/lib/pricing-config.ts`: ningún componente, copy o metadata escribe un precio a mano.

## Ramas y despliegue

La rama de producción real (la que Vercel despliega a `dkitchencorporate.es`) es `claude/github-repository-access-1cf0ss`, y es también la rama por defecto de este repositorio. `archive/architect-sys-legacy` es un backup protegido del código anterior a la migración a DKitchen — no se toca sin autorización explícita del propietario.
