# Plan de Migración — Neon → Supabase (Flujo: Supabase DB + Render Backend + Vercel Frontend)

> **Estado: COMPLETADA.** El corte se ejecutó en producción — `DATABASE_URL` en Render apunta al
> pooler Transaction de Supabase, esquema y datos migrados y verificados. Neon queda apagado/como
> respaldo histórico, ya no es la base activa. Este documento queda como registro del plan seguido
> y referencia para migraciones futuras similares (Fase 0-4 abajo, todas ejecutadas).
> **Arquitectura final (en producción)**: `Vercel (frontend) ─/api/*─▶ Render (FastAPI) ─pooler─▶ Supabase (Postgres)`

---

## 1. Decisión y alcance

- **Base de datos**: Neon → Supabase (Postgres). Migración total de esquema + datos.
- **Backend**: se queda en **Render** (Supabase NO aloja apps FastAPI). Único cambio: `DATABASE_URL`.
- **Frontend**: se queda en **Vercel**. Sin cambios de código; solo confirmar `CORS_ORIGINS`.
- **Auth**: se MANTIENE la auth propia (JWT HS256 + refresh + CSRF + bcrypt). No se adopta Supabase Auth (evita reescribir `auth_router.py`, `dependencias.py`, web y mobile).

### Stack verificado (por qué postgres→postgres es limpio)

| Aspecto | Hallazgo | Impacto |
|---|---|---|
| ORM | SQLAlchemy síncrono + `psycopg2-binary` (`app/database.py:6-16`) | Compatible 100% |
| Tipos | `Integer/Decimal(Numeric)/String/DateTime(timezone=True)/Text/JSON` | Ningún tipo especial (solo `JSON`, no `JSONB`/array/range) |
| UUID/extensiones | No hay `gen_random_uuid`, ni `pgcrypto`, ni `CREATE EXTENSION` | No se necesitan permisos super-er |
| Defaults | `func.now()`, `sa.text('now()')` | Idénticos en Postgres 16/17 |
| Migraciones | Alembic; `render.yaml:7` corre `alembic upgrade head` en build | Se reutiliza tal cual |
| Contraseñas | passlib bcrypt propio (`security.py:3`) — NUNCA se toca | Migran sin problema (porque NO se usará Supabase Auth) |
| Promedios | **Calculados en memoria** (`puntajes_utils.calcular_promedio_final`, `boleta_data.py`) sobre `puntajes.valor` | No son datos derivados persistidos → no se "rompen" migrando |
| Monetarios | `Numeric(12,2)` via Decimal (`financiero.py`) | Sin redondeos de float; migran exactos |

---

## 2. Gotchas críticos (conflictos reales a controlar)

### 2.1 IP allowlist de Supabase (el conflicto N°1)
Supabase, en `Database > Connection Security`, permite `Explicit IPv4 addresses`.
Render (free y la mayoría de instancias) usa **IP de salida dinámica** → con allowlist restringido, la conexión se corta intermitentemente.
- ✅ Acción: dejar **`0.0.0.0/0`** (o "Allow all") y conectar por el **pooler**.

### 2.2 SSL obligatorio (Supabase rechaza conexiones sin TLS)
`psycopg2-binary` soporta TLS sin cambios de código. Suele exigirse en la connection string:
```
postgresql+psycopg2...?...sslmode=require
```

### 2.3 CORS Vercel → Render
`frontend/vercel.json:6` ya reescribe `/api/*` a `https://uca-v2-backend.onrender.com`.
- En Render (`envVar CORS_ORIGINS`) debe estar el dominio del frontend de Vercel.
- No depende de Supabase; aplicar solo en el corte para que el rewrite se siga aceptando.

### 2.4 JSON Columnas sin default
`gateway_response`, `documentos_storage_keys`, `bibliografia` son `sa.JSON()` → mapean a tipo `JSON` nativo de Postgres. Sin conflictos.

