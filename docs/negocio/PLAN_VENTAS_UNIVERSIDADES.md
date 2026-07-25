# Plan de Ventas — Sistema de Gestión Académica UCA V2
## Enfocado en Universidades del Paraguay

> **Nota de estado (actualizado 2026-07-24):** Este documento fue revisado tras el cierre de la
> auditoría de seguridad pre-producción (8 hallazgos corregidos, 282 tests pasando). Se marcó
> explícitamente qué está **confirmado hoy** vs qué es **aspiracional/roadmap**, y se ajustaron
> los precios de los planes superiores según el tamaño real del mercado universitario paraguayo.
> Ver también la sección 9, nueva, con lo que falta resolver antes de poder vender formalmente.

---

## 1. Resumen del Producto

**UCA V2** es un sistema de gestión académica integral (ERP universitario) construido con
tecnología moderna: React 19 + TypeScript + Vite (frontend), FastAPI + SQLAlchemy + PostgreSQL
(backend), y app móvil en React Native/Expo.

**Estado real (no aspiracional):** desarrollado y usado como caso de estudio en la Universidad
Católica "Nuestra Señora de la Asunción" — Sede Caacupé, con **282 tests automatizados** (backend),
19 tests frontend, y una auditoría de seguridad pre-producción cerrada con 8 hallazgos corregidos
(ver `docs/auditorias/AUDITORIA_2026-07-24.md`). **El sistema todavía no está desplegado en
producción real** — código, tests y CI están verdes, pero falta la infraestructura final (hosting,
secretos de producción de Stripe/VAPID/guarani.app, dominio). No presentar este sistema como
"en uso actualmente por alumnos reales" hasta que ese despliegue exista — sería una afirmación
verificable y falsa que puede costar credibilidad completa en la primera reunión.

---

## 2. Módulos y Precios

*Precios de referencia por módulo — ver sección 3 para el criterio de ajuste según tipo de cliente.*

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

## 3. Paquetes Recomendados — ajustados por segmento real

El mercado universitario paraguayo no es homogéneo: hay una diferencia grande de presupuesto entre
una sede regional de interior (aranceles de matrícula bajos, ~USD 60-100) y una universidad grande
de Asunción con mayor matrícula y presupuesto institucional. Los precios de lista de la sección 2 se
mantienen como referencia interna, pero los paquetes recomendados se ajustan así:

### 🎯 Caso ancla (primera venta) — desde $4,000-5,000
Plan Básico con 40-50% de descuento de lanzamiento, a cambio de: autorización para usarlos como
referencia/testimonio verificable, feedback estructurado de uso real, y flexibilidad en el
cronograma de implementación.
> **Esto no es un capricho de marketing — es una necesidad real.** Hoy no existe ningún cliente
> pagando ni un despliegue en producción verificable. El objetivo del primer contrato no es
> maximizar el precio, es conseguir el primer caso de uso real y citable. Sin esto, cualquier precio
> de los planes de abajo es difícil de sostener frente a un comprador que pregunte "¿quién más lo
> usa?".

### 🎓 Plan Básico — $6,000 – $8,500 (ajustado según tamaño de la institución)
Módulos 1, 2, 3, 4, 5, 6, 7, 9, 17, 19
> Ideal para universidades chicas o sedes de interior que quieren digitalizar lo académico
> esencial: materias, inscripciones, notas, asistencias y foro. Rango bajo para sedes regionales,
> rango alto para privadas medianas de Asunción.

### 🏛️ Plan Profesional — $12,000 – $16,000 (ajustado según tamaño de la institución)
Plan Básico + 8, 10, 11, 13, 20
> Agrega expediente académico, módulo financiero, becas, trámites y reportes. Apunta a
> universidades privadas medianas ya establecidas, no a sedes de interior con presupuesto ajustado.

### 🏢 Plan Corporativo — cotizar según institución (referencia: $18,000 – $25,000)
Plan Profesional + 12, 14, 15, 16, 18, 21
> **Aspiracional para el segmento actual del mercado.** Sistema completo con facturación
> electrónica, pasantías, graduación, equivalencias, biblioteca y app móvil. Solo tiene sentido como
> precio de lista fijo para universidades grandes con presupuesto de TI consolidado (ej. sede
> central de una universidad grande de Asunción, o una universidad pública vía proceso de
> contratación formal). Para el resto del mercado, cotizar por separado tras conocer el presupuesto
> real de la institución — no ofrecer como paquete cerrado de entrada.

