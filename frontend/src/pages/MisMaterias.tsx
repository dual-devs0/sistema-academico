import { useState, useEffect } from 'react'
import { api, decodeToken, emitToast } from '../lib/api'

interface MateriaApi { id: number; nombre: string; carrera_id: number | null; carrera_nombre: string | null }
interface Subject {
  id: number
  code: string
  name: string
  students: number
  attendance: number
}
interface Career {
  name: string
  icon: string
  subjects: Subject[]
}

function SubjectCard({ subject }: { subject: Subject }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card"
      style={{
        padding: 24, display: "flex", flexDirection: "column",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 10px 30px -10px var(--accent-muted)" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        border: hovered ? "1px solid var(--accent-muted)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p className="mono-label" style={{ color: "var(--accent-bright)", marginBottom: 4, fontSize: 11 }}>
            {subject.code}
          </p>
          <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {subject.name}
          </h4>
        </div>
        <i className="ti ti-dots-vertical" style={{
          color: hovered ? "var(--accent-bright)" : "var(--text-muted)",
          fontSize: 20, cursor: "pointer", transition: "color 0.2s"
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: 24 }}>
        {[
          { label: "Alumnos", value: subject.students.toString() },
          { label: "Asistencia", value: `${subject.attendance}%`, border: true },
        ].map((stat) => (
          <div key={stat.label} style={{
            textAlign: "center",
            borderLeft: stat.border ? "1px solid var(--border-subtle)" : "none",
            padding: "0 4px"
          }}>
            <p className="mono-label" style={{ marginBottom: 4 }}>{stat.label}</p>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, color: "var(--accent-bright)"
            }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: 13 }}
          onClick={() => emitToast(`${subject.students} alumno(s) en ${subject.name}`, 'success')}>
          <i className="ti ti-users" /> Ver Alumnos
        </button>
        <button className="btn-ghost" style={{ padding: "8px 12px" }}
          onClick={() => window.location.assign('/puntajes')}>
          <i className="ti ti-pencil" style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  )
}

export default function MisMaterias() {
  const [fabHovered, setFabHovered] = useState(false)
  const [careers, setCareers] = useState<Career[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = Number(decodeToken(sessionStorage.getItem('token') || '')?.user_id || 0)
    if (!uid) { setLoading(false); return }

    api.get<MateriaApi[]>(`/materias/?profesor_id=${uid}`).then(async materias => {
      const bySubject = await Promise.all(materias.map(async m => {
        const alumnos = await api.get<any[]>(`/asistencias/materia/${m.id}/alumnos`).catch(() => [] as any[])
        const attendance = alumnos.length
          ? Math.round(alumnos.reduce((s, a) => s + (a.porcentaje ?? 0), 0) / alumnos.length)
          : 0
        return {
          id: m.id,
          code: `MAT-${String(m.id).padStart(3, '0')}`,
          name: m.nombre,
          students: alumnos.length,
          attendance,
          carrera: m.carrera_nombre || 'General',
        }
      }))

      const grouped = new Map<string, Subject[]>()
      for (const s of bySubject) {
        const list = grouped.get(s.carrera) || []
        list.push({ id: s.id, code: s.code, name: s.name, students: s.students, attendance: s.attendance })
        grouped.set(s.carrera, list)
      }
      setCareers([...grouped.entries()].map(([name, subjects]) => ({ name, icon: 'ti-terminal-2', subjects })))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 className="page-title" style={{ fontSize: 32 }}>Mis Materias</h1>
        <p className="page-subtitle">
          Gestión centralizada de cátedras y rendimiento académico por carrera asignada.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando materias…</div>
      ) : careers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-books-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>El administrador aún no te asignó materias.</p>
        </div>
      ) : careers.map((career) => (
        <div key={career.name} style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              padding: 8, borderRadius: 8,
              background: "var(--accent-muted)", border: "1px solid var(--accent-muted)"
            }}>
              <i className={`ti ${career.icon}`} style={{ color: "var(--accent-bright)", fontSize: 20, display: "block" }} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
              {career.name}
            </h3>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)", marginLeft: 12 }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20
          }}>
            {career.subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </div>
      ))}

      <button
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        onClick={() => emitToast('Contactá al administrador para solicitar una nueva materia', 'warning')}
        className="fab"
        style={{
          transform: fabHovered ? "scale(1.1)" : "scale(1)",
          transition: "all 0.2s",
        }}
      >
        <i className="ti ti-plus" style={{
          fontSize: 28,
          transform: fabHovered ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }} />
      </button>
    </div>
  )
}