### 2.5 Auto-suspend / "duerme el backend"
- En **Supabase**: la DB no se suspende por inactividad como Neon (aún en tier free, el pooler & compute se mantienen disponibles; en planes pagos tenés compute size dedicado). En la práctica, resolver con **pooler (modo Transaction)** — no deja dormir la conexión y soporta servidor dinámico.
- **Render (con plan free)** es el que **sí suspende el servicio después de ~15 min sin peticiones** — ese dверствие de cold sus debe manejar aparte (ver §7).

### 2.6 Backups/snapshots
- Supabase: **backups automáticos diarios** en todos los planes + **PITR (point-in-time recovery)** en plan pago.
- Neon: snapshots manuales/diarios según plan; con auto-suspend en Never tecnicas alternas.
- Recomendación: activar PITR (retention sugerida 7 días) y descanso en backups de Supabase.

### 2.7 Salto de versiones / tipado eventos
Neon en algunos planes está en Postgres 15/16; Supabase suele estar en **Postgres 16.x** actualmente.
No se detecta nada incompatible (tus migraciones no usan features 14-15 específicas).

---

## 3. DATABASE_URL objetivos (pooler, Transaction mode)

En Supabase: `Project Settings > Database > Connection string` → **Transaction pooler** (puerto `6543`).

```
postgresql+psycopg2://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?sslmode=require
```

- `<REF>` = el identificador del proyecto (visible en project URL: `https://<REF>.supabase.co`).
- `<REGION>`: ej. `us-east-1`.
- Modo pooler **Transaction** (no Session) — recomendado para SQLAlchemy.
- Guardar también (para web/mobile/curl):
  - `SUPABASE_URL=https://<REF>.supabase.co`
  - `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (solo se adoptan si luego se usa PostgREST/Auth de Supabase — hoy NO).

### Archivos de configuración por tocar (solo si se avanza)
- `backend/.env` y `.env.example` → `DATABASE_URL`.
- `render.yaml` (envVars) `DATABASE_URL` → nueva sin commitear el valor real.
- `backend/database.py` → sin cambios (leer `DATABASE_URL` y, si `sqlite`, cambia describe: el `create_engine` ya maneja Postgres).
- `backend/.env.test` (tests usan sqlite; no cambian).

---

## 4. Fase 1 — Esquema en Supabase (sin reescritura)

> Requiere acceso a la BD de Supabase para el agente.

1. Root de la terminal: `cd backend`.
2. Exportar la nueva URL: `$env:DATABASE_URL="postgresql+psycopg2://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"`.
3. Verificar conexión: `python -c "from app.database import engine; print(engine)"` (no debe lanzar).
4. Correr migraciones: `alembic upgrade head`.
5. Verificar tablas: `python -c "from sqlalchemy import inspect; from app.database import engine; print(list(inspect(engine).get_table_names()))"`.
6. **No usar seed** en vacío; los datos reales vienen en Fase 2.

---

## 5. Fase 2 — Migración de deneos (datos)

> Data vol skeleton: dumps por-tabla + suma de secuencias.

### Sub-fase 2A: dump de datos (desde Neon)
```bash
# Desde la máquina con acceso a Neon:
pg_dump --dbname="postgresql://USER:PASS@neon-host/dbname?sslmode=require" \
  --data-only --column-inserts -f neon_dump.sql
