# COMANDOS — Sistema Académico UCA v2

## 1. Backend (API — necesario para web + mobile)

```powershell
cd "C:\sistema academico uca v2\sistema-academico\backend"

# 1. Crear y activar venv (solo primera vez)
python -m venv venv
.\venv\Scripts\Activate

# 2. Instalar dependencias (solo primera vez)
pip install -r requeriments.txt

# 3. Correr migraciones (crea tablas en DB)
alembic upgrade head

# 4. Sembrar datos de prueba
python seed_usuarios.py

# 5. Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API disponible en:** `http://localhost:8000`
**Swagger docs:** `http://localhost:8000/docs`

---

## 2. Frontend Web (Vite)

```powershell
cd "C:\sistema academico uca v2\sistema-academico\frontend"

# 1. Instalar dependencias (solo primera vez)
npm install

# 2. Iniciar dev server
npm run dev
```

**Web disponible en:** `http://localhost:5173`
**Proxy — `/api` → `http://127.0.0.1:8000`** (configurado en `vite.config.ts`)

---

## 3. App Móvil (Expo / React Native)

```powershell
cd "C:\sistema academico uca v2\sistema-academico\mobile"

# 1. Instalar dependencias (solo primera vez)
npm install

# 2. Iniciar servidor de desarrollo
npx expo start

# 3a. Escanear QR con Expo Go
# 3b. O presionar 'a' para abrir en Android conectado por USB
```

**Mobile apunta a:** `http://192.168.100.12:8000` (ver `mobile/.env`)
> Si cambiás la IP de tu compu, actualizala en `mobile/.env`:
> `EXPO_PUBLIC_API_BASE=http://<TU-IP-LOCAL>:8000`

---

## 4. Orden de arranque

| Orden | Qué | Dónde |
|-------|-----|-------|
| 1º | Backend | `http://localhost:8000` |
| 2º | Web | `http://localhost:5173` |
| 3º | Mobile | USB + Expo |

> **Siempre prender el backend primero.** Sin backend, web y mobile no funcionan.

---

## 5. Credenciales de prueba

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin@uca.edu.py` | `Admin1234!` |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` |
| Alumno | `12345678` | `Alumno1234!` |

---

## 6. Resumen rápido (los 3 a la vez)

```powershell
# Terminal 1 — BACKEND
cd "C:\sistema academico uca v2\sistema-academico\backend"
.\venv\Scripts\Activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — WEB
cd "C:\sistema academico uca v2\sistema-academico\frontend"
npm run dev

# Terminal 3 — MOBILE
cd "C:\sistema academico uca v2\sistema-academico\mobile"
npx expo start
```
