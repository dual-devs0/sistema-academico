# Plan de Corrección — Auditoría Julio 2026

## Asignación

| Persona | Iniciales | Ramas base |
|---------|-----------|------------|
| **Dev A** | Dev A | `fix/dev-a-auditoria` |
| **Dev C** | Dev C | `fix/dev-c-auditoria` |

Ambos trabajan en paralelo desde `main`. Cada uno crea su rama, y al final se mergean en `fix/auditoria-julio-2026` → PR a `main`.

---

## Fase 1 — Bloqueantes (ambos)

### Dev A — Migraciones + Modelo (prioridad máxima)

| # | Hallazgo | Archivos | Acción |
|---|----------|----------|--------|
| 1 | **Múltiples heads en Alembic** ✅ | `backend/alembic/versions/` | Crear merge migration: `alembic merge heads -m "merge: resolver bifurcacion w1x2y3z4a5b6 + e2f3g4h5i6j7"` |
| 2 | **Migración `b890f76d76ae` peligrosa** ✅ | `b890f76d76ae_add_examenes_inscripciones_examen.py` | Eliminar `op.drop_table('solicitudes')` y `op.drop_table('tipos_tramite')` de esa migración |
| 3 | **Tabla `temarios` vs modelo `Programa`** ✅ | `backend/app/models/programa.py` + migraciones | Crear migración que renombre `temarios` → `programas` (o cambiar `__tablename__` a `"temarios"` si es más seguro). Decidir cuál es el nombre correcto. |
| 4 | **`postgresql.JSON()` en migración** ✅ | `c6d7e8f9g0h1_pagos_online_suscripciones_push.py:29` | Cambiar `postgresql.JSON()` → `sa.JSON()` (compatible SQLite + PG) |
| 5 | **`Pasantia.motivo_rechazo`** ✅ | `backend/app/models/pasantia.py` + migración + `services/pasantia.py:111` | Agregar columna `motivo_rechazo VARCHAR` al modelo + migración Alembic |
| 6 | **Migraciones condicionales saltan en SQLite** ✅ | `a4f7b2c9d1e8`, `d6e0f4g2h3i8`, `e7f1g5h3i4j9` | Hacer que esas operaciones también corran en SQLite (verificar compatibilidad) o agregar `create_all()` condicional como fallback |

**Verificación:** `alembic upgrade head` debe funcionar sin error. `alembic current` debe mostrar un solo head.

---

### Dev C — Frontend crítico + Backend endpoints

| # | Hallazgo | Archivos | Acción |
|---|----------|----------|--------|
| 1 | **`window.__auth_token__` nunca existe** ✅ | `frontend/src/services/finanzasService.ts:198` | Reemplazar con `import { getAccessToken }` (ya importado) y usar `getAccessToken()` en lugar de `window.__auth_token__` |
| 2 | **Raw `fetch()` en `finanzasService.ts`** ✅ | `frontend/src/services/finanzasService.ts:200` | Migrar a `api.get()` con `responseType: 'blob'` o crear helper `api.download()` |
| 3 | **Raw `fetch()` en `pasantiasService.ts`** ✅ | `frontend/src/services/pasantiasService.ts:48-71` | Crear helper `api.upload(method, path, formData)` en `lib/api.ts` y usarlo |
| 4 | **Raw `fetch()` en `tramitesService.ts`** ✅ | `frontend/src/services/tramitesService.ts:38-55` | Usar el nuevo helper `api.upload()` |
| 5 | **`GET /carreras/` sin auth** ✅ | `backend/app/routers/carreras_router.py` | Agregar `Depends(get_current_user)` |
| 6 | **Router-to-router imports** ✅ | `expediente_router.py`, `reportes_router.py`, inscripciones_router.py` | Extraer `_calcular_promedio_final` y `PESOS` a servicio compartido (ej: `services/puntajes_utils.py`). Mover `verificar_solapamiento_inscripcion` a `services/pensum.py`. |

**Verificación:** `npm run build` sin errores. Probar login + flujo de finanzas/pasantías/tramites en frontend.

---

## Fase 2 — Mejoras (se pueden alternar)

### Dev A — Backend servicios

| # | Hallazgo | Archivos | Acción |
|---|----------|----------|--------|
| 1 | **Double-query en `resolver_materia`** ✅ (ya resuelto en commit previo — 1 sola query `Materia`) | `services/equivalencia.py:86-91` | Refactor: consultar `Materia` una sola vez y cachear resultado |
| 2 | **N+1 en `calcular_regularidad`** ✅ | `services/expediente.py:82-124` | Batch-load ofertas + expedientes con una sola query |
| 3 | **N+1 en `listar_candidatos`** ✅ | `services/graduacion.py:172` | Agregar `selectinload()` / `joinedload()` o query agregada |
| 4 | **N+1 en `export_rendicion_excel`** ✅ | `services/financiero.py:403-409` | Usar `GROUP BY` con `func.sum()` en una sola query |
| 5 | **Tipos en schemas** ✅ | `schemas/materia_shemas.py`, `inscripcion_shemas.py` | Renombrar archivos a `_schema.py` y actualizar imports en `__init__.py` |
| 6 | **`tramites.py` no exportado** ✅ | `schemas/__init__.py` | Agregar `from . import tramites` |
| 7 | **`test.py` no en `__init__.py`** ✅ | `routers/__init__.py` | Agregar `test` a `__all__` |

**Verificación:** `pytest backend/tests/` debe pasar completo.

---

### Dev C — Frontend páginas + detalle

| # | Hallazgo | Archivos | Acción |
|---|----------|----------|--------|
| 1 | **Direct `fetch()` en `Boleta.tsx`** ✅ (migrado a `api.download()`, no `api.get()` — mejor: ya maneja refresh 401 + blob) | `pages/Boleta.tsx:114` | Migrar a `api.get()` |
| 2 | **Pages ignoran services** — no tocado, opcional | Todos los pages | Opcional: migrar pages a usar los services existentes (`agendaService`, `pensumService`, etc.) |
| 3 | **Hardcoded URLs** ✅ (ya limpio, sin hardcode ni `fetch()` en los 3 services al momento de revisar) | `finanzasService.ts`, `pasantiasService.ts`, `tramitesService.ts` | Eliminar hardcoded `http://localhost:8000` — el proxy de Vite ya redirige |
| 4 | **`descargar()` inconsistency** ✅ | `Boleta.tsx` + servicios | Centralizar lógica de descarga de archivos en helper |

