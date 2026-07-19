# Plan de Ventas — Sistema de Gestión Académica UCA V2
## Enfocado en Universidades del Paraguay

---

## 1. Resumen del Producto

**UCA V2** es un sistema de gestión académica integral (ERP universitario) construido con tecnología moderna: React 19 + TypeScript + Vite (frontend), FastAPI + SQLAlchemy + PostgreSQL (backend), y app móvil en React Native/Expo.

Actualmente en producción en la **Universidad Católica "Nuestra Señora de la Asunción" — Sede Caacupé**, con más de **220 tests automatizados**, 30 módulos funcionales y 9 pantallas móviles.

---

## 2. Módulos y Precios

| # | Módulo | Descripción | Precio (USD) |
|---|--------|-------------|-------------|
| 1 | **Core + Autenticación** | RBAC (admin/profesor/alumno), JWT + refresh tokens, CSRF, rate limiting, recuperación de contraseña | $2,500 |
| 2 | **Gestión de Materias y Ofertas** | Catálogo de materias, oferta académica por período, asignación profesor-materia | $1,500 |
| 3 | **Inscripciones** | Validación de correlatividades, control de cupos, antisolapamiento, bloqueo por mora | $2,500 |
| 4 | **Pensum / Malla Curricular** | Carreras, materias por semestre, créditos, correlatividades (aprobada/cursando), avance del alumno visual | $2,000 |
| 5 | **Calificaciones (Puntajes)** | Notas ponderadas (parciales, práctico, final), actas por materia, estadísticas, promedio global | $2,000 |
| 6 | **Asistencias** | Registro diario con QR (profesor genera código, alumno escanea), alerta automática de inasistencia (≥25%) vía email | $2,500 |
| 7 | **Portal Docente** | Mis materias (activas/histórico/agenda), KPIs por cátedra, agenda semanal tipo Google Calendar con recordatorios | $2,000 |
| 8 | **Expediente Académico** | Historial cerrado, PPA (promedio ponderado acumulado), estados de regularidad, PDF oficial | $2,500 |
| 9 | **Foro Académico** | Hilos por materia, mensajes paginados, fijar/cerrar hilo, edición con ventana de 15 min | $1,500 |
| 10 | **Módulo Financiero** | Conceptos de arancel, cuotas por período, pagos inmutables, bloqueo por mora configurable, exportación Excel | $4,000 |
| 11 | **Becas** | Fuentes de beca (ITAIPU, BECAL, Institucional), postulaciones, becas activas con descuento, reporte rendición ITAIPU | $2,500 |
| 12 | **Facturación Electrónica** | Integración con proveedor DNIT (guarani.app), degradación con gracia, reintentos automáticos | $2,000 |
| 13 | **Trámites** | Catálogo de tipos (constancias, historiales, certificados), generación de PDF, resolución con carga de archivos | $2,000 |
| 14 | **Pasantías** | Empresas receptoras, solicitudes, tutor académico, registro de horas, informes, certificación | $2,500 |
| 15 | **Graduación** | Procesos de tesis, etapas, verificación de solvencia/egreso, documentos CONES | $2,500 |
| 16 | **Equivalencias / Convalidaciones** | Solicitudes, equivalencia por materia con programa analítico, exámenes de suficiencia | $2,000 |
| 17 | **Exámenes Regulares** | Exámenes con cupos, inscripción, historial de inscriptos | $1,500 |
| 18 | **Biblioteca / Apuntes** | Compartición de apuntes con moderación, likes, descargas, almacenamiento Cloudflare R2 | $1,500 |
| 19 | **Calendario / Eventos** | Eventos académicos, carga por PDF con IA, vista mensual/diaria | $1,500 |
| 20 | **Reportes y Estadísticas** | Resumen institucional, por carrera, becados, exportación RUE-ES/MEC (Ministerio de Educación), gráficos | $2,500 |
| 21 | **App Móvil (React Native)** | Login biométrico, dashboard, materias, QR scanner, horario, perfil, estado de cuenta, exámenes (9 pantallas) | $5,000 |

---

## 3. Paquetes Recomendados

### 🎓 Plan Básico — $8,500
Módulos 1, 2, 3, 4, 5, 6, 7, 9, 17, 19
> Ideal para universidades que quieren digitalizar lo académico esencial: materias, inscripciones, notas, asistencias y foro.

### 🏛️ Plan Profesional — $16,000
Plan Básico + 8, 10, 11, 13, 20
> Agrega expediente académico, módulo financiero, becas, trámites y reportes.

### 🏢 Plan Corporativo — $25,000
Plan Profesional + 12, 14, 15, 16, 18, 21
> Sistema completo con facturación electrónica, pasantías, graduación, equivalencias, biblioteca y app móvil.

### ✨ Plan Premium (todo incluido) — $30,000
Todos los 21 módulos
> Implementación completa, personalización de marca, capacitación, y soporte prioritario por 12 meses.

---

## 4. Costos Adicionales

| Concepto | Precio |
|----------|--------|
| **Licencia anual por institución** (soporte + actualizaciones) | 20% del valor del plan contratado/año |
| **Capacitación presencial** (por grupo de hasta 20 personas) | $1,500 |
| **Personalización de marca** (logos, colores, dominio) | $1,000 |
| **Migración de datos** (desde sistema anterior) | $2,000 – $5,000 |
| **Infraestructura cloud** (servidor VPS o hosting) | Cotización aparte según proveedor |
| **Módulo a medida adicional** | Desde $2,000 |

---

