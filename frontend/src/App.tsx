import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import GlobalToast from './components/GlobalToast'
import AcademicoLogin from './pages/AcademicoLogin'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import Puntajes from './pages/Puntajes'
import Asistencia from './pages/Asistencia'
import Perfil from './pages/Perfil'
import Usuarios from './pages/Usuarios'
import Calendario from './pages/Calendario'
import Biblioteca from './pages/Biblioteca'
import Programa from './pages/Programa'
import Boleta from './pages/Boleta'
import Reportes from './pages/Reportes'
import MisMaterias from './pages/MisMaterias'
import GestionAsignaciones from './pages/GestionAsignaciones'
import Estadisticas from './pages/Estadisticas'
import AsistenciaScan from './pages/AsistenciaScan'
import Inscripciones from './pages/Inscripciones'
import NotFound from './pages/NotFound'
import Malla from './pages/Malla'
import Expediente from './pages/Expediente'
import Finanzas from './pages/Finanzas'
import MisCuotas from './pages/MisCuotas'
import SolicitudesTramites from './pages/SolicitudesTramites'
import PasantiasAlumno from './pages/PasantiasAlumno'
import GraduacionAdmin from './pages/GraduacionAdmin'
import GraduacionAlumno from './pages/GraduacionAlumno'
import EquivalenciasAlumno from './pages/EquivalenciasAlumno'
import PasantiasAdmin from './pages/PasantiasAdmin'
import EquivalenciasAdmin from './pages/EquivalenciasAdmin'
import BecasAlumno from './pages/BecasAlumno'
import { getCurrentUser, initAuth } from './lib/api'

const rolesPermitidos: Record<string, string[]> = {
  '/usuarios':  ['admin'],
  '/reportes':  ['admin'],
  '/programa':   ['admin', 'profesor', 'alumno'],
  '/puntajes':  ['admin', 'profesor', 'alumno'],
  '/asistencia':['admin', 'profesor', 'alumno'],
  '/dashboard': ['admin', 'profesor', 'alumno'],
  '/perfil':    ['admin', 'profesor', 'alumno'],
  '/calendario':['admin', 'profesor', 'alumno'],
  '/biblioteca':['admin', 'profesor', 'alumno'],
  '/boleta':    ['admin', 'profesor', 'alumno'],
  '/estadisticas':   ['admin', 'profesor'],
  '/inscripciones':      ['admin', 'alumno'],
  '/mis-materias':        ['profesor'],
  '/gestion-asignaciones': ['admin'],
  '/malla':              ['admin', 'alumno'],
  '/expediente':         ['admin', 'alumno'],
  '/finanzas':           ['admin'],
  '/mis-cuotas':         ['alumno'],
  '/tramites':           ['admin', 'alumno'],
  '/mis-pasantias':      ['alumno', 'profesor'],
  '/graduacion-admin':   ['admin'],
  '/pasantias-admin':    ['admin'],
  '/equivalencias-admin':['admin'],
  '/mi-graduacion':      ['alumno'],
  '/mis-equivalencias':  ['alumno'],
  '/asistencia/scan':    ['alumno'],
  '/mis-becas':          ['alumno'],
}

