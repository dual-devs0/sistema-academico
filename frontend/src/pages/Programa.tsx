import { useState, useRef, useEffect } from 'react'
import { api, decodeToken } from '../lib/api'

type TipoEval = 'parcial' | 'tp' | 'entrega' | null

interface Clase {
  semana: number
  fecha: string
  titulo: string
  descripcion: string
  bibliografia: string
  apunteUrl: string | null
  evaluacion: TipoEval
  completada: boolean
}

interface MateriaTemario {
  materia: string
  profesor: string
  color: string
  bg: string
  clases: Clase[]
}

const evalCfg: Record<NonNullable<TipoEval>, { label: string; color: string; bg: string; border: string }> = {
  parcial:  { label: 'Parcial',   color: '#a855f7', bg: '#a855f715', border: '#a855f730' },
  tp:       { label: 'Trab. Práctico', color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30' },
  entrega:  { label: 'Entrega',   color: '#ef4444', bg: '#ef444415', border: '#ef444430' },
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .tem-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:var(--text-primary); }

  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #2a3040; background:var(--bg-base);
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:var(--text-primary); letter-spacing:-.01em; }
  .rol-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;
  }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }
  .main-grid { display:grid; grid-template-columns:248px 1fr; gap:16px; align-items:start; }

  /* Panel izquierdo */
  .left-panel { display:flex; flex-direction:column; gap:10px; position:sticky; top:76px; }
  .panel-lbl { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin-bottom:4px; }
  .mat-item { border-radius:12px; padding:12px 12px 12px 14px; cursor:pointer; border:1px solid #2a3040; transition:all .15s; background:var(--bg-surface); position:relative; overflow:hidden; margin-bottom:6px; }
  .mat-item:hover { border-color:var(--border-light); }
  .mat-item.active { background:var(--bg); border-color:var(--color); }
  .mat-accent { position:absolute; left:0; top:0; bottom:0; width:3px; }
  .mat-nombre-text { font-size:13px; font-weight:700; color:var(--text-secondary); padding-left:10px; margin-bottom:3px; line-height:1.3; }
  .mat-item.active .mat-nombre-text { color:var(--color); }
  .mat-prof-text { font-size:11px; color:var(--text-muted); padding-left:10px; margin-bottom:8px; }
  .mat-prog-row { display:flex; align-items:center; gap:8px; padding-left:10px; }
  .mat-prog-track { flex:1; height:4px; background:#2a3040; border-radius:2px; overflow:hidden; }
  .mat-prog-fill  { height:100%; border-radius:2px; transition:width .5s ease; }
  .mat-pct { font-size:11px; font-weight:700; }
  .global-card { background:var(--bg-surface); border:1px solid #2a3040; border-radius:12px; padding:14px 16px; }
  .global-title { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin-bottom:12px; }
  .global-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .global-row:last-child { margin-bottom:0; }
  .global-lbl { font-size:12px; color:var(--text-secondary); }
  .global-val { font-size:12px; font-weight:800; }
  .global-bar-track { height:5px; background:#2a3040; border-radius:3px; overflow:hidden; margin-top:12px; }
  .global-bar-fill  { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--accent),#a855f7); transition:width .6s ease; }

  /* Dropdown mobile */
  .mob-drop-wrap { display:none; margin-bottom:14px; position:relative; }
  .mob-drop-btn {
    display:flex; align-items:center; justify-content:space-between;
    width:100%; background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:10px; padding:11px 14px; color:var(--text-primary);
    font-size:13px; font-family:inherit; cursor:pointer; transition:border-color .15s;
  }
  .mob-drop-btn.open { border-color:var(--accent); }
  .mob-drop-btn svg { width:13px; height:13px; color:var(--text-muted); transition:transform .2s; }
  .mob-drop-btn.open svg { transform:rotate(180deg); }
  .mob-drop-menu { position:absolute; top:calc(100% + 5px); left:0; right:0; background:var(--bg-surface); border:1px solid #2a3040; border-radius:10px; overflow:hidden; box-shadow:0 12px 32px rgba(0,0,0,.5); z-index:40; }
  .mob-drop-opt { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; font-size:13px; color:var(--text-secondary); cursor:pointer; border:none; background:none; width:100%; font-family:inherit; transition:background .12s; gap:10px; }
  .mob-drop-opt:hover { background:var(--bg-hover); color:var(--text-primary); }
  .mob-drop-opt.sel { color:var(--accent); background:var(--accent-muted); }
  .mob-drop-opt svg { width:13px; height:13px; color:var(--accent); flex-shrink:0; }
  .mob-color-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

  /* Contenido */
  .content-col { display:flex; flex-direction:column; gap:12px; }
  .header-card { border-radius:14px; padding:18px 20px; border:1px solid; }
  .hc-row1 { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; }
  .hc-nombre { font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:4px; }
  .hc-prof { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--text-secondary); }
  .hc-prof svg { width:12px; height:12px; }
  .hc-pct-block { text-align:right; flex-shrink:0; }
  .hc-pct-num { font-size:30px; font-weight:900; line-height:1; }
  .hc-pct-lbl { font-size:10px; color:var(--text-secondary); margin-top:2px; }
  .hc-bar-track { height:7px; background:#2a304033; border-radius:4px; overflow:hidden; margin-bottom:12px; }
  .hc-bar-fill  { height:100%; border-radius:4px; transition:width .6s ease; }
  .hc-stats { display:flex; gap:16px; flex-wrap:wrap; }
  .hc-stat { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--text-secondary); }
  .hc-stat svg { width:12px; height:12px; }
  .hc-stat strong { font-weight:700; }

  /* Timeline */
  .timeline { display:flex; flex-direction:column; gap:8px; }
  .clase-card { background:var(--bg-surface); border:1px solid #2a3040; border-radius:12px; overflow:hidden; transition:border-color .15s; }
  .clase-card:hover { border-color:var(--border-light); }
  .clase-card.completada { border-color:#22c55e22; }
  .clase-btn { width:100%; display:flex; align-items:center; gap:12px; padding:13px 16px; border:none; background:transparent; cursor:pointer; text-align:left; font-family:inherit; transition:background .12s; }
  .clase-btn:hover { background:var(--bg-hover); }
  .ci { width:32px; height:32px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; border:2px solid; }
  .ci.done    { background:#22c55e18; border-color:#22c55e50; color:#22c55e; }
  .ci.pending { background:#2a3040;   border-color:#2a3a55;   color:var(--text-muted); }
  .ci svg { width:14px; height:14px; }
  .clase-meta { flex:1; min-width:0; }
  .clase-semana { font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:2px; }
  .clase-titulo { font-size:13px; font-weight:700; color:var(--text-primary); }
  .clase-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .eval-chip { display:inline-flex; align-items:center; gap:3px; padding:3px 8px; border-radius:20px; font-size:10px; font-weight:700; border:1px solid; white-space:nowrap; }
  .clase-status { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:10px; font-weight:700; border:1px solid; }
  .status-done    { background:#22c55e15; color:#22c55e; border-color:#22c55e30; }
  .status-pending { background:#f59e0b15; color:#f59e0b; border-color:#f59e0b30; }
  .clase-chev { width:14px; height:14px; color:var(--text-muted); transition:transform .18s; flex-shrink:0; }
  .clase-chev.open { transform:rotate(180deg); }

  /* ── DETALLE EXPANDIDO — ALUMNO ── */
  .clase-detalle {
    border-top:1px solid #2a304033;
    padding:16px 16px 18px 60px;
    display:flex; flex-direction:column; gap:14px;
  }
  .det-section-title {
    font-size:10px; color:var(--text-muted); text-transform:uppercase;
    letter-spacing:.07em; font-weight:700; margin-bottom:6px;
  }
  .det-desc { font-size:13px; color:var(--text-secondary); line-height:1.65; }
  .det-row { display:flex; align-items:center; gap:8px; }
  .det-row svg { width:13px; height:13px; flex-shrink:0; }
  .det-fecha-chip {
    display:inline-flex; align-items:center; gap:6px;
    padding:6px 12px; border-radius:8px;
    background:var(--bg-surface); border:1px solid #2a3040;
    font-size:12px; color:var(--text-primary); font-weight:600;
  }
  .det-fecha-chip svg { width:13px; height:13px; color:var(--accent); }
  .det-bib {
    display:flex; align-items:flex-start; gap:8px;
    padding:10px 13px; background:var(--bg-input); border:1px solid #2a3040;
    border-radius:8px; font-size:12px; color:var(--text-secondary); line-height:1.5;
  }
  .det-bib svg { width:13px; height:13px; color:var(--accent); flex-shrink:0; margin-top:1px; }
  .det-apunte-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 14px; background:var(--accent-muted); border:1px solid var(--accent-hover);
    border-radius:8px; color:var(--accent); font-size:12px; font-weight:600;
    cursor:pointer; font-family:inherit; transition:background .15s;
    text-decoration:none;
  }
  .det-apunte-btn:hover { background:var(--accent-muted); }
  .det-apunte-btn svg { width:13px; height:13px; }
  .det-no-apunte { font-size:12px; color:#2a3a55; font-style:italic; }
  .det-eval-block {
    display:flex; align-items:center; gap:8px;
    padding:10px 13px; border-radius:8px; border:1px solid;
  }
  .det-eval-block svg { width:14px; height:14px; flex-shrink:0; }
  .det-eval-label { font-size:12px; font-weight:700; }
  .det-eval-sub   { font-size:11px; opacity:.8; margin-top:1px; }

  /* ── DETALLE EXPANDIDO — PROFESOR ── */
  .clase-editor {
    border-top:1px solid #2a304033;
    padding:16px 16px 18px;
    display:flex; flex-direction:column; gap:14px;
  }
  .editor-row { display:flex; gap:12px; }
  .editor-row > * { flex:1; }
  .fg { display:flex; flex-direction:column; gap:5px; }
  .fg label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; font-weight:600; }
  .fg input, .fg textarea, .fg select {
    background:var(--bg-input); border:1px solid var(--border-light);
    border-radius:8px; color:var(--text-primary); font-size:13px;
    font-family:inherit; outline:none; padding:9px 12px; width:100%;
    transition:border-color .15s; resize:vertical;
  }
  .fg input:focus, .fg textarea:focus, .fg select:focus { border-color:var(--accent); }
  .fg select { appearance:none; cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; background-color:var(--bg-input); padding-right:30px; }
  .fg select option { background:var(--bg-surface); }
  .editor-actions { display:flex; gap:8px; justify-content:flex-end; align-items:center; }
  .btn-completar {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700;
    font-family:inherit; cursor:pointer; border:1px solid; transition:all .15s;
  }
  .btn-completar.marcar { background:#22c55e15; border-color:#22c55e30; color:#22c55e; }
  .btn-completar.marcar:hover { background:#22c55e25; }
  .btn-completar.desmarcar { background:#f59e0b15; border-color:#f59e0b30; color:#f59e0b; }
  .btn-completar.desmarcar:hover { background:#f59e0b25; }
  .btn-completar svg { width:12px; height:12px; }
  .btn-guardar {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 14px; background:var(--accent); border:none;
    border-radius:8px; color:#000; font-size:12px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s;
  }
  .btn-guardar:hover { opacity:.85; }
  .btn-guardar svg { width:12px; height:12px; }

  /* Toast */
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:200; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Responsive */
  @media(max-width:900px){ .main-grid { grid-template-columns:210px 1fr; } }
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .main-grid { grid-template-columns:1fr; }
    .left-panel { display:none; }
    .mob-drop-wrap { display:block; }
    .clase-detalle { padding:14px 14px 16px; }
    .clase-editor  { padding:14px; }
    .clase-status  { display:none; }
    .hc-pct-num { font-size:24px; }
    .hc-stats { gap:10px; }
    .editor-row { flex-direction:column; gap:10px; }
  }
  @media(min-width:769px){
    .mat-prog-track { height:3px; }
    .global-bar-track { height:3px; }
    .hc-bar-track { height:4px; }
    .hc-pct-num { font-size:24px; }
  }
`

// ── Componente detalle alumno ──
function DetalleAlumno({ c }: { c: Clase }) {
  const ev = c.evaluacion ? evalCfg[c.evaluacion] : null
  return (
    <div className="clase-detalle">

      {/* Fecha */}
      <div>
        <div className="det-section-title">Fecha de clase</div>
        <div className="det-fecha-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          {c.fecha}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <div className="det-section-title">Contenido</div>
        <div className="det-desc">{c.descripcion}</div>
      </div>

      {/* Bibliografía */}
      <div>
        <div className="det-section-title">Bibliografía</div>
        <div className="det-bib">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          {c.bibliografia}
        </div>
      </div>

      {/* Material / Apunte */}
      <div>
        <div className="det-section-title">Material de estudio</div>
        {c.apunteUrl
          ? <a href={c.apunteUrl} className="det-apunte-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Ver apunte en Biblioteca
            </a>
          : <div className="det-no-apunte">Sin apunte disponible por ahora.</div>
        }
      </div>

      {/* Evaluación */}
      {ev && (
        <div>
          <div className="det-section-title">Evaluación esta semana</div>
          <div className="det-eval-block" style={{background:ev.bg, borderColor:ev.border, color:ev.color}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="det-eval-label">⚠ {ev.label}</div>
              <div className="det-eval-sub">Hay una evaluación programada para esta semana.</div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Componente editor profesor ──
function EditorProfesor({
  c,
  onChange, onToggle, onGuardar,
}: {
  c: Clase
  onChange: (campo: keyof Clase, val: string) => void
  onToggle: () => void
  onGuardar: () => void
}) {
  return (
    <div className="clase-editor">
      <div className="fg">
        <label>Fecha de clase</label>
        <input value={c.fecha} onChange={e=>onChange('fecha', e.target.value)} placeholder="Ej: 15 Abr 2026" />
      </div>
      <div className="fg">
        <label>Título del tema</label>
        <input value={c.titulo} onChange={e=>onChange('titulo', e.target.value)} placeholder="Ej: Introducción a límites" />
      </div>
      <div className="fg">
        <label>Descripción / Contenido</label>
        <textarea rows={3} value={c.descripcion} onChange={e=>onChange('descripcion', e.target.value)} placeholder="Describí el contenido de la clase..." />
      </div>
      <div className="editor-row">
        <div className="fg">
          <label>Bibliografía</label>
          <input value={c.bibliografia} onChange={e=>onChange('bibliografia', e.target.value)} placeholder="Libro Cap. X — pp. 00–00" />
        </div>
        <div className="fg">
          <label>Link a apunte (URL)</label>
          <input value={c.apunteUrl ?? ''} onChange={e=>onChange('apunteUrl', e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div className="fg">
        <label>Evaluación esta semana</label>
        <select value={c.evaluacion ?? ''} onChange={e=>onChange('evaluacion', e.target.value)}>
          <option value="">Sin evaluación</option>
          <option value="parcial">Parcial</option>
          <option value="tp">Trabajo Práctico</option>
          <option value="entrega">Entrega</option>
        </select>
      </div>
      <div className="editor-actions">
        <button
          className={`btn-completar ${c.completada?'desmarcar':'marcar'}`}
          onClick={onToggle}
        >
          {c.completada
            ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Marcar pendiente</>
            : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Marcar completada</>
          }
        </button>
        <button className="btn-guardar" onClick={onGuardar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Guardar
        </button>
      </div>
    </div>
  )
}

/* ─── PROFESOR PROGRAMA EDITOR ─────────────────── */
const cssProg = `
  .pp-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:var(--text-primary); min-height:100%; }
  .pp-topbar { display:flex; align-items:center; justify-content:space-between; padding:0 24px; height:56px; border-bottom:1px solid #2a3040; background:var(--bg-base); position:sticky; top:0; z-index:20; }
  .pp-topbar h1 { font-size:17px; font-weight:700; color:var(--text-primary); letter-spacing:-.01em; }
  .pp-content { padding:20px 24px 60px; flex:1; }

  .pp-mat-row { display:flex; gap:12px; align-items:flex-end; margin-bottom:20px; flex-wrap:wrap; }
  .pp-mat-group { display:flex; flex-direction:column; gap:5px; flex:1; min-width:220px; }
  .pp-mat-group label { font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; }
  .pp-sel { background:var(--bg-surface); border:1px solid #2a3040; border-radius:9px; color:var(--text-primary); font-size:13px; font-family:inherit; padding:9px 12px; outline:none; appearance:none; cursor:pointer; transition:border-color .15s; }
  .pp-sel:focus { border-color:var(--accent); }
  .pp-sel option { background:var(--bg-surface); }

  .pp-units { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
  .pp-unit { background:var(--bg-surface); border:1px solid #2a3040; border-radius:12px; padding:16px; position:relative; }
  .pp-unit-head { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .pp-unit-num { width:28px; height:28px; border-radius:8px; background:var(--accent-muted); border:1px solid var(--accent-hover); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:var(--accent); flex-shrink:0; }
  .pp-unit-titulo { flex:1; background:var(--bg-input); border:1px solid var(--border-light); border-radius:8px; color:var(--text-primary); font-size:13px; font-family:inherit; padding:7px 10px; outline:none; transition:border-color .15s; }
  .pp-unit-titulo:focus { border-color:var(--accent); }
  .pp-unit-titulo::placeholder { color:#3a4a5a; }
  .pp-unit-desc { width:100%; background:var(--bg-input); border:1px solid var(--border-light); border-radius:8px; color:var(--text-primary); font-size:12px; font-family:inherit; padding:7px 10px; outline:none; resize:vertical; min-height:60px; transition:border-color .15s; }
  .pp-unit-desc:focus { border-color:var(--accent); }
  .pp-unit-desc::placeholder { color:#3a4a5a; }
  .pp-del-btn { background:none; border:none; cursor:pointer; color:#3a4a5a; padding:4px; border-radius:6px; display:flex; transition:color .12s,background .12s; }
  .pp-del-btn:hover { color:#ef4444; background:#ef444418; }
  .pp-del-btn svg { width:14px; height:14px; }

  .pp-add-btn { display:flex; align-items:center; gap:8px; padding:10px 16px; background:var(--bg-surface); border:1px dashed #2a3040; border-radius:10px; color:var(--text-muted); font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:all .15s; width:100%; justify-content:center; }
  .pp-add-btn:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-muted); }
  .pp-add-btn svg { width:14px; height:14px; }

  .pp-save-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-top:1px solid #2a3040; margin-top:16px; gap:10px; flex-wrap:wrap; }
  .pp-save-info { font-size:12px; color:var(--text-muted); }
  .pp-save-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 20px; background:var(--accent); border:none; border-radius:10px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .15s; }
  .pp-save-btn:hover { opacity:.85; }
  .pp-save-btn:disabled { opacity:.4; cursor:not-allowed; }
  .pp-save-btn svg { width:14px; height:14px; }

  .pp-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 24px; text-align:center; gap:14px; }
  .pp-empty svg { width:52px; height:52px; color:#2a3040; }
  .pp-empty h3 { font-size:16px; font-weight:600; color:var(--text-muted); margin:0; }
  .pp-empty p { font-size:13px; color:#3a4a5a; margin:0; }
  .pp-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:300; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
`

type ProgramaUnit = { titulo: string; descripcion: string; semana: number }

function ProfesorProgramaView() {
  const token = sessionStorage.getItem('token')
  const user  = token ? decodeToken(token) : null
  const uid   = Number(user?.user_id)

  const [materias,   setMaterias]   = useState<{ id: number; nombre: string }[]>([])
  const [selMatId,   setSelMatId]   = useState<number | null>(null)
  const [units,      setUnits]      = useState<ProgramaUnit[]>([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState('')

  function showToast(msg: string, _ok = true) {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    if (!uid) return
    api.get<{ id: number; nombre: string }[]>(`/materias/?profesor_id=${uid}`)
      .then(d => {
        setMaterias(d || [])
        if (d && d.length > 0) loadMateria(d[0].id)
      }).catch(() => {})
  }, [uid])

  function loadMateria(id: number) {
    setSelMatId(id); setLoading(true)
    api.get<{ id: number; semana: number; titulo: string; descripcion: string | null }[]>(`/programas/${id}`)
      .then(items => {
        const sorted = (items || []).sort((a, b) => a.semana - b.semana)
        if (sorted.length > 0) {
          setUnits(sorted.map((x, i) => ({ semana: i + 1, titulo: x.titulo, descripcion: x.descripcion || '' })))
        } else {
          setUnits([{ semana: 1, titulo: '', descripcion: '' }])
        }
        setLoading(false)
      }).catch(() => { setUnits([{ semana: 1, titulo: '', descripcion: '' }]); setLoading(false) })
  }

  function addUnit() {
    setUnits(prev => [...prev, { semana: prev.length + 1, titulo: '', descripcion: '' }])
  }

  function removeUnit(i: number) {
    setUnits(prev => prev.filter((_, idx) => idx !== i).map((u, idx) => ({ ...u, semana: idx + 1 })))
  }

  function updateUnit(i: number, field: 'titulo' | 'descripcion', val: string) {
    setUnits(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u))
  }

  async function guardar() {
    if (!selMatId) return
    const payload = units.filter(u => u.titulo.trim()).map((u, i) => ({
      materia_id: selMatId,
      semana: i + 1,
      titulo: u.titulo.trim(),
      descripcion: u.descripcion.trim() || null,
    }))
    if (!payload.length) { showToast('Agregá al menos una unidad'); return }
    setSaving(true)
    try {
      await api.put(`/programas/materia/${selMatId}/bulk`, payload)
      showToast('Programa guardado correctamente')
    } catch {
      showToast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const selMatNombre = materias.find(m => m.id === selMatId)?.nombre || ''

  return (
    <>
      <style>{cssProg}</style>
      {toast && <div className="pp-toast">{toast}</div>}
      <div className="pp-root">
        <header className="pp-topbar">
          <h1>Programa de clases</h1>
          <div style={{ fontSize:11, background:'#3b82f615', color:'#3b82f6', border:'1px solid #3b82f630', borderRadius:20, padding:'4px 10px', fontWeight:600 }}>
            Modo Profesor
          </div>
        </header>
        <div className="pp-content">

          {/* Materia selector */}
          <div className="pp-mat-row">
            <div className="pp-mat-group">
              <label>Materia</label>
              <select className="pp-sel" value={selMatId ?? ''} onChange={e => loadMateria(Number(e.target.value))}>
                {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>

          {materias.length === 0 && (
            <div className="pp-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <h3>Sin materias asignadas</h3>
              <p>El administrador debe asignarte materias primero</p>
            </div>
          )}

          {selMatId && !loading && (
            <>
              <div className="pp-units">
                {units.map((u, i) => (
                  <div key={i} className="pp-unit">
                    <div className="pp-unit-head">
                      <div className="pp-unit-num">{i + 1}</div>
                      <input
                        className="pp-unit-titulo"
                        placeholder={`Unidad ${i + 1} — Título`}
                        value={u.titulo}
                        onChange={e => updateUnit(i, 'titulo', e.target.value)}
                      />
                      <button className="pp-del-btn" onClick={() => removeUnit(i)} title="Eliminar unidad">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                    <textarea
                      className="pp-unit-desc"
                      placeholder="Descripción del contenido (opcional)"
                      value={u.descripcion}
                      onChange={e => updateUnit(i, 'descripcion', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button className="pp-add-btn" onClick={addUnit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Agregar unidad
              </button>

              <div className="pp-save-bar">
                <span className="pp-save-info">{units.filter(u => u.titulo.trim()).length} unidades · {selMatNombre}</span>
                <button className="pp-save-btn" onClick={guardar} disabled={saving}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {saving ? 'Guardando…' : 'Guardar programa'}
                </button>
              </div>
            </>
          )}

          {selMatId && loading && (
            <div className="pp-empty"><p style={{color:'var(--text-muted)'}}>Cargando programa…</p></div>
          )}
        </div>
      </div>
    </>
  )
}

export default function Programa() {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const ROL = user?.role || 'alumno'

  if (ROL === 'profesor') return <ProfesorProgramaView />

  const [data,       setData]       = useState<MateriaTemario[]>([])
  const [activa,     setActiva]     = useState('')
  const [claseOpen,  setClaseOpen]  = useState<number|null>(null)
  const [dropOpen,   setDropOpen]   = useState(false)
  const [toast,      setToast]      = useState('')
  const [cargando,   setCargando]   = useState(true)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/programas/').catch(() => null),
      api.get<any[]>('/materias/').catch(() => null),
    ]).then(([temariosData, materiasData]) => {
      setCargando(false)
      if (temariosData && temariosData.length > 0 && materiasData) {
        const materiaMap: Record<number, { nombre: string }> = {}
        materiasData.forEach((m: any) => { materiaMap[m.id] = m })

        const grouped: Record<string, MateriaTemario> = {}
        temariosData.forEach((t: any) => {
          const m = materiaMap[t.materia_id]
          const key = m?.nombre || `Materia #${t.materia_id}`
          if (!grouped[key]) {
            grouped[key] = {
              materia: key,
              profesor: m ? `Prof. ${m.nombre}` : '—',
              color: 'var(--accent)',
              bg: 'var(--accent-muted)',
              clases: [],
            }
          }
          grouped[key].clases.push({
            semana: t.semana || 0,
            fecha: t.fecha_referencia?.slice(0, 10) || '—',
            titulo: t.titulo || 'Sin título',
            descripcion: t.descripcion || '',
            bibliografia: t.bibliografia || '',
            apunteUrl: t.apunte_url || null,
            evaluacion: null,
            completada: false,
          })
        })
        const arr = Object.values(grouped)
        setData(arr)
        if (arr.length > 0) setActiva(arr[0].materia)
      }
    }).catch(() => {})
  }, [])

  const temario = data.find(t => t.materia === activa)

  const completadas  = temario ? temario.clases.filter(c=>c.completada).length : 0
  const progreso     = temario ? Math.round((completadas/temario.clases.length)*100) : 0
  const totalClases  = data.reduce((s,t)=>s+t.clases.length,0)
  const totalComp    = data.reduce((s,t)=>s+t.clases.filter(c=>c.completada).length,0)
  const progresoGlob = totalClases > 0 ? Math.round((totalComp/totalClases)*100) : 0

  useEffect(() => {
    function h(e:MouseEvent){ if(dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(''),2000) }
  function cambiarMateria(m:string){ setActiva(m); setClaseOpen(null); setDropOpen(false) }

  function updateClase(semana:number, campo:keyof Clase, val:string) {
    setData(prev=>prev.map(t=>t.materia!==activa?t:{
      ...t, clases:t.clases.map(c=>c.semana!==semana?c:{
        ...c,
        [campo]: campo==='evaluacion' ? (val===''?null:val) :
                 campo==='completada' ? val==='true' :
                 campo==='apunteUrl'  ? (val===''?null:val) : val
      })
    }))
  }

  function toggleCompletada(semana:number) {
    setData(prev=>prev.map(t=>t.materia!==activa?t:{
      ...t, clases:t.clases.map(c=>c.semana!==semana?c:{...c, completada:!c.completada})
    }))
  }

  function guardarClase() {
    showToast('Clase guardada correctamente')
    setClaseOpen(null)
  }

  if (cargando) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)', color:'var(--text-muted)', fontFamily:'Inter,system-ui,sans-serif', flexDirection:'column', gap:12 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ animation:'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="#2a3040" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0110 10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize:13 }}>Cargando programa…</span>
    </div>
  )

  if (!temario) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)', color:'var(--text-muted)', fontFamily:'Inter,system-ui,sans-serif', flexDirection:'column', gap:16, textAlign:'center', padding:24 }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2a3040" strokeWidth="1.5">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
      <div>
        <p style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', margin:'0 0 6px' }}>Sin programa disponible</p>
        <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
          {ROL === 'alumno'
            ? 'Tu profesor todavía no cargó el programa de clases.'
            : 'No hay programas cargados aún. Creá el programa desde la sección Materias.'}
        </p>
      </div>
    </div>
  )

  return (
<>
      <style>{css}</style>
      <div className="tem-root">

        <header className="topbar">
          <h1>Programa de clases</h1>
          <div className="rol-badge" style={
            ROL==='profesor'
              ? {background:'#3b82f615',color:'#3b82f6',border:'1px solid #3b82f630'}
              : {background:'var(--accent-muted)',color:'var(--accent)',border:'1px solid var(--accent-hover)'}
          }>
            {ROL==='profesor'
              ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Modo Profesor</>
              : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg> Vista Alumno</>
            }
          </div>
        </header>

        <div className="content">

          {/* Dropdown mobile */}
          <div className="mob-drop-wrap" ref={dropRef}>
            <button className={`mob-drop-btn${dropOpen?' open':''}`} onClick={()=>setDropOpen(v=>!v)}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="mob-color-dot" style={{background:temario.color}}/>
                <span>{activa}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {dropOpen && (
              <div className="mob-drop-menu">
                {data.map(t=>{
                  const comp=t.clases.filter(c=>c.completada).length
                  const pct=Math.round((comp/t.clases.length)*100)
                  const sel=activa===t.materia
                  return (
                    <button key={t.materia} className={`mob-drop-opt${sel?' sel':''}`} onClick={()=>cambiarMateria(t.materia)}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="mob-color-dot" style={{background:t.color}}/>
                        <div>
                          <div style={{fontWeight:600,color:sel?'var(--accent)':'var(--text-primary)',fontSize:13}}>{t.materia}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{pct}% completado</div>
                        </div>
                      </div>
                      {sel && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="main-grid">

            {/* Panel izquierdo */}
            <div className="left-panel">
              <div>
                <div className="panel-lbl">Materias</div>
                {data.map(t=>{
                  const comp=t.clases.filter(c=>c.completada).length
                  const pct=Math.round((comp/t.clases.length)*100)
                  const sel=activa===t.materia
                  return (
                    <div key={t.materia} className={`mat-item${sel?' active':''}`}
                      style={{'--color':t.color,'--bg':t.bg} as React.CSSProperties}
                      onClick={()=>cambiarMateria(t.materia)}>
                      <div className="mat-accent" style={{background:t.color}}/>
                      <div className="mat-nombre-text">{t.materia}</div>
                      <div className="mat-prof-text">Prof. {t.profesor}</div>
                      <div className="mat-prog-row">
                        <div className="mat-prog-track">
                          <div className="mat-prog-fill" style={{width:`${pct}%`,background:t.color}}/>
                        </div>
                        <span className="mat-pct" style={{color:t.color}}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="global-card">
                <div className="global-title">Resumen general</div>
                <div className="global-row"><span className="global-lbl">Completadas</span><span className="global-val" style={{color:'#22c55e'}}>{totalComp}/{totalClases}</span></div>
                <div className="global-row"><span className="global-lbl">Materias</span><span className="global-val">{data.length}</span></div>
                <div className="global-row"><span className="global-lbl">Progreso</span><span className="global-val" style={{color:'var(--accent)'}}>{progresoGlob}%</span></div>
                <div className="global-bar-track"><div className="global-bar-fill" style={{width:`${progresoGlob}%`}}/></div>
              </div>
            </div>

            {/* Contenido */}
            <div className="content-col">

              {/* Header */}
              <div className="header-card" style={{background:temario.bg, borderColor:`${temario.color}35`}}>
                <div className="hc-row1">
                  <div>
                    <div className="hc-nombre">{temario.materia}</div>
                    <div className="hc-prof">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Prof. {temario.profesor}
                    </div>
                  </div>
                  <div className="hc-pct-block">
                    <div className="hc-pct-num" style={{color:temario.color}}>{progreso}%</div>
                    <div className="hc-pct-lbl">completado</div>
                  </div>
                </div>
                <div className="hc-bar-track"><div className="hc-bar-fill" style={{width:`${progreso}%`,background:temario.color}}/></div>
                <div className="hc-stats">
                  <div className="hc-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <strong style={{color:'#22c55e'}}>{completadas}</strong><span>completadas</span>
                  </div>
                  <div className="hc-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <strong style={{color:'#f59e0b'}}>{temario.clases.length-completadas}</strong><span>pendientes</span>
                  </div>
                  <div className="hc-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    <strong>{temario.clases.length}</strong><span>clases totales</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="timeline">
                {temario.clases.map(c => {
                  const isOpen = claseOpen===c.semana
                  const ev = c.evaluacion ? evalCfg[c.evaluacion] : null
                  return (
                    <div key={c.semana} className={`clase-card${c.completada?' completada':''}`}>
                      <button className="clase-btn" onClick={()=>setClaseOpen(isOpen?null:c.semana)}>
                        <div className={`ci ${c.completada?'done':'pending'}`}>
                          {c.completada
                            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            : <span>{c.semana}</span>
                          }
                        </div>
                        <div className="clase-meta">
                          <div className="clase-semana">Semana {c.semana} · {c.fecha}</div>
                          <div className="clase-titulo">{c.titulo}</div>
                        </div>
                        <div className="clase-right">
                          {ev && (
                            <span className="eval-chip" style={{color:ev.color,background:ev.bg,borderColor:ev.border}}>
                              ⚠ {ev.label}
                            </span>
                          )}
                          <span className={`clase-status ${c.completada?'status-done':'status-pending'}`}>
                            {c.completada?'✓ Completada':'● Pendiente'}
                          </span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`clase-chev${isOpen?' open':''}`}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </button>

                      {/* Expandido según rol */}
                      {isOpen && (
                        ROL==='alumno'
                          ? <DetalleAlumno c={c}/>
                          : <EditorProfesor
                              c={c}
                              onChange={(campo,val)=>updateClase(c.semana,campo,val)}
                              onToggle={()=>toggleCompletada(c.semana)}
                              onGuardar={()=>guardarClase()}
                            />
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>

        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </>
  )
}
