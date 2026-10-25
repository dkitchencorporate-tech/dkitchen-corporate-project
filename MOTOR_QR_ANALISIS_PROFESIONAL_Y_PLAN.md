# Motor de QR: análisis de fondo y plan profesional de disponibilidad

**Fecha:** 20 de septiembre de 2026
**Para quién es este documento:** el siguiente agente o ingeniero que retome el
motor de QR, probablemente desde un entorno con más capacidad operativa que el
que escribió esto —acceso TCP directo a Postgres, autoridad para aprobar gasto
en un plan de pago, herramientas de carga real (k6, Artillery), un runner de
larga duración—. Si eres ese agente: **lee esto entero antes de tocar código.**
No repitas el ciclo de "prueba un QR, ve el error, parchea, repite" que ya se
identificó como el problema, no la solución.

**Por qué existe este documento y no otra ronda de parches:** tras montar el
motor de QR y una primera mitigación de disponibilidad (caché de resiliencia
vía Vercel Global Config + GitHub Actions, ver Sección 5), el titular del
proyecto detuvo el trabajo con razón: las pruebas de un código QR a la vez no
demuestran nada sobre qué pasa con mil clientes reales, y depender de GitHub
Actions para la disponibilidad de un sistema de pago no es un montaje
profesional. Pidió análisis de fondo, no más vueltas. Esto es esa respuesta.

---

## 1. Primero, corregir el marco de la pregunta

La pregunta tal como llegó fue: *"¿aguanta esto 1.000 QR activos con clientes
reales?"* Antes de responder hace falta separarla en las dos preguntas que en
realidad contiene, porque tienen respuestas completamente distintas y
confundirlas lleva a resolver el problema equivocado.

### 1.1 ¿Es un problema de volumen/rendimiento? No, y esto se puede afirmar sin
### necesidad de una prueba de carga

`codigos_qr.codigo` es **clave primaria** (`db/migrations/0003_motor_qr.sql`,
línea 152): Postgres la indexa automáticamente con un B-tree. Resolver un
código es una búsqueda por índice, `O(log n)`. La diferencia entre buscar
entre 1.000 códigos y entre 1.000.000 es de microsegundos, no de segundos.
Insertar una fila en `escaneos` es un `INSERT` sencillo con una clave foránea
indexada. No hay ningún `JOIN` costoso, ninguna agregación, ningún escaneo de
tabla completa en el camino caliente de `/r/{codigo}`.

Vercel Functions escala horizontalmente por diseño: cada petición puede
atenderse en una instancia distinta, y la plataforma sostiene sin esfuerzo
órdenes de magnitud más tráfico que el que genera un negocio de hostelería de
mil locales escaneando QR de forma intermitente a lo largo del día. Esto no es
una opinión optimista: es el caso de uso para el que existe el modelo
serverless, y está en producción bajo cargas muchísimo mayores en miles de
aplicaciones.

**Conclusión, sin necesidad de más pruebas para afirmarla:** 1.000 QR activos
no es un problema de capacidad para esta arquitectura. Si algún día lo fuera,
el síntoma sería latencia creciente bajo carga sostenida, medible con una
herramienta de carga real (Sección 6) — no lo que se ha observado hasta ahora.

### 1.2 ¿Es un problema de disponibilidad durante un incidente? Sí, y es el
### problema real

Lo que sí se demostró con evidencia concreta esta sesión:

- El compute de Neon en el plan gratuito **se suspende tras inactividad**
  (`suspend_timeout_seconds` fijo en el valor por defecto de la plataforma) y
  tarda unos cientos de milisegundos en reanudarse al recibir la siguiente
  conexión. Esto **no es un error ni una caída**: es latencia añadida,
  transparente para el cliente que conecta, documentada por Neon como
  comportamiento normal del *scale to zero*.