### ✨ Plan Premium (todo incluido) — cotizar según institución (referencia: $22,000 – $30,000)
Todos los 21 módulos.
> **Aspiracional.** Mismo criterio que el Corporativo — no fijar como precio de catálogo hasta tener
> al menos 2-3 clientes de referencia reales y validación de que existe demanda a esa escala en el
> mercado paraguayo actual.

### 💳 Modelo de suscripción mensual — probablemente más realista que pago único
Dado que instituciones chicas/medianas suelen preferir gasto operativo mensual a una inversión
grande de una sola vez:
- Básico: ~$500-700/mes (contrato mínimo 12 meses)
- Profesional: ~$900-1,300/mes (contrato mínimo 12 meses)
- Corporativo: cotizar — no fijar mensualidad de catálogo todavía

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

**Públicas** — proceso de compra distinto (ver sección 9.3, contratación estatal):
- Universidad Nacional de Asunción (UNA)
- Universidad Nacional del Este (UNE)
- Universidad Nacional de Concepción (UNC)
- Universidad Nacional de Pilar (UNP)
- Universidad Nacional de Itapúa (UNI)
- Universidad Nacional de Caaguazú (UNCA)
- Universidad Nacional de Villarrica (UNV)
- Universidad Nacional de Canindeyú (UNICAN)

**Privadas** — trato directo, ciclo de venta más corto:
- Universidad Católica "Nuestra Señora de la Asunción" (UCA) — otras sedes
- Universidad Americana
- Universidad Autónoma de Asunción (UAA)
- Universidad del Pacífico
- Universidad Columbia
- Universidad San Lorenzo (UNISAL)
- Universidad Privada del Este (UPE)
- Universidad Central del Paraguay (UCP)
- Universidad Evangélica del Paraguay (UEP)

**Recomendación de foco inicial:** priorizar privadas medianas y sedes de interior de universidades
más grandes — ciclo de venta más corto, decisión más centralizada, y presupuesto más alineado con
el Plan Básico/Profesional que sí está validado.

### 5.2 Argumentos de Venta Clave — marcados por estado real

| Argumento | Estado |
|---|---|
| Código 100% propio, sin licencias de terceros | ✅ Confirmado |
| Stack moderno (React + FastAPI) | ✅ Confirmado |
| App móvil incluida | ✅ Confirmado (código), pendiente validar en producción real |
| Cumplimiento MEC (exportación RUE-ES) | ✅ Confirmado en código — validar con un caso real antes de garantizarlo a un cliente |
| Facturación electrónica DNIT (guarani.app) | ⚠️ Integrado en código, **nunca probado con credenciales reales de producción** — no garantizar a un cliente hasta hacer esa prueba end-to-end |
| Reporte de rendición ITAIPU | ✅ Confirmado en código |
| Seguridad (JWT, CSRF, rate limiting, auditoría) | ✅ Confirmado — auditado el 2026-07-24, 8 hallazgos corregidos |
| "Ya funciona en una universidad paraguaya" | ❌ **No usar todavía** — no hay despliegue en producción real. Reemplazar por: "desarrollado y validado como caso de estudio en la UCA Caacupé" hasta que exista un despliegue real y autorizado |

### 5.3 Proceso de Venta

**Paso 1 — Demo personalizada**
Agenda una reunión con el área de TI y autoridades académicas. Mostrar el sistema funcionando en
vivo requiere primero tener un deploy real — ver sección 9.1. No agendar demos en vivo hasta
resolver esto.

**Paso 2 — Prueba piloto (opcional)**
Ofrecer 1 mes de prueba gratuita con un subdominio propio (universidad.ejemplo.com) y datos de
prueba. Sin compromiso. Ideal como mecanismo para conseguir el caso ancla de la sección 3.

**Paso 3 — Propuesta formal**
Entregar este documento con la cotización personalizada, más el contrato correspondiente (ver
sección 9.2 — todavía no existe, es un bloqueante). Incluye:
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

| Característica | UCA V2 | Competidores (SIU Guaraní y homólogos, sistemas legacy) |
|---------------|--------|-------------------------------------|
| Tecnología | React + FastAPI moderno | Frecuentemente stacks más antiguos, monolíticos |
| App móvil | ✅ Nativa (React Native) | Variable — algunos ya tienen webview o apps propias |
| QR para asistencia | ✅ | Variable |
| Facturación electrónica DNIT | ✅ Integrado (sin probar en real todavía) | Variable |
| Exportación MEC (RUE-ES) | ✅ | Variable |
| Código fuente propio | ✅ | Depende del proveedor — algunos sistemas institucionales grandes (SIU Guaraní) tienen soporte y trayectoria de años |
| API REST completa | ✅ | Variable |
| Pruebas automatizadas | ✅ 282 tests backend + 19 frontend | Desconocido, no verificable públicamente |

