#!/usr/bin/env node
// Chequeo automatizado de overflow horizontal en viewport mobile (375x812)
// para todas las rutas de los 3 roles (alumno, profesor, admin).
//
// Reemplaza la auditoria manual que se hizo a mano navegando cada rol/ruta
// una por una. Usa credenciales del seed local (backend/scripts/seed_usuarios.py).
//
// Uso:
//   npm run check:responsive
//   BASE_URL=http://localhost:5173 npm run check:responsive
//
// Requiere que el frontend (Vite) y el backend (FastAPI) ya esten corriendo.

import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const VIEWPORT = { width: 375, height: 812 }

const CREDENTIALS = {
  alumno:   { username: '12345678',        password: 'Alumno1234!' },
  profesor: { username: 'prof@uca.edu.py', password: 'Profesor1234!' },
  admin:    { username: 'admin@uca.edu.py', password: 'Admin1234!' },
}

// Mismas rutas que consume cada rol en Layout.tsx (menuAlumno/menuProfesor/menuAdmin).
const ROUTES = {
  alumno: [
    '/dashboard', '/calendario', '/asistencia/scan', '/programa', '/boleta',
    '/inscripciones', '/malla', '/expediente', '/mi-graduacion',
    '/mis-equivalencias', '/biblioteca', '/mis-becas', '/mis-pasantias',
    '/mis-cuotas', '/tramites',
  ],
  profesor: [
    '/dashboard', '/calendario', '/asistencia', '/mis-materias', '/puntajes',
    '/estadisticas', '/biblioteca',
  ],
  admin: [
    '/dashboard', '/calendario', '/usuarios', '/gestion-asignaciones',
    '/puntajes', '/inscripciones', '/malla', '/expediente',
    '/graduacion-admin', '/equivalencias-admin', '/pasantias-admin',
    '/reportes', '/estadisticas', '/finanzas', '/tramites', '/ajustes-globales',
  ],
}

async function login(page, role) {
  const creds = CREDENTIALS[role]
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

  if (role === 'admin') {
    await page.click('button:has-text("Acceso administradores")')
    await page.waitForTimeout(300)
  } else if (role === 'profesor') {
    await page.click('button:has-text("Profesor")')
  }

  const inputs = await page.$$('input')
  await inputs[0].fill(creds.username)
  await inputs[1].fill(creds.password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(
    () => window.location.pathname !== '/login',
    { timeout: 8000 },
  )
}

async function gotoRoute(page, path) {
  // Navegacion cliente (pushState + popstate) en vez de page.goto: evita
  // perder la sesion (el access token vive en memoria, no sobrevive un
  // reload completo con el flujo de auth actual).
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(900)
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const docSW = document.documentElement.scrollWidth
    const pageOverflow = docSW > docW + 3
    let offenders = []
    if (pageOverflow) {
      offenders = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          if (r.right <= docW + 3 && r.width <= docW + 3) return false
          const p = el.parentElement
          const wrapped = p && ['auto', 'scroll'].includes(getComputedStyle(p).overflowX)
          return !wrapped
        })
        .slice(0, 5)
        .map((el) => ({
          tag: el.tagName,
          cls: (el.className + '').slice(0, 50),
          right: Math.round(el.getBoundingClientRect().right),
        }))
    }
    return { docW, docSW, pageOverflow, offenders }
  })
}

async function run() {
  const browser = await chromium.launch()
  const failures = []
  let checked = 0

  for (const role of Object.keys(ROUTES)) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const page = await context.newPage()

    try {
      await login(page, role)
    } catch (err) {
      console.error(`[${role}] login fallo: ${err.message}`)
      failures.push({ role, path: '(login)', error: err.message })
      await context.close()
      continue
    }

    for (const path of ROUTES[role]) {
      checked++
      try {
        await gotoRoute(page, path)
        const result = await checkOverflow(page)
        const label = `[${role}] ${path}`
        if (result.pageOverflow) {
          console.error(`FAIL ${label} — overflow: docW=${result.docW} scrollW=${result.docSW}`)
          console.error(`  offenders: ${JSON.stringify(result.offenders)}`)
          failures.push({ role, path, ...result })
        } else {
          console.log(`ok   ${label}`)
        }
      } catch (err) {
        console.error(`ERROR [${role}] ${path}: ${err.message}`)
        failures.push({ role, path, error: err.message })
      }
    }

    await context.close()
  }

  await browser.close()

  console.log(`\n${checked} rutas revisadas, ${failures.length} con problemas.`)
  if (failures.length > 0) {
    process.exitCode = 1
  }
}

run()
