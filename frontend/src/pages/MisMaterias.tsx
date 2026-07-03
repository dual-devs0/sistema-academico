import { useState } from 'react'

interface Subject {
  code: string
  name: string
  students: number
  attendance: number
  program: number
  sparkPath: string
}

interface Career {
  name: string
  icon: string
  subjects: Subject[]
}

const careers: Career[] = [
  {
    name: "Ingeniería Informática",
    icon: "ti-terminal-2",
    subjects: [
      {
        code: "INF-402",
        name: "Arquitectura de Sistemas",
        students: 42,
        attendance: 88,
        program: 65,
        sparkPath: "M0,35 Q10,15 20,25 T40,10 T60,30 T80,5 T100,20",
      },
      {
        code: "INF-510",
        name: "Inteligencia Artificial I",
        students: 28,
        attendance: 94,
        program: 40,
        sparkPath: "M0,20 Q15,5 30,15 T60,5 T80,15 T100,2",
      },
    ],
  },
  {
    name: "Lic. en Administración",
    icon: "ti-building-bank",
    subjects: [
      {
        code: "ADM-202",
        name: "Sistemas de Información",
        students: 56,
        attendance: 76,
        program: 92,
        sparkPath: "M0,10 Q20,30 40,5 T60,25 T100,5",
      },
    ],
  },
]

function Sparkline({ path }: { path: string }) {
  return (
    <div style={{
      height: 64, width: "100%",
      background: "var(--accent-muted)", borderRadius: 8,
      marginBottom: 20, position: "relative", overflow: "hidden",
      WebkitMaskImage: "linear-gradient(to top, transparent, black)",
      maskImage: "linear-gradient(to top, transparent, black)"
    }}>
      <svg viewBox="0 0 100 40" style={{ width: "100%", height: "100%" }}>
        <path d={path} fill="none" stroke="var(--accent-bright)" strokeWidth="2" />
      </svg>
    </div>
  )
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 24 }}>
        {[
          { label: "Alumnos", value: subject.students.toString() },
          { label: "Asistencia", value: `${subject.attendance}%`, border: true },
          { label: "Programa", value: `${subject.program}%` },
        ].map((stat) => (
          <div key={stat.label} style={{
            textAlign: "center",
            borderLeft: stat.border ? "1px solid var(--border-subtle)" : "none",
            borderRight: stat.border ? "1px solid var(--border-subtle)" : "none",
            padding: "0 4px"
          }}>
            <p className="mono-label" style={{ marginBottom: 4 }}>{stat.label}</p>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, color: "var(--accent-bright)"
            }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Sparkline path={subject.sparkPath} />

      <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: 13 }}>
          <i className="ti ti-users" /> Ver Alumnos
        </button>
        <button className="btn-ghost" style={{ padding: "8px 12px" }}>
          <i className="ti ti-pencil" style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  )
}

export default function MisMaterias() {
  const [fabHovered, setFabHovered] = useState(false)

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 className="page-title" style={{ fontSize: 32 }}>Mis Materias</h1>
        <p className="page-subtitle">
          Gestión centralizada de cátedras y rendimiento académico por carrera asignada.
        </p>
      </div>

      {careers.map((career) => (
        <div key={career.name} style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              padding: 8, borderRadius: 8,
              background: "var(--accent-muted)", border: "1px solid var(--accent-muted)"
            }}>
              <i className={career.icon} style={{ color: "var(--accent-bright)", fontSize: 20, display: "block" }} />
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
              <SubjectCard key={subject.code} subject={subject} />
            ))}
          </div>
        </div>
      ))}

      <button
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
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
