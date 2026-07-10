import { useRole } from '../hooks/useRole'
import ExpedienteAdmin from './ExpedienteAdmin'
import ExpedienteAlumno from './ExpedienteAlumno'

export default function Expediente() {
  const role = useRole()
  if (role === 'admin') return <ExpedienteAdmin />
  return <ExpedienteAlumno />
}
