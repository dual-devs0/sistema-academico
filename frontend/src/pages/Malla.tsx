import { useRole } from '../hooks/useRole'
import MallaAdmin from './MallaAdmin'
import MallaAlumno from './MallaAlumno'

export default function Malla() {
  const role = useRole()
  if (role === 'admin') return <MallaAdmin />
  return <MallaAlumno />
}