## 5. ¿Cómo ofrecerlo? — Estrategia de Ventas

### 5.1 Universidades Target en Paraguay

**Públicas:**
- Universidad Nacional de Asunción (UNA)
- Universidad Nacional del Este (UNE)
- Universidad Nacional de Concepción (UNC)
- Universidad Nacional de Pilar (UNP)
- Universidad Nacional de Itapúa (UNI)
- Universidad Nacional de Caaguazú (UNCA)
- Universidad Nacional de Villarrica (UNV)
- Universidad Nacional de Canindeyú (UNICAN)

**Privadas:**
- Universidad Católica "Nuestra Señora de la Asunción" (UCA) — otras sedes
- Universidad Americana
- Universidad Autónoma de Asunción (UAA)
- Universidad del Pacífico
- Universidad Columbia
- Universidad San Lorenzo (UNISAL)
- Universidad Privada del Este (UPE)
- Universidad Central del Paraguay (UCP)
- Universidad Evangélica del Paraguay (UEP)

### 5.2 Argumentos de Venta Clave

1. **✅ Ya funciona en una universidad paraguaya** — No es un concepto, es un sistema probado en la UCA Caacupé
2. **✅ Código 100% propio** — Sin licencias de terceros (Oracle, SAP, etc.), sin costos ocultos
3. **✅ Stack moderno** — React + FastAPI, no sistemas legacy difíciles de mantener
4. **✅ App móvil incluida** — Los alumnos pueden escanear QR, ver notas, horarios desde el celular
5. **✅ Cumplimiento MEC** — Exportación RUE-ES para el Ministerio de Educación
6. **✅ Facturación electrónica DNIT** — Integración con guarani.app
7. **✅ Beca ITAIPU** — Reporte de rendición específico para ITAIPU
8. **✅ Seguridad** — JWT, CSRF, rate limiting, auditoría de cambios

### 5.3 Proceso de Venta

**Paso 1 — Demo personalizada**
Agenda una reunión con el área de TI y autoridades académicas. Muestra el sistema funcionando en vivo (https://uca.sistema.edu/ — o deploy temporal).

**Paso 2 — Prueba piloto (opcional)**
Ofrece 1 mes de prueba gratuita con un subdominio propio (universidad.ejemplo.com) y datos de prueba. Sin compromiso.

**Paso 3 — Propuesta formal**
Entrega este documento con la cotización personalizada. Incluye:
- Módulos seleccionados
- Cronograma de implementación (4-12 semanas)
- Plan de capacitación
- SLA de soporte

**Paso 4 — Implementación**
- Deploy en infraestructura del cliente o en la nube
- Migración de datos (si aplica)
- Capacitación a administradores, profesores y alumnos
- Período de acompañamiento (2 semanas)

**Paso 5 — Soporte continuo**
- Mantenimiento preventivo mensual
- Actualizaciones de seguridad
- Mesa de ayuda (email + WhatsApp)

### 5.4 Diferenciación Frente a Competidores

| Característica | UCA V2 | Competidores (SGU, sistemas legacy) |
|---------------|--------|-------------------------------------|
| Tecnología | React + FastAPI moderno | PHP/Java viejo, monolítico |
| App móvil | ✅ Nativa (React Native) | ❌ Webview o inexistente |
| QR para asistencia | ✅ | ❌ |
| Facturación electrónica DNIT | ✅ Integrado | ❌ Por separado |
| Exportación MEC (RUE-ES) | ✅ | ❌ Manual |
| Código fuente propio | ✅ | ❌ Licencias caras |
| API REST completa | ✅ | ❌ Sin API |
| Pruebas automatizadas | ✅ 220+ tests | ❌ |

### 5.5 Material de Apoyo para Ventas

- **Landing page demo** — Deploy rápido de una versión demo
- **Video de 3 min** — Recorrido por las funcionalidades clave
- **Casos de uso por rol** — Lo que ve admin / profesor / alumno
- **Brochure PDF** — Una página con módulos y beneficios
- **Testimonios** — De la UCA Caacupé (si autorizan)

---

## 6. Cronograma de Implementación

| Fase | Duración | Entregable |
|------|----------|------------|
| Discovery y requisitos | 1 semana | Documento de alcance firmado |
| Deploy y configuración | 1 semana | Sistema corriendo en producción |
| Migración de datos | 1-2 semanas | Datos históricos migrados |
| Personalización de marca | 3 días | Sistema con colores/logo del cliente |
| Capacitación administradores | 2 días | Administradores capacitados |
| Capacitación profesores | 1 día | Profesores usando el sistema |
| Capacitación alumnos | 1 día | Tutorial para alumnos |
| Acompañamiento post-lanzamiento | 2 semanas | Soporte intensivo |
| **Total estimado** | **4-8 semanas** | |

---

## 7. Formas de Pago Sugeridas

- **Contado**: 10% de descuento sobre el total
- **Financiado**: 50% al inicio, 25% a los 30 días, 25% a los 60 días
- **Suscripción mensual**: Plan Básico ~$700/mes, Profesional ~$1,300/mes, Corporativo ~$2,100/mes (contrato mínimo 12 meses)

---

## 8. Contacto

Para coordinar una demo o solicitar más información:

- **WhatsApp**: [+595 XXX XXX XXX](tel:+595)
- **Email**: [ventas@tudominio.com](mailto:ventas@tudominio.com)
- **Sitio web**: tudominio.com

---

*Documento generado el 18 de julio de 2026. Precios sujetos a cambio sin previo aviso.*
