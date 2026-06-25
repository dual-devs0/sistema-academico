# Guía de contribución y flujo Git

## Reglas de oro

1. **Nunca** hacer commit directo a `main` ni a `develop`.
2. Todo cambio entra por una rama `feature/` y un Pull Request.
3. El otro dev revisa y aprueba el PR antes de mergear.
4. Siempre sincronizar `develop` antes de crear una nueva rama.

---

## Flujo completo paso a paso

### Al inicio del día

```bash
git checkout develop
git pull origin develop
```

### Crear una nueva rama para tu tarea

```bash
git checkout -b feature/nombre-del-modulo
# Ejemplos:
# git checkout -b feature/carga-asistencia
# git checkout -b feature/vista-puntajes-alumno
# git checkout -b fix/calculo-promedio
```

### Trabajar y commitear

```bash
git add .
git commit -m "feat: descripción clara del cambio"

# Si trabajaste mucho, hacer commits intermedios:
git commit -m "feat: agregar ruta POST /asistencia"
git commit -m "feat: validar que el alumno pertenece a la materia"
git commit -m "test: tests de la ruta asistencia"
```

### Subir tu rama al repositorio compartido

```bash
git push origin feature/nombre-del-modulo
```

### Abrir Pull Request en GitHub

1. Ir a github.com → tu repo → aparece el botón "Compare & pull request"
2. Base: **develop** ← Compare: **feature/tu-rama**
3. Título claro: `feat: módulo de carga de asistencia`
4. Descripción: qué hiciste, qué probaste, capturas si aplica
5. Asignar al otro dev como Reviewer

### El otro dev revisa

- Lee el código en GitHub
- Puede comentar línea por línea
- Aprueba o pide cambios
- Una vez aprobado: **Merge pull request** → **Squash and merge**

### Después del merge: limpiar

```bash
git checkout develop
git pull origin develop
git branch -d feature/nombre-del-modulo   # borra la rama local
```

---

## Convención de nombres de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
chore:    configuración, dependencias, CI
docs:     cambios en documentación
refactor: reorganización sin cambiar comportamiento
test:     agregar o corregir tests
style:    formato, espacios (sin cambio de lógica)
```

**Ejemplos buenos:**
```
feat: carga masiva de asistencia por materia y fecha
fix: corregir cálculo de promedio cuando falta parcial2
chore: agregar Resend para notificaciones email
docs: actualizar README con pasos de instalación
```

**Ejemplos malos:**
```
cambios
arreglé cosas
wip
asdf
```

---

## Convención de nombres de ramas

```
feature/nombre-descriptivo     → nueva funcionalidad
fix/descripcion-del-bug        → corrección
chore/tarea-de-configuracion   → setup, dependencias
hotfix/problema-critico        → fix urgente en producción
```

---

## Resolución de conflictos

Si al hacer `git pull` o `git merge develop` aparecen conflictos:

```bash
# 1. Ver qué archivos tienen conflictos
git status

# 2. Abrir cada archivo — buscar marcadores:
# <<<<<<< HEAD        ← tu código
# =======
# >>>>>>> develop     ← código del otro dev

# 3. Editar el archivo y dejar la versión correcta
# 4. Marcar como resuelto
git add archivo-con-conflicto.ts
git commit -m "fix: resolver conflicto en routes/asistencia"
```

Si el conflicto es complejo, hablarlo con el otro dev antes de resolver.

---

## Sincronizar tu rama con los cambios nuevos de develop

Si tardás varios días en tu rama y el otro dev mergeó cosas:

```bash
git checkout develop
git pull origin develop
git checkout feature/tu-rama
git merge develop
# resolver conflictos si los hay
git push origin feature/tu-rama
```

---

## Protección de ramas (configurar en GitHub)

En Settings → Branches → Add rule:

- Branch name: `main` y `develop`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale pull request approvals when new commits are pushed
