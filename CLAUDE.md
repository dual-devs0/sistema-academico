# Contexto del proyecto — UCA V2

Este proyecto sigue un plan de desarrollo fásico documentado en PLAN_EJECUCION.md.
NUNCA avances a la fase siguiente sin que la fase actual esté marcada como
completa en ESTADO_FASES.md.

Stack: React 19 + TypeScript + Vite + Tailwind v4 (frontend) ·
FastAPI + SQLAlchemy + PostgreSQL + JWT (backend)

Reglas no negociables:
- Toda tabla nueva usa Alembic, nunca create_all()
- Todo endpoint nuevo requiere Depends(get_current_user) + verificación de rol
- Los montos monetarios siempre Numeric(12,2), nunca float
- Cada módulo nuevo necesita tests antes de darse por completo
- Antes de escribir código, siempre correr en modo Plan primero (ver más abajo)