export function RutaProtegida({ path, children }: { path: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>(() =>
    getCurrentUser() ? 'ok' : sessionStorage.getItem('session_active') ? 'loading' : 'denied'
  )
  const [role, setRole] = useState(getCurrentUser()?.role || '')

  useEffect(() => {
    if (status !== 'loading') return
    initAuth().then(user => {
      if (user) {
        setRole(user.role)
        setStatus('ok')
      } else {
        setStatus('denied')
      }
    })
  }, [status])

  const permitidos = rolesPermitidos[path] || []

  if (status === 'loading') return null  // breve flash mientras refresca token
  if (status === 'denied') return <Navigate to="/login" replace />
  if (permitidos.length > 0 && !permitidos.includes(role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <GlobalToast />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AcademicoLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/dashboard" element={<Layout><RutaProtegida path="/dashboard"><Dashboard /></RutaProtegida></Layout>} />
        <Route path="/puntajes" element={<Layout><RutaProtegida path="/puntajes"><Puntajes /></RutaProtegida></Layout>} />
        <Route path="/asistencia" element={<Layout><RutaProtegida path="/asistencia"><Asistencia /></RutaProtegida></Layout>} />
        <Route path="/perfil" element={<Layout><RutaProtegida path="/perfil"><Perfil /></RutaProtegida></Layout>} />
        <Route path="/usuarios" element={<Layout><RutaProtegida path="/usuarios"><Usuarios /></RutaProtegida></Layout>} />
        <Route path="/calendario" element={<Layout><RutaProtegida path="/calendario"><Calendario /></RutaProtegida></Layout>} />
        <Route path="/biblioteca" element={<Layout><RutaProtegida path="/biblioteca"><Biblioteca /></RutaProtegida></Layout>} />
        <Route path="/programa" element={<Layout><RutaProtegida path="/programa"><Programa /></RutaProtegida></Layout>} />
        <Route path="/boleta" element={<Layout><RutaProtegida path="/boleta"><Boleta /></RutaProtegida></Layout>} />
        <Route path="/reportes"   element={<Layout><RutaProtegida path="/reportes"><Reportes /></RutaProtegida></Layout>} />
        <Route path="/estadisticas" element={<Layout><RutaProtegida path="/estadisticas"><Estadisticas /></RutaProtegida></Layout>} />
        <Route path="/inscripciones" element={<Layout><RutaProtegida path="/inscripciones"><Inscripciones /></RutaProtegida></Layout>} />
        <Route path="/mis-materias" element={<Layout><RutaProtegida path="/mis-materias"><MisMaterias /></RutaProtegida></Layout>} />
        <Route path="/miscursos" element={<Navigate to="/mis-materias" replace />} />
        <Route path="/mismaterias" element={<Navigate to="/mis-materias" replace />} />
        <Route path="/gestion-asignaciones" element={<Layout><RutaProtegida path="/gestion-asignaciones"><GestionAsignaciones /></RutaProtegida></Layout>} />
        <Route path="/malla" element={<Layout><RutaProtegida path="/malla"><Malla /></RutaProtegida></Layout>} />
        <Route path="/expediente" element={<Layout><RutaProtegida path="/expediente"><Expediente /></RutaProtegida></Layout>} />
        <Route path="/finanzas" element={<Layout><RutaProtegida path="/finanzas"><Finanzas /></RutaProtegida></Layout>} />
        <Route path="/mis-cuotas" element={<Layout><RutaProtegida path="/mis-cuotas"><MisCuotas /></RutaProtegida></Layout>} />
        <Route path="/tramites" element={<Layout><RutaProtegida path="/tramites"><SolicitudesTramites /></RutaProtegida></Layout>} />
        <Route path="/mis-pasantias" element={<Layout><RutaProtegida path="/mis-pasantias"><PasantiasAlumno /></RutaProtegida></Layout>} />
        <Route path="/graduacion-admin" element={<Layout><RutaProtegida path="/graduacion-admin"><GraduacionAdmin /></RutaProtegida></Layout>} />
        <Route path="/mi-graduacion" element={<Layout><RutaProtegida path="/mi-graduacion"><GraduacionAlumno /></RutaProtegida></Layout>} />
        <Route path="/mis-equivalencias" element={<Layout><RutaProtegida path="/mis-equivalencias"><EquivalenciasAlumno /></RutaProtegida></Layout>} />
        <Route path="/pasantias-admin" element={<Layout><RutaProtegida path="/pasantias-admin"><PasantiasAdmin /></RutaProtegida></Layout>} />
        <Route path="/equivalencias-admin" element={<Layout><RutaProtegida path="/equivalencias-admin"><EquivalenciasAdmin /></RutaProtegida></Layout>} />
        <Route path="/asistencia/scan" element={<Layout><RutaProtegida path="/asistencia/scan"><AsistenciaScan /></RutaProtegida></Layout>} />
        <Route path="/mis-becas" element={<Layout><RutaProtegida path="/mis-becas"><BecasAlumno /></RutaProtegida></Layout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
