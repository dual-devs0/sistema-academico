import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Puntajes from './pages/Puntajes'
import Asistencia from './pages/Asistencia'
import Perfil from './pages/Perfil'
import Usuarios from './pages/Usuarios'
import Materias from './pages/Materias'

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
      </Routes>
    </BrowserRouter>
  )
}

export default App
