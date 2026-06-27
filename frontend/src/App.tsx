import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Puntajes from './pages/Puntajes'
import Asistencia from './pages/Asistencia'
import Perfil from './pages/Perfil'
import Usuarios from './pages/Usuarios'
import Materias from './pages/Materias'
import Calendario from './pages/Calendario'
import Biblioteca from './pages/Biblioteca'
import Temario from './pages/Temario'
import Boleta from './pages/Boleta' 
import Reportes from './pages/Reportes'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/puntajes" element={<Layout><Puntajes /></Layout>} />
        <Route path="/asistencia" element={<Layout><Asistencia /></Layout>} />
        <Route path="/perfil" element={<Layout><Perfil /></Layout>} />
        <Route path="/usuarios" element={<Layout><Usuarios /></Layout>} />
        <Route path="/materias" element={<Layout><Materias /></Layout>} />
        <Route path="/calendario" element={<Layout><Calendario /></Layout>} />
        <Route path="/biblioteca" element={<Layout><Biblioteca /></Layout>} />
        <Route path="/temario" element={<Layout><Temario /></Layout>} />
        <Route path="/boleta" element={<Layout><Boleta /></Layout>} />
        <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