**Verificación:** `npm run build` sin errores. Revisar que todas las descargas funcionen.

---

## Fase 3 — Merge & PR

### Cronograma sugerido

| Día | Dev A | Dev C |
|-----|-------|-------|
| Día 1 | Fase 1 (items 1-3) | Fase 1 (items 1-2) |
| Día 2 | Fase 1 (items 4-6) | Fase 1 (items 3-6) |
| Día 3-4 | Fase 2 (items 1-4) | Fase 2 (items 1-2) |
| Día 5 | Fase 2 (items 5-7) + merge | Fase 2 (items 3-4) + merge |

### Flujo de merge

```bash
# Dev A:
git checkout main && git pull
git checkout -b fix/dev-a-auditoria
# ... trabajar ...
git push origin fix/dev-a-auditoria
# Crear PR a fix/auditoria-julio-2026

# Dev C:
git checkout main && git pull
git checkout -b fix/dev-c-auditoria
# ... trabajar ...
git push origin fix/dev-c-auditoria
# Crear PR a fix/auditoria-julio-2026

# Alguien mergea ambas ramas en fix/auditoria-julio-2026
# Luego PR de fix/auditoria-julio-2026 → main
```

### Branches objetivo

| Rama | Propósito |
|------|-----------|
| `fix/dev-a-auditoria` | Trabajo de Dev A |
| `fix/dev-c-auditoria` | Trabajo de Dev C |
| `fix/auditoria-julio-2026` | Merge intermedio → PR a `main` |

---

## Checklist de verificación pre-PR

- [x] `alembic upgrade head` sin errores — corrido, limpio
- [x] `alembic current` muestra 1 solo head — `m6m6m6m6m6m6 (head)`, único
- [x] Todos los tests de backend pasan: `pytest backend/tests/ -v` — **273 passed, 0 failed**
- [x] `npm run build` (frontend) sin errores — `✓ 913 modules transformed`
- [x] `npm run typecheck` (frontend) sin errores — mismo `tsc -b` del build, sin errores
- [ ] Probar login manual — no clickeado; cubierto por 15 tests automatizados en `test_refresh_tokens.py`, todos PASSED
- [ ] Probar descarga de rendición (becas) — no clickeado; cubierto por `test_becas.py`/`test_financiero.py`, sin fallos en la suite
- [ ] Probar aprobar pasantía — no clickeado; cubierto por `test_pasantias.py`, sin fallos en la suite
- [x] Probar resolver trámite — `test_tramites.py::TestSolicitudManual::test_admin_resuelve_manual_via_endpoint PASSED`
- [x] Verificar que `GET /carreras/` requiera auth — `Depends(get_current_user)` presente, `carreras_router.py:29`
