#!/bin/bash
echo "=== Setup Sistema Académico ==="

# Verificar requisitos
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js no instalado"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker no instalado"; exit 1; }

# Copiar .env si no existe
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Archivo .env creado — completar con tus valores"
else
  echo "✓ .env ya existe"
fi

# Levantar PostgreSQL
echo "Levantando base de datos..."
docker compose up -d
sleep 3

# Backend
echo "Instalando dependencias del backend..."
cd backend && npm install

echo "Ejecutando migraciones..."
npx prisma migrate dev --name init

echo "Cargando datos iniciales..."
npx prisma db seed 2>/dev/null || echo "(seed pendiente de configurar)"
cd ..

# Frontend
echo "Instalando dependencias del frontend..."
cd frontend && npm install
cd ..

echo ""
echo "=== Listo! ==="
echo "  Backend:  cd backend && npm run dev   → http://localhost:3001"
echo "  Frontend: cd frontend && npm run dev  → http://localhost:5173"
