const roleStyles: Record<string, { bg: string; color: string; label: string }> = {
  alumno:   { bg: 'rgba(0,180,216,0.12)',  color: '#00b4d8', label: 'Alumno' },
  profesor: { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', label: 'Profesor' },
  admin:    { bg: 'rgba(37,99,235,0.12)',  color: '#60a5fa', label: 'Admin' },
}

export default function RoleBadge({ role }: { role: string }) {
  const s = roleStyles[role === 'administrador' ? 'admin' : role] ?? roleStyles.alumno
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