- Ese mismo plan gratuito **no permite desactivar la suspensión** — se
  comprobó vía API (`PATCH /projects/{id}/endpoints/{id}` con
  `suspend_timeout_seconds: -1`) y la documentación de Neon lo confirma:
  *"suspension can only be disabled on the Launch and Scale plans"*.
- Si Neon tuviera un incidente real —no solo el scale-to-zero, sino una caída
  de verdad del servicio en la región— **todos los restaurantes con QR
  impreso dejarían de resolver a la vez**, porque `/r/{codigo}` y `/m/{slug}`
  comparten la misma base de datos para todos los clientes. Esto se probó de
  forma real: se apuntó `DK_DATABASE_URL` a un host inexistente en un build de
  producción y se confirmó el fallo total sin el mecanismo de resiliencia, y
  la recuperación con él (Sección 5).

Esta es la pregunta que de verdad hay que resolver, y es una pregunta de
**disponibilidad y coste de infraestructura**, no de rendimiento.

---

## 2. Lo que la referencia citada dice, y lo que no dice

Se ha releído `javiggil.com/56fc9cb32b97` de forma completa y literal en esta
sesión, no por fragmentos como en pasadas anteriores. Es una guía de un
producto de generación de QR con arte de IA (ControlNet sobre Stable
Diffusion), con una sección corta sobre hacer el QR "dinámico" mediante un
enlace corto propio. Hay que decirlo con precisión, no inflarlo:

**Lo que sí dice**, y ya está reflejado en el motor construido:
- Tablas mínimas `codigos` (id_corto, destino, dueño, creado) y `escaneos`
  (id_corto, fecha_hora, user_agent, país) — aquí es `codigos_qr` +
  `restaurantes` + `escaneos`, más estructurado porque este no es un
  acortador genérico, sino la puerta de un producto con datos reales.
- `GET /r/:id_corto` registra el escaneo y responde `302`, nunca `301` —
  implementado exactamente así, con la misma razón: un `301` se queda en la
  caché del navegador y a partir del segundo escaneo el escaneo deja de
  contarse.
- La advertencia central, citada dos veces en la fuente: *"si tu redirect se
  cae, todos los códigos impresos dejan de funcionar de golpe... a diferencia
  de un QR estático, que jamás depende de que el servidor esté vivo"*.

**Lo que NO dice, y no hay que atribuírselo:**
- No recomienda ninguna plataforma de hosting concreta para el redirector, ni
  Vercel, ni Neon, ni Render, ni ninguna otra.
- No da ninguna cifra de escala ni de códigos QR activos.
- No propone ninguna solución al riesgo de punto único de fallo que señala:
  lo nombra como el coste inherente de elegir un QR dinámico sobre uno
  estático, y ahí lo deja.
- La advertencia sobre "hosting gratuito no sirve para producción" de la
  fuente es sobre los espacios gratuitos de inferencia de GPU (Hugging Face
  Spaces) para la generación de arte con IA — un problema distinto, no
  aplicable al redirector de base de datos.

Dicho de otro modo: la fuente identifica el mismo riesgo que ya se había
identificado y documentado, pero no aporta una solución de infraestructura
que estuviera pendiente de leer. El trabajo que falta es de ingeniería propia,
no de relectura.

---

## 3. Vercel no es el problema; el plan gratuito de Neon sí lo es

Antes de considerar cambiar de plataforma, hay que ser precisos sobre dónde
está realmente la debilidad, para no resolver el problema equivocado:

- **Vercel Functions**: no hay evidencia de ningún límite de la plataforma que
  afecte a este caso de uso. Es la capa de cómputo, no de persistencia, y
  escala sin intervención. Migrar la aplicación a otra plataforma no resuelve
  nada aquí porque Vercel no es donde está el riesgo.
- **Neon, plan gratuito**: la única debilidad demostrada con evidencia
  concreta es el *scale to zero* sin posibilidad de desactivarlo. Es una
  limitación **del plan**, no del producto ni de la arquitectura Postgres de
  Neon. Neon en un plan de pago (Launch, desde unos 5-20 $/mes según el uso)
  permite fijar `suspend_timeout_seconds: -1` y el compute queda encendido de
  forma permanente, eliminando por completo la latencia de reanudación.

