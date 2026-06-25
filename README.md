# Sistema Académico — Universidad Católica

Sistema web para gestión académica: asistencia, puntajes, calendario, biblioteca de apuntes y temario de clases.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Fastify + Prisma ORM |
| Base de datos | PostgreSQL |
| Storage | Supabase Storage |
| Auth | JWT + bcrypt |

---

## Requisitos previos

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la BD local)
- [Git](https://git-scm.com/)

---

## Configuración inicial (primera vez)

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/sistema-academico.git
cd sistema-academico
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores locales
```

### 3. Levantar la base de datos local

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con:
- Usuario: `sa_user`
- Contraseña: `sa_pass`
- Base de datos: `sistema_academico`

### 4. Instalar dependencias y migrar BD

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed   # datos iniciales (admin por defecto)
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 5. Levantar el proyecto

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/v1
- Documentación API: http://localhost:3001/docs

---

## Flujo de trabajo Git

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para el flujo completo de ramas y Pull Requests.

### Ramas principales

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción. Solo se toca con releases. |
| `develop` | Integración del trabajo de ambos. Base para todo. |
| `feature/nombre` | Trabajo diario. Sale de develop, vuelve via PR. |

### Comandos del día a día

```bash
# Antes de arrancar — sincronizar develop
git checkout develop
git pull origin develop

# Crear rama para tu tarea
git checkout -b feature/nombre-modulo

# Commitear
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-modulo

# Abrir Pull Request en GitHub → base: develop
```

---

## Estructura del proyecto

```
sistema-academico/
├── frontend/
│   └── src/
│       ├── components/   # componentes reutilizables
│       ├── pages/        # vistas por ruta
│       ├── hooks/        # custom hooks
│       ├── lib/          # cliente API, utils
│       └── types/        # tipos TypeScript compartidos
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── routes/       # asistencia, puntajes, usuarios, calendario...
│       ├── plugins/      # auth, db, pdf
│       └── services/     # lógica de negocio
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Credenciales por defecto (desarrollo)

Después del seed:

| Usuario | Email | Contraseña |
|---------|-------|-----------|
| Admin | admin@uca.edu.py | Admin1234! |

**Cambiar antes de cualquier deploy a producción.**

---

## Fases del proyecto

- **v1 (MVP):** Auth + usuarios + asistencia + puntajes + vista alumno
- **v1.1:** Biblioteca + temario + calendario académico
- **v1.2:** Notificaciones + PDF + estadísticas
- **v2:** QR, foro, mobile
