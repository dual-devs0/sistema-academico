# Requerimientos y Guía de Ejecución

Esta guía contiene todo lo necesario para ejecutar el **Sistema Académico UCA** de forma local sin problemas, tanto para el backend como para el frontend.

## 1. Requisitos Previos

Asegúrate de tener instalados los siguientes programas en tu equipo antes de comenzar:

- **Python 3.11 o superior:** [Descargar aquí](https://www.python.org/downloads/)
- **Node.js 20 o superior:** [Descargar aquí](https://nodejs.org/) (Incluye `npm`)
- **Git:** [Descargar aquí](https://git-scm.com/downloads)
- *(Opcional)* **Docker Desktop:** Si planeas correr PostgreSQL en lugar de SQLite.

---

## 2. Clonar el repositorio

Abre tu terminal y clona el proyecto:

```bash
git clone https://github.com/TU_USUARIO/sistema-academico.git
cd sistema-academico
```

---

## 3. Configuración del Backend (Python + FastAPI)

El backend maneja la lógica de negocio, bases de datos y la API REST.

### 3.1. Crear entorno virtual
Abre una terminal en la carpeta `backend/` y ejecuta:

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 3.2. Instalar dependencias
Con el entorno activado, instala los paquetes requeridos:
```bash
pip install -r requeriments.txt
```

### 3.3. Variables de Entorno
Copia el archivo de ejemplo para crear tu propio archivo `.env`:
```bash
copy .env.example .env    # Windows
cp .env.example .env      # macOS/Linux
```
**Importante:** Edita `.env` y configura tus credenciales de `fastapi-mail` si vas a probar el envío de correos, o déjalo con los valores por defecto (en cuyo caso se simulará el envío imprimiéndolo en consola).

### 3.4. Inicializar la Base de Datos
Aplica las migraciones y carga los datos de prueba (seed completo de las fases beta):
```bash
alembic upgrade head
python seed_completo.py
```

### 3.5. Levantar el servidor
Ejecuta el servidor de desarrollo en el puerto 8000:
```bash
uvicorn app.main:app --reload
```
La API estará disponible en: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 4. Configuración del Frontend (React + Vite)

El frontend es la interfaz gráfica donde interactúan los profesores, alumnos y administradores.

### 4.1. Instalar dependencias
Abre una **nueva pestaña** de la terminal, ve a la carpeta `frontend/` y ejecuta:

```bash
cd frontend
npm install
```

### 4.2. Levantar el cliente
Inicia el entorno de desarrollo de Vite:

```bash
npm run dev
```
El sistema estará disponible en: [http://localhost:5173](http://localhost:5173)

---

## 5. Credenciales de Prueba

Al correr `seed_completo.py` se generan usuarios para probar todos los roles.

| Rol | Usuario (Login / Email) | Contraseña |
|-----|-------------------------|------------|
| **Admin** | `admin@uca.edu.py` | `Admin1234!` |
| **Profesor** | `prof@uca.edu.py` | `Profesor1234!` |
| **Alumno** | `12345678` | `Alumno1234!` |

---

## 6. Fases Beta Integradas

Las siguientes funcionalidades ya están implementadas y listas para usar:
1. **Base de Datos y Seeder:** Datos generados (`seed_completo.py`) incluyendo notas, eventos, asistencia y bibliotecas.
2. **Frontend Mejoras:** Sistema de notificaciones Global (Toast), manejo de expiración de sesión y restablecimiento rápido de contraseñas.
3. **Exportación y Búsqueda:** Exportación a CSV y PDF en Puntajes y Usuarios, junto con búsqueda en tiempo real.
4. **Asistencia por QR:** Modal de generación en perfil de Profesor (`/asistencias/qr/...`) y vista de escaneo (`/asistencia/scan?token=...`) para el alumno.
5. **Notificaciones Email:** Integración con `fastapi-mail` mediante `BackgroundTasks` al resetear contraseña o asignar puntajes. Configurable desde `.env`.

¡Éxitos con la ejecución! 🚀