**Aviso importante para no repetir un error de expectativa:** ningún
proveedor —Render, Railway, Fly.io, Supabase, lo que sea— da de forma
gratuita e indefinida lo mismo que un plan de pago da en cualquier otro sitio.
El plan gratuito de Render, por ejemplo, también suspende sus servicios web y
su Postgres gratuito tras inactividad, con las mismas características que se
le reprochan aquí a Neon. Cambiar de proveedor buscando "un gratuito que sí
esté siempre despierto" es perseguir algo que no existe en ningún sitio serio:
la disponibilidad permanente se paga, en cualquier plataforma. La decisión
real no es "¿qué plataforma?", es "¿estamos dispuestos a pagar por
disponibilidad ahora, o se acepta la latencia del plan gratuito hasta que haya
ingresos reales que la justifiquen?". Esa es una decisión de negocio, no de
ingeniería, y le corresponde al titular del proyecto, no a un agente.

---

## 4. Recomendación técnica, en orden de lo más simple a lo más costoso

### 4.1 Inmediato y barato: subir Neon a un plan de pago y desactivar el scale-to-zero

Es el cambio de mayor impacto por menor esfuerzo. Elimina la **única**
debilidad de disponibilidad demostrada con evidencia real esta sesión (no la
hipotética "caída total de una región", que se trata aparte en 4.3). Requiere:

1. Decisión y aprobación de gasto del titular del proyecto (no es una decisión
   técnica).
2. Cambiar el plan del proyecto Neon desde el marketplace de Vercel o
   directamente en la consola de Neon.
3. `PATCH` al endpoint de cómputo con `suspend_timeout_seconds: -1` (ya se
   intentó esta sesión y la API devolvió que el plan gratuito no lo permite;
   con el plan de pago activo, la misma llamada debería tener éxito —
   confirmarlo, no asumirlo).
4. Verificar con `db/verificar-blindaje.mjs` que nada del blindaje se alteró
   al cambiar de plan (no debería, pero se confirma, no se supone).

### 4.2 Retirar la dependencia de GitHub Actions, tal como se pidió

El mecanismo construido esta sesión (`src/lib/cache-resiliencia.ts`,
`db/sincronizar-cache-resiliencia.mjs`,
`.github/workflows/sincronizar-cache-resiliencia.yml`) queda **desactivado**,
no borrado. Motivo de no borrarlo: el código en sí —el espejo de solo lectura
en Vercel Global Config, el rol `dk_sincronizacion` sin alcance para la
aplicación pública, la conmutación automática Neon→caché en las rutas— es
correcto y está probado; lo que no es profesional es el **disparador**: un
programador de tareas de un sistema de integración continua gratuito, con
ejecución de mejor esfuerzo y sin garantía de horario, documentado así por el
propio GitHub, sirviendo de disparador para la disponibilidad de un sistema
del que dependen clientes de pago.

El disparador programado del flujo de GitHub Actions se ha desactivado en
esta misma sesión (queda solo como `workflow_dispatch`, ejecución manual). No
se recomienda reactivar el `schedule: cron` como solución permanente.

**Qué hacer con este mecanismo:**
- Si tras 4.1 (Neon en plan de pago, sin scale-to-zero) se considera que el
  riesgo residual es aceptable —un incidente real y prolongado de toda la
  región de Neon es raro, y ninguna empresa en esta fase, sin clientes reales
  todavía, sostiene una arquitectura activa-activa multirregión—, este
  mecanismo puede retirarse del todo sin pérdida: era una defensa para un
  riesgo que 4.1 ya reduce a su mínimo razonable.