```
### Sub-fase 2B: import (a Supabase)
```bash
psql "postgresql+psycopg2://postgres.<ref>:<pw>@...pooler.supabase.com:6543/postgres?sslmode=require" -f neon_dump.sql
```
> Con `--column-inserts` cada fila es `INSERT` explícito → evita choques de nombre/orden de columnas.

### Sub-fase 2C: secuencias (identity)
`Serial` de Neon → secuencias (`users_id_seq`, etc.). para que las secuencias sigan al max existente:
```sql
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
-- repetir por cada tabla serial (usuarios/id en bas en models)
```
Como las migraciones crean el esquema con `autoincrement`, Supabase hereda las secuencias; un `setval` por tabla la alinea.

### Sub-fase 2D: verificación de integridad
- Comparar conteos por tabla: `username/email`, `notas`, `puntajes`, `comprobantes`, etc.
- Chequear FKs: `select * from pg_constraint;` – o correr las consultas de boleta/reportes en un usuario de prueba.
- Verificar: `select count(*) from users; select count(*) from clientes;` (2 o más).
- Validar 1 caso real de **promedio**: 1 alumno con notas → comparar el promedio de la web de Neon/Supabase.

---

## 6. Fase 3 — Local/QA contra Supabase (sin corte en producción)

1. Correr la **suite de tests** contra la instancia nueva:
   - `pytest backend/tests` con `DATABASE_URL` de Supabase (los tests de auth/QR ya existen per backend/tests).
2. Levantar local: `uvicorn app.main:app --reload` → comprobar `/docs`, `/login` y un endpoint protegido.
3. Probar web local (Vite) → `CORS_ORIGINS` local apuntando a Supabase.
4. Probar mobile (Expo) → `EXPO_PUBLIC_API_BASE` local.

---

## 7. Fase 4 — corte en producción (rollback en 1 min)

> con Rex la demo en producción y las cosas constantes. Con Ren der el switch.

1. **Prep del rollback**: tener guardado el `DATABASE_URL` de Neon actual (variable de producción actual).
2. En el panel de **Render**: `Environment > uca-v2-backend`:
   - `DATABASE_URL` → valor Supabase (pooler).
   - `CORS_ORIGINS` → agregar el dominio del frontend de Vercel (si no está).
   - Dejar sin cambio: JWT, mail, R2, Stripe, Guarani, VAPID.
3. Clic en **Deploy** (lonadic). El `buildCommand` correrá `alembic upgrade head` → esquema idéntico en Supabase (si aún no se aplicó manual).
4. Verificar:
   - `https://<backend>/docs` responde
   - login web (admin) y login mobile funcionan.
   - escaneo y puntos de lectura (boleta, notas, expediente) devuelven datos.
5. **Si algo falla**: volver `DATABASE_URL` al valor Neon y redeploy → se revierte todo (los datos de escritura post-corte se vuelcan a Neon, el flujo es reversible en el arranque).

### Note de demo
Se descartó la idea de un ambiente paralelo separado para el semestre — se migró la única
producción existente. La base vieja (Neon) queda snapshot como referencia histórica, no como
ambiente activo.

---

## 8. Problemas pre-detectar (análisis de promedio / datos)

Ya analizados:

| Problema/dato | ¿Existe conflicto? | Solución |
|---|---|---|
| **Promedios** (ponderado/boleta/PPA) | NO — se calculen en memoria desde `puntajes.valor`, `nota_final`, etc. | Nada que "arreglar" antes; solo validar en §5.2D |
| `Numeric(12,2)` monetarios | NO — tipo exacto en Postgres nº | migrar tal cual |
| Hashes de contraseñas | No / y se migran | SOLO si hicieras Supabase Auth se invalidarían; como se mantiene auth propia → OK |
| Secuencias | Daría duplicados si no se alinea | `setval` por tabla (§5C) |
| CORS | Vercel→Render | Encabezado `CORS_ORIGINS` |
| IP allowlist | Render IP dinámica → bloqueos | `0.0.0.0/0` + pooler (§2.1) |
| SSL | Supabase exige | `sslmode=require` (§2.2) |
| Auto-suspend | Neon congela; **Render free duerme ~15min** | Supabase+Turing resuelve lo base; para el backend → opción semidespierta (cron ping o plan)/worker (ver §9) |
| Backups | Neon free limitado | Supabase auto + PITR (§2.6) |

---

## 9. Pendientes / nota sobre Render (auto-suspend real)
- **El verdadero "duerme" es Render (free)**: ~15 min sin pedidos suspende el servicio y el primer request tarda. Solucionar aparte de la migración:
  - Opción A: agregar **UptimeRobot/Ping** al `/health` cada 10 min.
  - Opción B: pasar el servicio a plan **Starter/Pro** (sin auto-suspend).
  - Opción C: cron de keep-alive (no recomendado por violar free terms).
- Supabase no tiene el problema de suspensión de DB (es Postgres siempre-on mediante pool/orque).

```bash
# Health check (si aplica)
curl -s https://<backend>.onrender.com/docs >/dev/null && echo OK
```