**Nota importante:** no hay competencia paraguaya moderna documentada públicamente con la que
comparar precio directo — lo cual es a la vez oportunidad (poca alternativa moderna visible) y
riesgo (universidades públicas grandes ya suelen tener sistemas instalados con años de soporte
institucional, como variantes de SIU Guaraní; desplazar un sistema instalado es más difícil que
vender a quien no tiene nada).

### 5.5 Material de Apoyo para Ventas

- **Landing page demo** — pendiente, depende del deploy real (sección 9.1)
- **Video de 3 min** — pendiente de grabar
- **Casos de uso por rol** — pendiente, se puede armar ya con capturas del sistema actual
- **Brochure PDF** — pendiente
- **Testimonios** — pendiente, depende de autorización real de la UCA Caacupé y de que exista un uso en producción verificable

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
- **Suscripción mensual**: ver sección 3 — probablemente el modelo más realista para el mercado
  paraguayo actual, contrato mínimo 12 meses

---

## 8. Contacto

> ⚠️ **Pendiente de completar antes de enviar este documento a cualquier universidad.** Los datos
> de abajo son placeholders — reemplazar por contacto real antes de usar este documento
> externamente.

- **WhatsApp**: [+595 XXX XXX XXX](tel:+595) — *completar*
- **Email**: [ventas@tudominio.com](mailto:ventas@tudominio.com) — *completar*
- **Sitio web**: tudominio.com — *completar*

---

## 9. Qué falta antes de poder vender formalmente

*Sección nueva — 2026-07-24. Esto no reemplaza asesoría legal ni contable real; es el mapa de qué
resolver, no los documentos legales en sí. Antes de firmar cualquier contrato real, un abogado
paraguayo debe revisar los documentos finales — especialmente por el manejo de datos de
estudiantes (en algunos casos menores de edad) y, si se apunta a universidades públicas, por los
procesos de contratación estatal.*

### 9.1 Técnico/comercial — bloqueante inmediato
- Deploy real en producción (hoy el sistema está commiteado y auditado, pero no desplegado)
- Contacto real (WhatsApp, email, dominio) — ver sección 8
- Demo en vivo, video, brochure, casos de uso por rol — todo material de apoyo depende del deploy

### 9.2 Legal — bloqueante para firmar cualquier contrato
- Contrato de licencia de software (SLA, propiedad intelectual, límites de uso, garantías)
- Contrato/cláusula de tratamiento de datos personales (estudiantes, incluyendo posibles menores)
- Términos de responsabilidad y limitación de garantía
- Constitución legal formal de WebPy Studio (SRL o Empresa Individual) para poder facturar y
  firmar contratos institucionales de forma válida

### 9.3 Proceso de compra según tipo de cliente
- **Privadas**: trato directo, ciclo de venta más corto — foco recomendado para el caso ancla
- **Públicas**: sujetas a procesos de contratación estatal (licitaciones, pliegos de bases y
  condiciones vía la Dirección Nacional de Contrataciones Públicas). Proceso mucho más largo y
  regulado — no tratar con el mismo enfoque comercial que a una privada

### 9.4 Operativo, post-venta
- Plan de soporte y SLA real (tiempos de respuesta, canal de contacto, escalamiento)
- Plan de backup y recuperación de datos documentado
- Definición clara de quién es dueño de los datos si el cliente deja de pagar o rescinde contrato
- Facturación fiscal formal en Paraguay para poder cobrar institucionalmente

### 9.5 Validación de mercado — antes de fijar precios finales de los planes superiores
- Confirmar presupuesto real de TI de 2-3 universidades target concretas, en vez de asumir
- Conseguir el primer testimonio/caso de uso real y autorizado (ver sección 3, caso ancla)
- Validar si las universidades target compran por módulo/paquete flexible o exigen todo-o-nada
  (más común en procesos de licitación pública)

---

*Documento actualizado el 24 de julio de 2026, tras auditoría de seguridad pre-producción.
Precios sujetos a cambio sin previo aviso y pendientes de validación de mercado real (sección 9.5).*
