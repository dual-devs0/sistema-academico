# Comandos Git del día a día

## INICIO DEL DÍA (siempre)

```bash
git checkout develop
git pull origin develop
```

---

## EMPEZAR TAREA NUEVA

```bash
git checkout -b feature/nombre-de-la-tarea
```

Ejemplos de nombres:
- `feature/carga-asistencia`
- `feature/vista-puntajes`
- `feature/calendario-academico`
- `fix/error-calculo-promedio`

---

## GUARDAR TRABAJO (varias veces al día)

```bash
git add .
git commit -m "feat: descripción de lo que hiciste"
git push origin feature/nombre-de-la-tarea
```

---

## SUBIR PARA REVISIÓN (Pull Request)

```bash
git push origin feature/nombre-de-la-tarea
# Luego ir a GitHub → aparece botón "Compare & pull request"
# Base: develop  ←  tu rama
# Asignar al otro como Reviewer
```

---

## ACTUALIZAR TU RAMA con cambios nuevos de develop

(hacer esto si el otro dev mergeó cosas mientras vos trabajabas)

```bash
git checkout develop
git pull origin develop
git checkout feature/tu-rama
git merge develop
git push origin feature/tu-rama
```

---

## DESPUÉS DE QUE TU PR FUE MERGEADO

```bash
git checkout develop
git pull origin develop
git branch -d feature/tu-rama     # borra la rama local (ya no la necesitás)
```

---

## VER ESTADO ACTUAL

```bash
git status              # qué archivos cambiaste
git log --oneline -10   # últimos 10 commits
git branch              # en qué rama estás
```

---

## SI METISTE LA PATA (antes de hacer push)

```bash
# Deshacer el último commit (mantiene los cambios en archivos)
git reset --soft HEAD~1

# Descartar TODOS los cambios (cuidado, esto es irreversible)
git restore .
```

---

## REGLAS QUE NUNCA SE ROMPEN

- NUNCA: `git push origin main` directamente
- NUNCA: `git push origin develop` directamente
- SIEMPRE: Pull Request para mergear a develop
- SIEMPRE: El otro aprueba antes de mergear