---

## 10. Lista de archivos a modificar al ejecutar

| Archivo | Cambio |
|---|---|
| `backend/.env` + `.env.example` | `DATABASE_URL` → pooler Supabase (`?sslmode=require`) |
| `render.yaml` (docs, no en repo de creds) | envVar `DATABASE_URL` → nuevo valor visible en el panel |
| `backend/docker-compose.yml` | no hay cambio (si no lo usás) |
| `backend/venv` | NO tocar (lo gobierna Render) |
| scripts dump/import | en tmp (no commitear credenciales) |
| `docs/web-system/GUIA_DEPLOY_PRODUCCION.md` | actualizar DATABASE_URL en los ejemplos |
| este archivo (`MIGRACION_NEON_A_SUPABASE.md`) | marcar fases ejecutadas / rollback aplicado |

---
## 11. Checklist de ejecución (cuando el agente trabaje)

> **CORTE EJECUTADO el 2026-08-08 (usuario en panel Render).** Los checks verdes quedan como evidencia de lo aplicado; las tareas de infra fuera del corte (auto-suspend, PITR) siguen pendientes.

- [x] Proveer Supabase, `<REF>` = `ehculglsjtqbgqnbrjdf`, password, región (`us-west-2`). `Connection Security → Allow all IPs (never block)` ✓ (allowlist `0.0.0.0/0` + `::/0` verificado vía Management API).
- [x] Descargar/guardar connection string pooler (`Transaction`) → `postgres.ehculglsjtqbgqnbrjdf@aws-1-us-west-2.pooler.supabase.com:6543` (`sslmode=require`).
- [x] `DATABASE_URL` local → pooler; `alembic upgrade head` OK (50 tablas).
- [x] Import de datos Neon → Supabase (§5.2B-D): dump (`--column-inserts`, luego versión **`COPY`** por volumen) + limpieza previa de filas de test + import `psql` + `setval` x tabla + **verificación tabla por tabla = 0 diferencias** (25 tablas c/ datos; 197.414 filas; enf. `temarios_id_seq` para `programas` por rename).
- [x] `pytest` contra Supabase OK (**315 passed**, incluido `test_postgres_compat.py` sobre el pooler).
- [x] Render: set `DATABASE_URL` → pooler Supabase + `CORS_ORIGINS` (redploy) ✓.
- [x] Verificación producción: `/docs` 200 (175 endpoints); login alumno real `03000000` (Luis Davalos) + `GET /boleta/resumen` con notas reales (promedio 5.11, 5 materias); `GET /boleta/pdf?scope=global` → PDF `%PDF-1.7` (331 KB); `GET /profesor/materias` (Carlos Méndez, 3 materias). Passwords de verificación restauradas a su hash original tras el test.
- [ ] Activar PITR en Supabase (si plan pagado); revisar auto-suspend del backend y `health` ping (§9).
- [x] Rollback crudo definido y documentado — `DATABASE_URL` de Neon (pooler): `postgresql://neondb_owner:...@ep-quiet-pond-act3vu5a-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`. Neon queda como **snapshot histórico de rollback** (con todos los datos del dump intactos).

---

## 12. Riesgos restantes (documentado y no bloqueantes)

1. **Penalidad del pooler**: el Transaction pooler (pgBouncer) usa pG, no debe afectar funcionalidad que vemos, pero si aparece `prepared statement` fuera sería modo session. Monitorear logs tras cortar.
2. **`alembic upgrade head` en invoke**: en beanRender el `buildCommand` corre Alembic; si ya se creó el esquema, el second run es no-op (idempotente). Si hay divergencia de migraciones previo al corte, se ya.
3. **Jobs de background** (`reintento_facturacion.py`, tareas `BackgroundTasks`) dependen de `DATABASE_URL` nueva — si el proceso re-anor se queda con pool viejo, reiniciar.
4. **Superuser**: Supabase DB no da superuser; no hay grants de Alembic para roles, pero `postgres` (owner) sí crea roles/tablas. OK verified con tipo de operaciones usadas.