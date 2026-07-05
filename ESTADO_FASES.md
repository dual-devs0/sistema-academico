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

- **Tests postgres_compat necesitan DB de test separada en Neon** (branch o database aparte).
  Al correr la suite completa con `TEST_DATABASE_URL` apuntando a la DB de desarrollo,
  el teardown del fixture `pg_engine` borra todos los datos de desarrollo.
  Crear una segunda database en Neon (`neondb_test` o branch `test`) y usar esa URL
  exclusivamente para CI. La DB de desarrollo queda intacta.