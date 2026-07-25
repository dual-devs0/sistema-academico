// Wrapper/rutas de malla curricular — ver MallaAlumno.tsx / MallaAdmin.tsx para la vista real por rol.
import { useRole } from '../hooks/useRole'
import MallaAdmin from './MallaAdmin'
import MallaAlumno from './MallaAlumno'

export default function Malla() {
  const role = useRole()
  if (role === 'admin') return <MallaAdmin />
  return <MallaAlumno />
}