- Si se decide mantener una capa de resiliencia adicional pese a 4.1, el
  disparador correcto es un **Vercel Cron Job** (primitiva nativa de la misma
  plataforma que aloja el despliegue, con monitorización y garantías de
  ejecución documentadas, no un sistema de CI reutilizado), no GitHub
  Actions. Esto no se implementó esta sesión porque introduce la misma
  pregunta sin resolver de qué credencial usa esa tarea para escribir en
  Global Config (ver Sección 5.2): antes de construirlo hay que decidir si se
  acepta un token de Vercel de alcance amplio dentro del propio proyecto
  (documentado como aceptable si se aísla en una ruta protegida y nunca se
  expone a tráfico público) o si se prescinde de Global Config y se usa en su
  lugar un proveedor de caché con tokens de escritura acotables de verdad
  (por ejemplo, Upstash Redis del marketplace de Vercel, que si ofrece claves
  de API restringidas por operación).

### 4.3 Solo si el negocio lo justifica: resiliencia multirregión de verdad

Esto es lo que de verdad correspondería a "una plataforma externa a Neon,
paralela, para cuando el servidor principal falle" — y hay que ser honesto
sobre su tamaño real: no es una tarea de una tarde, es un proyecto de
infraestructura con piezas propias:

- Una base de datos réplica en otro proveedor o región, mantenida al día por
  replicación lógica continua (Postgres lo soporta de forma nativa; Neon
  también).
- Un mecanismo de comprobación de salud que detecte la caída del primario en
  segundos, no en minutos.
- Un mecanismo de conmutación automática (cambio de cadena de conexión o de
  DNS) que no dependa de que una persona esté mirando una pantalla cuando
  ocurra el incidente.
- Monitorización y alertas sobre el propio mecanismo de failover, porque un
  sistema de emergencia que nadie vigila falla en silencio justo cuando hace
  falta.

Esto exige presupuesto, decisiones de proveedor, y validación bajo carga real
con herramientas propias de pruebas de rendimiento (Sección 6) — no es
alcanzable desde un entorno de trabajo en sandbox sin acceso TCP directo a
Postgres y sin autoridad para aprovisionar infraestructura de pago, que es la
situación real de la sesión que escribió este documento. Se deja explícitamente
fuera de alcance para un agente con más capacidad operativa, y no debe
construirse con atajos (como el de GitHub Actions) que aparenten resolverlo
sin hacerlo de verdad.

---

## 5. Lo que se construyó esta sesión, estado exacto

Para que quien continúe no tenga que releer commits para saber qué hay:

### 5.1 Piezas activas y correctas, no dependientes de la decisión pendiente

- `db/migrations/0001` a `0006`: esquema, roles, RLS, motor de QR, freno de
  frecuencia respaldado por Neon. Verificado, 55/55 en
  `db/verificar-blindaje.mjs` a fecha de este documento.
- `src/app/r/[codigo]/route.ts`, `src/app/m/[slug]/page.tsx`,
  `src/lib/menu.ts`, `src/lib/db.ts`: el motor de QR en sí, probado en
  producción real de Vercel (con bypass de protección generado y revocado
  tras la prueba).
- `src/lib/limite-frecuencia.ts` + migración 0005/0006: freno de frecuencia
  global respaldado por Neon, no en memoria de proceso. Sigue siendo válido
  con independencia de la decisión de disponibilidad.

### 5.2 Piezas construidas pero NO adoptadas como solución final

- `src/lib/cache-resiliencia.ts`: lectura de solo lectura desde Vercel Global
  Config. El código en sí funciona —probado con una caída de Neon simulada de
  verdad (host inexistente) en un build de producción real— pero **su fuente
  de datos no se actualiza sola** porque el disparador (GitHub Actions) se
  desactivó a petición explícita del titular del proyecto. Sin un disparador
  activo, esta caché queda congelada en el último estado sincronizado
  manualmente en esta sesión y **no debe considerarse una defensa viva** hasta
  que se resuelva 4.2.
