# DKITCHEN — PARTE 17: LOGIN REAL DE CLIENTES RESUELTO DE PRINCIPIO A FIN (22/09/2026)

**Complementa a las Partes 15 y 16.** Cierra el bloqueo que impedía construir cualquier panel de autogestión real: no existía ningún flujo de inicio de sesión funcional.

---

## 1. Causa raíz real (no la que se sospechaba al principio)

No era un problema de integración de código. Era un dato mal formado en la configuración del propio proyecto de Neon Auth: los dos dominios de confianza (`Settings → Auth → Domains`) estaban guardados **con barra final** (`https://dkitchencorporate.es/`), y la documentación de Neon exige guardarlos **sin barra final**. Con el formato incorrecto, tanto `/sign-in/email` como `/request-password-reset` devolvían siempre `INVALID_ORIGIN`/`INVALID_REDIRECT_URL`, sin importar cómo se llamara (curl directo, navegador real, o el proxy oficial del SDK).

Se probó exhaustivamente antes de encontrar esto: llamada directa por servidor, llamada desde navegador real, y finalmente la integración oficial completa (`@neondatabase/auth`, que exige Next.js ≥16 — la razón real de subir de versión Next, no que "arreglara" el problema por sí sola). Los tres caminos daban el mismo error hasta corregir el formato del dominio.

## 2. Lo que se construyó en el camino, y sigue vigente

- **Next.js 14.2.5 → 16.3.5, React 18 → 19**, migración completa: `params`/`searchParams` ahora son `Promise` en todas las rutas dinámicas (`/r/[codigo]`, `/api/intake/[token]`, `/m/[slug]`, `/nucleo-operativo/completar/[token]`, `/qr/bienvenida`), `next.config.js` corregido (`serverExternalPackages` en vez de `experimental.serverComponentsExternalPackages`, config de `webpack` retirado por incompatibilidad con Turbopack, que ahora es el bundler por defecto).
- **Integración real de Neon Auth**: `src/lib/auth.ts` (`createNeonAuth`, servidor), ruta proxy `src/app/api/auth/[...path]/route.ts` (el nombre de carpeta debe ser `[...path]`, no `[...all]` como dice el ejemplo de la documentación — typo confirmado en su beta), `src/lib/auth-client.ts` (cliente de navegador).
- **`/panel/iniciar-sesion`**: página de login real, con diseño propio (no el UI kit de Neon), mostrar/ocultar contraseña, y casilla "Recordarme" (`rememberMe`).
- **`/panel/nueva-contrasena`**: mejorada con medidor de fortaleza, mostrar/ocultar en ambos campos, marcado en rojo del campo exacto que falla (muy corta / no coincide) en tiempo real, botón "Iniciar sesión ahora" + redirección automática a los 4 segundos tras fijar la contraseña.
- **`/panel`**: verificación mínima de sesión real vía `auth.getSession()` — confirmado en producción con una cuenta real (`klarx94@gmail.com`): sesión activa, `session.user.name`/`email` correctos.

## 3. Pendiente inmediato

Con el login resuelto, el trabajo que quedó en pausa puede arrancar ya: el Panel 1 (autogestión real de carta, QR descargable + solicitud de impresión física, escaneos, plan, soporte) y el Panel 2 (admin interno de Alex) — la especificación completa de ambos ya quedó acordada antes de esta investigación, sin cambios.
