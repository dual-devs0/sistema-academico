# Estado de producción — UCA V2

Fecha de evaluación: 2026-09-17
Alcance: verificado contra código real (repo, `.env`, commits) y prueba en browser con credenciales reales de los 3 roles. No cubre infraestructura/operación fuera del repo (ver sección final).

**Veredicto: ~80-85% listo. Sin cobro online → listo para pilotar. Con cobro online → falta config de terceros (Stripe/guarani.app), no código.**

---

## ✅ Funcional

### Core académico
- Login + roles (alumno/profesor/admin) + permisos
- Asistencia (manual + QR + gate de regularidad)
- Notas, puntajes, promedios
- Inscripciones, malla curricular
- Dashboards (alumno/profesor/admin) con datos reales
- Expediente, graduación, equivalencias, pasantías, becas

### Notificaciones
- Email real de recuperación de contraseña — SMTP Gmail configurado y activo (`backend/.env`: `MAIL_SERVER=smtp.gmail.com` + credenciales reales, no placeholder)
- Rate limiting global

### Seguridad
- 11 huecos de IDOR/mass-assignment cerrados entre roles (commit `ca43b80`)
- Fix mass-assignment en apuntes (commit `9a6e0bd`)

### Infraestructura
- Backend en Render, frontend en Vercel, DB en Supabase — corriendo
- UptimeRobot para mantener backend despierto
- Datos de prueba (seed) limpios

### Frontend
- Rediseño visual completo aplicado en los 3 roles (sidebar, dashboards, todas las páginas, mini-contexto en sidebar)
- `tsc --noEmit` y `eslint` limpios en todo lo tocado

---

## ❌ Falta / degradado (por recursos y dinero, no por código)

### Bloqueante solo si necesitás cobrar
| Ítem | Estado en código | Qué falta |
|---|---|---|
| Pagos online (Stripe) | `sk_test_placeholder` / `pk_test_placeholder` / `whsec_placeholder` en `.env`. `pagos_online.py` detecta el placeholder y degrada sin crashear (no cobra, no rompe). | Cuenta Stripe real + claves de producción |
| Facturación electrónica (guarani.app) | `GUARANI_APP_API_KEY` vacío. `facturacion_electronica.py` ya maneja el fallo del proveedor con gracia (nunca bloquea el pago). | Cuenta/contrato con guarani.app + API key |

### No bloqueante, limita alcance
- **Dominio propio** — usando subdominios gratis de Render/Vercel
- **Render free tier** — no aguanta carga real sostenida (recursos/uptime limitados)
- **OTA mobile** — app móvil sin confirmar en dispositivo real

### Fuera de scope de código
Nada más pendiente detectado en el repo a la fecha de este documento.

---

## Conclusión

El sistema está funcionalmente completo para operar con usuarios reales (alumnos, profesores, admin) sin necesidad de procesar pagos. Los dos bloqueantes que quedan (Stripe, guarani.app) son gestiones de cuenta/dinero con terceros, no desarrollo pendiente — el código ya está preparado para conectarlos apenas existan las credenciales.

Los puntos de infraestructura (dominio propio, tier pago de hosting) son decisiones de presupuesto, no defectos técnicos.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
