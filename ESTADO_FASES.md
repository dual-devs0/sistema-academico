# Estado de fases — Plan Universidad UCA V2

| Fase | Estado | Fecha inicio | Fecha cierre | Notas |
|---|---|---|---|---|
| Fase 0 — Deuda técnica crítica | COMPLETA | 2026-07-04 | 2026-07-05 | 79 tests ✓ PostgreSQL Neon · Storage R2 · SMTP Gmail · Auth refresh httpOnly cookie |
| Fase 1 — Quick wins + portal docente | PENDIENTE | — | — | |
| Fase 2 — Pensum y malla curricular | PENDIENTE | — | — | |
| Fase 3 — Expediente académico | PENDIENTE | — | — | |
| Fase 4 — Financiero + becas | PENDIENTE | — | — | |
| Fase 4B — Facturación electrónica | PENDIENTE | — | — | |
| Fase 5 — Solicitudes/Graduación/Pasantías/Equivalencias | PENDIENTE | — | — | |

Estados válidos: PENDIENTE / EN_PROGRESO / EN_REVISION / COMPLETA

---

## Notas pendientes para próxima sesión

### Deuda técnica menor (no bloquea Fase 1)

- **Tests postgres_compat necesitan DB de test separada en Neon** — RESUELTA (2026-07-06).
  Branch `neondb_test` creada en el mismo proyecto Neon. `TEST_DATABASE_URL` vive en
  `backend/.env.test` (gitignored, nunca commiteado — verificado con
  `git log --all --full-history`). `tests/conftest.py` carga ese archivo con
  `load_dotenv` antes de importar `app.main`. Suite completa: 79 passed, incluyendo
  los 4 tests de `test_postgres_compat.py` (antes skipped) corriendo contra
  `neondb_test`. Confirmado por conteo de filas antes/después que `neondb`
  (desarrollo) no fue tocada.