- `db/sincronizar-cache-resiliencia.mjs`: el escritor de esa caché. Corre con
  el rol `dk_sync` → `dk_sincronizacion` (migraciones 0007 y 0008), aislado
  correctamente de `dk_app` (comprobado con `pg_has_role` en la suite de
  verificación). Reutilizable si se decide activar un disparador distinto.
- `.github/workflows/sincronizar-cache-resiliencia.yml`: **desactivado**, solo
  ejecución manual. No reactivar su `schedule` como solución permanente; ver
  4.2.

Nada de esto se ha borrado porque revertir trabajo correcto y probado, solo
por retirar un disparador inadecuado, sería desperdiciar la parte que sí está
bien hecha. Quien continúe decide si lo activa con un disparador profesional,
lo sustituye por 4.1 solamente, o construye 4.3.

---

## 6. Cómo validar esto de verdad, para quien lo retome

Lo que **no** vale como prueba, y es importante decirlo porque es exactamente
lo que se pidió dejar de hacer: golpear `/r/{codigo}` un puñado de veces con
`curl` desde una sola máquina y mirar el código de respuesta. Eso demuestra
que el mecanismo existe, no que aguanta producción.

Una validación real, para quien tenga el entorno adecuado:

1. **Herramienta de carga real**: k6 o Artillery, no bucles de `curl`. Definir
   un escenario con la distribución de tráfico esperada —no 1.000 peticiones
   simultáneas irreales, sino 1.000 códigos activos con el patrón de escaneo
   real de un restaurante (ráfagas cortas en horas de comida, silencio el
   resto del día).
2. **Contra un entorno de verdad**, no `next start` local ni un sandbox con
   IP de salida rotativa (esta sesión descubrió que su propio proxy de salida
   cambia de IP en cada conexión, lo que invalida cualquier prueba de freno de
   frecuencia por IP fija hecha desde aquí — anotado para que no se repita el
   mismo error de diagnóstico).
3. **Con inyección de fallos real**, no solo una URL de base de datos rota a
   mano: simular la suspensión real del compute de Neon, medir la latencia de
   reanudación bajo carga, y —si se implementa 4.3— matar de verdad la
   conexión al primario y medir cuánto tarda el sistema en conmutar al
   secundario, no asumirlo.
4. **Con monitorización y alertas conectadas**, para que un incidente real se
   note en minutos, no cuando un cliente llama a quejarse.

---

## 7. Resumen para decidir, en una tabla

| Opción | Resuelve | Coste | Esfuerzo | Recomendado |
|---|---|---|---|---|
| 4.1 Neon plan de pago, sin scale-to-zero | La única debilidad demostrada | ~5-20 $/mes | Bajo, en su mayoría configuración | **Sí, primero** |
| 4.2 Retirar GitHub Actions | El riesgo de depender de un disparador de CI | Ninguno | Ya hecho esta sesión | **Sí** |
| Caché de resiliencia con Vercel Cron | Una capa extra tras 4.1 | Bajo | Medio; exige resolver el alcance del token de Vercel | Solo si 4.1 no basta |
| 4.3 Multirregión activo-activo | El escenario de caída total de Neon | Alto | Alto; proyecto propio | Solo cuando el volumen de clientes reales lo justifique |
| Cambiar de Vercel a otra plataforma de cómputo | Nada — Vercel no es el problema | — | — | **No** |
| Cambiar de Neon a otro Postgres gestionado sin plan de pago | Nada — misma limitación en cualquier proveedor gratuito | — | — | **No** |

---

**Nota aparte, no de disponibilidad:** la misma referencia analizada aquí
(`javiggil.com/56fc9cb32b97`) contiene ideas de producto y de crecimiento —QR
con aspecto de marca, SEO programático, programa de afiliados— que no son de
este documento. Están tratadas en
[`VALOR_ANADIDO_QR_PERSONALIZADO_Y_CRECIMIENTO.md`](./VALOR_ANADIDO_QR_PERSONALIZADO_Y_CRECIMIENTO.md).
