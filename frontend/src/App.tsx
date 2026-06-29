import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import GlobalToast from './components/GlobalToast'
import AcademicoLogin from './pages/AcademicoLogin'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import Puntajes from './pages/Puntajes'
import Asistencia from './pages/Asistencia'
import Perfil from './pages/Perfil'
import Usuarios from './pages/Usuarios'
import Materias from './pages/Materias'
import Calendario from './pages/Calendario'
import Biblioteca from './pages/Biblioteca'
import Programa from './pages/Programa'
import Boleta from './pages/Boleta' 
import Reportes from './pages/Reportes'
import MisCursos from './pages/MisCursos'
import Estadisticas from './pages/Estadisticas'
import AsistenciaScan from './pages/AsistenciaScan'
import Inscripciones from './pages/Inscripciones'
import { decodeToken } from './lib/api'

const rolesPermitidos: Record<string, string[]> = {
  '/usuarios':  ['admin'],
  '/reportes':  ['admin'],
  '/materias':  ['admin', 'profesor'],
  '/programa':   ['admin', 'profesor', 'alumno'],
  '/puntajes':  ['admin', 'profesor', 'alumno'],
  '/asistencia':['admin', 'profesor', 'alumno'],
  '/dashboard': ['admin', 'profesor', 'alumno'],
  '/perfil':    ['admin', 'profesor', 'alumno'],
  '/calendario':['admin', 'profesor', 'alumno'],
  '/biblioteca':['admin', 'profesor', 'alumno'],
  '/boleta':    ['admin', 'profesor', 'alumno'],
  '/miscursos':      ['profesor'],
  '/estadisticas':   ['admin', 'profesor'],
  '/inscripciones':  ['admin'],
}

function RutaProtegida({ path, children }: { path: string; children: React.ReactNode }) {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const role = user?.role || ''
  const permitidos = rolesPermitidos[path] || []

  if (!token) return <Navigate to="/login" replace />
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
        <Route path="/materias" element={<Layout><RutaProtegida path="/materias"><Materias /></RutaProtegida></Layout>} />
        <Route path="/calendario" element={<Layout><RutaProtegida path="/calendario"><Calendario /></RutaProtegida></Layout>} />
        <Route path="/biblioteca" element={<Layout><RutaProtegida path="/biblioteca"><Biblioteca /></RutaProtegida></Layout>} />
        <Route path="/programa" element={<Layout><RutaProtegida path="/programa"><Programa /></RutaProtegida></Layout>} />
        <Route path="/boleta" element={<Layout><RutaProtegida path="/boleta"><Boleta /></RutaProtegida></Layout>} />
        <Route path="/reportes"   element={<Layout><RutaProtegida path="/reportes"><Reportes /></RutaProtegida></Layout>} />
        <Route path="/miscursos"    element={<Layout><RutaProtegida path="/miscursos"><MisCursos /></RutaProtegida></Layout>} />
        <Route path="/estadisticas" element={<Layout><RutaProtegida path="/estadisticas"><Estadisticas /></RutaProtegida></Layout>} />
        <Route path="/inscripciones" element={<Layout