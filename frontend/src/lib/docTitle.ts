export function setDocTitle(rol: string, nombre: string = '') {
  const rolLabel: Record<string, string> = {
    admin: 'Administración',
    profesor: 'Profesor',
    alumno: 'Alumno',
  }
  const label = rolLabel[rol] ?? rol
  document.title = `Universidad Católica Caacupé — ${label}${nombre ? ` · ${nombre}` : ''}`
}
