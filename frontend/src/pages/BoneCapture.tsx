import { Skeleton } from 'boneyard-js/react'

const cards = (
  <>
    <div className="kpi-card"><div className="kpi-top"><span className="mono-label">Label</span></div><div className="kpi-value" style={{fontSize:24}}>99</div></div>
    <div className="kpi-card"><div className="kpi-top"><span className="mono-label">Label</span></div><div className="kpi-value" style={{fontSize:24}}>99</div></div>
    <div className="kpi-card"><div className="kpi-top"><span className="mono-label">Label</span></div><div className="kpi-value" style={{fontSize:24}}>99</div></div>
    <div className="kpi-card"><div className="kpi-top"><span className="mono-label">Label</span></div><div className="kpi-value" style={{fontSize:24}}>99</div></div>
  </>
)

const formRow = <div><label className="mono-label">Label</label><div className="input-uca" style={{height:38,borderRadius:10,border:'1px solid var(--border-subtle)',marginBottom:12}} /></div>

const table = (
  <table className="eqa-table"><thead><tr><th>Col A</th><th>Col B</th><th>Col C</th></tr></thead><tbody><tr><td>Item</td><td>Item</td><td>Item</td></tr><tr><td>Item</td><td>Item</td><td>Item</td></tr><tr><td>Item</td><td>Item</td><td>Item</td></tr></tbody></table>
)

const tabsContent = (
  <div style={{display:'flex',gap:4,marginBottom:16}}>
    {['Pendientes','Resueltas','Todas'].map(t => <div key={t} style={{padding:'8px 18px',borderRadius:10,border:'1px solid var(--border-subtle)',fontSize:13,fontWeight:700}}>{t}</div>)}
  </div>
)

export default function BoneCapture() {
  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:24,display:'flex',flexDirection:'column',gap:48}}>
      <section>
        <h2 style={{marginBottom:16}}>Batch 1</h2>
        <div style={{display:'flex',flexDirection:'column',gap:40}}>
          <Skeleton name="boleta" loading={false}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>{cards}</div>
            <div className="card" style={{padding:20,marginTop:16}}>
              <div className="mono-label" style={{marginBottom:8}}>Periodo</div>
              <div className="mono-label" style={{marginBottom:8}}>Monto</div>
              <div className="mono-label">Estado</div>
            </div>
          </Skeleton>
          <Skeleton name="inscripciones" loading={false}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:20}}>{cards}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[1,2,3].map(i => (
                <div key={i} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px'}}>
                  <div><div style={{fontWeight:700,fontSize:14}}>Materia {i}</div><div className="mono-label" style={{fontSize:10}}>Codigo</div></div>
                  <span className="badge" style={{padding:'5px 14px',fontSize:11.5,fontWeight:700}}>Estado</span>
                </div>
              ))}
            </div>
          </Skeleton>
          <Skeleton name="malla-alumno" loading={false}>
            <div className="page-title" style={{marginBottom:8}}>Mi Malla Academica</div>
            <div className="progress-track" style={{marginTop:8}}><div className="progress-fill" style={{width:'60%'}} /></div>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:16}}>
              {['Semestre 1','Semestre 2','Semestre 3'].map(s => (
                <div key={s} className="card" style={{padding:14}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{s}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[1,2,3,4].map(m => <div key={m} className="badge" style={{padding:'6px 12px'}}>Materia {m}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </Skeleton>
          <Skeleton name="mis-cuotas" loading={false}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:20}}>{cards}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[1,2,3].map(i => (
                <div key={i} className="card mc-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px'}}>
                  <div><div className="mc-periodo">Cuota {i}</div><div className="mc-vence">Vence: 15/08/2026</div></div>
                  <span className="badge">Pendiente</span>
                </div>
              ))}
            </div>
          </Skeleton>
          <Skeleton name="graduacion-alumno" loading={false}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:20}}>
              <h1 className="page-title" style={{marginBottom:0}}>Mi Graduacion</h1>
            </div>
            <div className="card" style={{marginBottom:20,padding:22}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <span style={{width:48,height:48,borderRadius:14,background:'rgba(148,163,184,0.15)'}} />
                <div><div style={{fontWeight:800,fontSize:16}}>Estado de egreso</div><div className="mono-label" style={{fontSize:12}}>Condicion de egreso</div></div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:20}}>{cards}</div>
          </Skeleton>
          <Skeleton name="equivalencias-alumno" loading={false}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:20}}>
              <h1 className="page-title">Equivalencias</h1>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:20}}>{cards}</div>
            <div className="card" style={{maxWidth:520,marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
                <span style={{width:32,height:32,borderRadius:10,background:'var(--accent-muted)'}} />
                <div><h3 style={{fontWeight:800,fontSize:15,margin:0}}>Nueva Solicitud</h3></div>
              </div>
              {formRow}
              {formRow}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[1,2].map(i => (
                <div key={i} className="card" style={{display:'flex',justifyContent:'space-between',padding:'14px 18px'}}>
                  <div><div style={{fontWeight:700,fontSize:14}}>Solicitud {i}</div></div>
                  <span className="badge" style={{padding:'5px 14px'}}>Pendiente</span>
                </div>
              ))}
            </div>
          </Skeleton>
          <Skeleton name="equivalencias-admin" loading={false}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:20}}>
              <h2 style={{fontSize:22,fontWeight:800}}>Equivalencias - Admin</h2>
            </div>
            {tabsContent}
            <div className="eqa-card">{table}</div>
          </Skeleton>
          <Skeleton name="pasantias-admin" loading={false}>
            <div className="ps-topbar" style={{marginBottom:20}}>
              <h2 className="ps-title">Pasantias - Admin</h2>
            </div>
            <div className="ps-tabs">{['Pendiente','En curso','Completada','Rechazada','Todas'].map(t => <div key={t} className="ps-tab">{t}</div>)}</div>
            <div className="ps-table-wrap">{table}</div>
          </Skeleton>
          <Skeleton name="ajustes-globales" loading={false}>
            <div className="ag-header"><h2 className="ag-title">Ajustes Globales</h2></div>
            <div className="ag-tabs">
              {['Academico','Financiero','Sistema','Notificaciones','Auditoria'].map(t => <div key={t} className="ag-tab"><span>{t}</span></div>)}
            </div>
            <div className="ag-card">
              {[1,2,3].map(i => (
                <div key={i} className="ag-setting-row">
                  <div className="ag-setting-info"><div className="ag-setting-label">Configuracion {i}</div></div>
                  <div className="ag-setting-input"><div className="ag-input" style={{height:36}} /></div>
                </div>
              ))}
            </div>
          </Skeleton>
        </div>
      </section>
    </div>
  )
}
