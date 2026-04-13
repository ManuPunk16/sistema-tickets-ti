# 📊 Análisis del Sistema de Tickets TI

> **Generado:** Análisis completo del estado actual, capacidades, limitaciones y roadmap de trabajo.
> **Última actualización:** 14 de Abril de 2026 — Auditoría de migración completada. UI 100% Tailwind CSS (11/11 componentes migrados). 0% Angular Material. 0% Firestore en frontend. `config.service.ts` ya era REST API — ANALISIS estaba desactualizado.
> **Propósito:** Guía de referencia para tomar decisiones técnicas y de priorización.
> **Equipo de agentes:** 01-Arquitecto · 02-Backend · 03-Frontend · 04-Seguridad · 05-QA · 06-DevOps · **07-UIUX**

---

## ✅ QUÉ PUEDE HACER (Capacidades actuales)

### Autenticación y Acceso
- ✅ Login con email y contraseña (Firebase Auth)
- ✅ Login con Google (popup en desktop, redirect en móvil)
- ✅ Recuperación de contraseña vía email
- ✅ Cierre de sesión seguro
- ✅ Verificación de token en servidor (Firebase Admin SDK)
- ✅ Sistema de roles completo: `admin`, `support`, `user`, `pending`, `inactive`
- ✅ Flujo de aprobación manual: nuevos usuarios quedan en estado `pending` hasta que admin los activa
- ✅ Guards de ruta por rol (`AuthorizedUserGuard`, `adminGuard`, `authRedirectGuard`)
- ✅ Interceptor HTTP que adjunta token Bearer automáticamente

### Gestión de Usuarios (Admin)
- ✅ Listar todos los usuarios con paginación
- ✅ Aprobar/rechazar usuarios nuevos (cambiar rol de `pending` → `user`/`inactive`)
- ✅ Cambiar rol de cualquier usuario
- ✅ Buscar usuarios por nombre/email
- ✅ Ver perfil detallado de usuario
- ✅ Componente `user-list` ya migrado: usa Signals, OnPush, inject(), Tailwind puro

### Gestión de Tickets
- ✅ Crear ticket con: título, descripción, categoría, prioridad, departamento, adjuntos
- ✅ Ciclo de vida completo: `NUEVO → ASIGNADO → EN_PROCESO → EN_ESPERA → RESUELTO → CERRADO`
- ✅ Adjuntar archivos (imágenes, PDF, TXT) vía Firebase Storage (límite 5 MB por archivo)
- ✅ Agregar comentarios internos (solo TI) y externos (visibles al usuario)
- ✅ Asignar ticket a personal de soporte
- ✅ Cálculo de SLA por prioridad: crítica (2h), alta (8h), media (24h), baja (72h)
- ✅ Filtrar tickets por estado, prioridad, departamento, usuario asignado
- ✅ API REST completamente implementada en el backend (`/api/tickets/*`)
- ✅ `ticket.service.ts` migrado a REST API (HttpClient) — eliminado Firestore
- ✅ **CORREGIDO:** Usuarios normales ya NO ven la sección "Actualizar Estado" en tickets que no son suyos o están en estado previo a `resuelto`
- ✅ **CORREGIDO:** Dropdown de departamentos oculto en el listado para usuarios normales (solo admin/soporte lo ven)
- ✅ **CORREGIDO:** Campo departamento es solo lectura en modo edición para usuarios normales
- ✅ **CORREGIDO:** Error 403 al ver un ticket como usuario normal — `GET /api/usuarios/:uid` ahora permite acceso al perfil propio
- ✅ **CORREGIDO:** Formulario de ticket (`ticket-form`) auto-rellena el departamento desde el perfil del usuario y lo deshabilita (usuarios no pueden cambiarlo)
- ✅ **CORREGIDO:** `ticket-detail` ya no llama a `GET /api/usuarios/:uid` innecesariamente para roles no privilegiados — usa los campos `creadoPorNombre`/`asignadoANombre` del ticket
- ✅ **CORREGIDO:** `ticket-list` ya no carga la lista de departamentos para usuarios normales (llamada innecesaria eliminada)
- ✅ **CORREGIDO:** Condición de carrera en `ngOnInit` de `ticket-detail` — el ticket ya no se carga antes de tener el usuario disponible
- ✅ **AUDITADO:** Modelos y enums frontend/backend son consistentes. Enums `admin|support|user|pending|inactive` idénticos. Campos `Ticket`, `Departamento` sincronizados. Campo muerto `IComentario.archivosAdjuntos` eliminado del modelo frontend

### Módulo de Reportes
- ✅ `GET /api/reportes/resumen` — accesible para todos los roles activos. Usuarios normales reciben stats filtradas por su propio departamento
- ✅ `GET /api/reportes/departamento` — accesible para todos. Usuarios normales ven solo su departamento; admin/soporte pueden filtrar con `?departamento=`
- ✅ `GET /api/reportes/rendimiento` — bloqueado con 403 para rol `user` (requiere admin/soporte)
- ✅ Dashboard de reportes: botón "Reporte de Rendimiento" oculto para usuarios normales; botón de departamento muestra "Reporte de [DEPTO]" dinámicamente
- ✅ Reporte de departamentos: selector de departamento oculto para usuarios normales (auto-rellenado desde perfil); reporte se genera automáticamente al entrar
- ✅ Reporte de rendimiento: redirige a `/reportes` si el usuario es rol `user`; no llama a `GET /api/usuarios?rol=support` para evitar el 403

### Gestión de Departamentos
- ✅ CRUD completo de departamentos (admin)
- ✅ API REST implementada (`/api/departamentos/*`)
- ✅ **COMPLETADO:** `department.service.ts` migrado a REST API (HttpClient) — eliminado Firestore

### Reportes y Métricas
- ✅ API de reportes implementada con aggregation pipelines en MongoDB
- ✅ KPIs disponibles: resumen general, métricas por departamento, rendimiento por agente, tendencias
- ✅ Componente `dashboard-report` ya migrado: Signals, OnPush, Tailwind
- ✅ **COMPLETADO:** `report.service.ts` migrado a REST API (HttpClient) — eliminado Firestore

### Seguridad
- ✅ Verificación de token Firebase en cada request de API
- ✅ CORS restrictivo (solo `localhost:4200` y `tickets-ti-cj.vercel.app`)
- ✅ Rate limiting en 3 niveles: 100 req/min global, 10/min auth, 30/min escritura
- ✅ Headers de seguridad completos (CSP, X-Frame-Options, HSTS, etc.)
- ✅ `robots.txt` con `Disallow: /` — sistema no indexable
- ✅ Validación de schemas con Joi en el backend
- ✅ Mensajes de error seguros en producción (no exponen stack traces)
- ✅ Logging estructurado con Winston

### UI/UX
- ✅ Layout principal responsivo con Tailwind (navbar + sidebar)
- ✅ Dashboard con KPIs visuales
- ✅ Página de gestión de usuarios completamente en Tailwind
- ✅ Página de reportes completamente en Tailwind
- ✅ Mobile-first design en todos los componentes
- ✅ **AUDITADO (14 abr 2026):** UI 100% Tailwind CSS — **11/11 componentes migrados**. Cero `@angular/material`, cero `*ngIf`/`@Input()` legacy, cero Firestore en todo el frontend

---

## ❌ QUÉ NO PUEDE HACER (Limitaciones actuales)

### Funcionalidades Faltantes
- ❌ **Notificaciones en tiempo real** — No hay WebSockets, SSE ni push notifications. Un usuario no sabe si su ticket fue actualizado hasta que recarga la página
- ❌ **Notificaciones por email** — No hay integración SMTP. Cuando un ticket cambia de estado, nadie recibe email de aviso
- ❌ **Búsqueda de texto completo** — MongoDB Atlas M0 no soporta Atlas Search (requiere M10+). Solo se puede filtrar por campos exactos
- ❌ **Exportar reportes** — No se puede descargar PDF ni Excel de los datos
- ❌ **Cron jobs / tareas programadas** — Vercel Hobby no tiene cron nativo. No hay forma de ejecutar tareas automáticas (ej: escalar prioridad de tickets sin respuesta)
- ❌ **Offline / PWA** — No es una Progressive Web App; requiere conexión constante
- ❌ **Operaciones masivas** — No existe función para cerrar, reasignar o archivar múltiples tickets a la vez
- ❌ **Vista Kanban** — Solo hay vista de tabla/lista, no hay tablero drag-and-drop
- ❌ **Plantillas de tickets** — No hay formularios preconfigurados por categoría
- ❌ **Alertas de SLA vencido** — El campo se calcula pero no dispara ninguna alerta
- ❌ **Auditoría de acciones** — No hay log de quién cambió qué y cuándo en el frontend
- ❌ **Monitoreo de errores** — No hay Sentry ni equivalente para capturar excepciones en producción

### Problemas Técnicos Activos (Deuda Técnica)

#### 🔴 CRÍTICO — Inconsistencia de datos

| Servicio | Estado | Problema |
|---|---|---|
| `ticket.service.ts` | ✅ REST API | Migrado — lógica de filtros y Firebase Storage conservado |
| `department.service.ts` | ✅ REST API | Migrado — modelo renombrado a español (`Departamento`) |
| `report.service.ts` | ✅ REST API | Migrado — `executeTicketsQuery` y `process*` públicos por compatibilidad |
| `user.service.ts` | ✅ REST API | Correcto |
| `auth.service.ts` | ✅ Firebase Auth | Import Firestore eliminado — nunca se usaba |
| `config.service.ts` | ✅ REST API | Confirmado — usa `HttpClient` → `/api/configuracion`. Endpoint backend implementado con GET+PUT en MongoDB |

**Estado:** ✅ Riesgo de inconsistencia **eliminado** — auditoría (14 abr 2026) confirmó que ningún servicio lee de Firestore. Todos los datos fluyen exclusivamente a través de la API REST → MongoDB.

#### � RESUELTO (13 de abril de 2026) — Bugs de permisos y control de acceso UI

| Bug | Causa raíz | Solución aplicada |
|---|---|---|
| Error 403 al cargar técnicos en `ticket-detail` | `getAllUsers('admin')` se llamaba para todos los roles; el endpoint requiere admin/support | Carga condicional: solo se llama cuando `usuario.role === 'admin' \| 'support'` |
| Error 403 en `PATCH /api/tickets/:id/estado` | `puedeCambiarEstado` permitía que cualquier creador del ticket cambie el estado; el backend solo permite al usuario cerrar tickets `resuelto` | Computed corregido: usuario solo ve la sección si el ticket es suyo Y está en `resuelto` |
| Usuario normal ve dropdown departamento en lista | No había verificación de rol en el template | Envuelto en `@if (!esUsuarioNormal())` |
| Usuario puede cambiar departamento al editar ticket | Formulario no tenía distinción por rol | Campo departamento se vuelve `div` de solo lectura en modo edición para `user` |
| Opciones de estado ilimitadas para usuario normal | `opcionesEstado` incluía todos los estados | Nuevo computed `opcionesEstadoDisponibles()` filtra solo `cerrado` para usuarios normales |

#### �🟡 IMPORTANTE — Angular Material en componentes activos

| Componente | Módulos Material problemáticos |
|---|---|
| `ticket-list` | ✅ **MIGRADO** — Signals + computed paginación + Tailwind. Sin `MatTable` ni `MatPaginator` |
| `ticket-form` | ✅ **MIGRADO** — Angular Material eliminado, Signals + Tailwind |
| `login` | ✅ **MIGRADO** — Signals + inject() + Tailwind. Sin `MatSnackBar` |
| `forgot-password` | ✅ **MIGRADO** — Signals + inject() + Tailwind. Sin `MatCard` ni `MatFormField` |
| `ticket-detail` | ✅ **MIGRADO** — Signals (`tabActivo`, `puedeCambiarEstado`), `input()`/`output()`, Tailwind. Sin MatSnackBar/Tabs/Chips |
| `ticket-timeline` | ✅ **MIGRADO** — `imports: []`, Tailwind puro, `input()` signal, OnPush |
| `ticket-comments-list` | ✅ **MIGRADO** — `imports: []`, `input<TicketComment[]>([])`, OnPush |
| `department-list` | ✅ **MIGRADO** — Inline Tailwind template, `imports: [CommonModule, RouterLink]`, signals |
| `department-form` | ✅ **MIGRADO** — `imports: [ReactiveFormsModule, RouterLink]`, `inject()`, signals |
| `performance-report` | ✅ **MIGRADO** — Paginación custom con signals, `imports: [CommonModule, ReactiveFormsModule, RouterLink]` |
| `system-settings` | ✅ **MIGRADO** — Tabs via `pestanaActiva = signal(...)`, toggles via ReactiveFormsModule, 0 Material |
| `file-upload` | ✅ **MIGRADO** — `imports: []`, `input()`/`output()` funciones, `inject()`, OnPush |

**Total migrados:** 11 / 11 componentes. ✅ **MIGRACIÓN COMPLETA.**
**Verificado:** `grep -r "@angular/material" src/` → **cero resultados**.

#### ✅ RESUELTO — Patrones legacy eliminados
- Todos los componentes usan `input()`/`output()` funciones (sin `@Input()` ni `@Output()` legacy)
- Todos los componentes usan control flow nativo `@if`/`@for`/`@switch` (sin `*ngIf` ni `*ngFor`)
- Todos los componentes tienen `ChangeDetectionStrategy.OnPush`
- **Verificado:** `grep -r "@Input()\|@Output()\|\*ngIf\|\*ngFor" src/` → **cero resultados**

#### 🟢 MENOR — Calidad de código
- No hay suite de pruebas unitarias ni e2e
- Algunos errores que deberían mostrarse como toast al usuario se pierden silenciosamente
- No hay skeleton loaders; las pantallas en carga muestran blanco

---

## 💡 RECOMENDACIONES

### ✅ Recomendación #1 — COMPLETADA: Migración de servicios
Todos los servicios (`ticket.service.ts`, `department.service.ts`, `report.service.ts`, `user.service.ts`, `auth.service.ts`, `config.service.ts`) usan exclusivamente `HttpClient` → REST API → MongoDB. Cero lecturas/escrituras a Firestore.

### ✅ Recomendación #2 — COMPLETADA: NotificacionService creado
`NotificacionService` implementado con Signals. Reemplazó `MatSnackBar` en todos los componentes migrados.

### ✅ Recomendación #3 — COMPLETADA: Migración de todos los componentes
Los 11 componentes están completamente migrados a Tailwind CSS con Signals, `inject()` y `ChangeDetectionStrategy.OnPush`.

### Recomendación #4 — Implementar notificaciones por email en Fase 2
[Resend.com](https://resend.com) tiene un plan gratuito de 3,000 emails/mes, sin tarjeta de crédito. Se integra fácilmente desde una Vercel Function. Los casos de uso críticos son: ticket creado, ticket asignado, ticket resuelto.

### Recomendación #5 — Añadir manejo de errores global en el frontend
Crear un `ErrorInterceptor` HTTP que capture errores 401 (sesión expirada), 403 (sin permiso), 429 (rate limit), 500 (error de servidor) y los muestre automáticamente como toast sin necesidad de manejarlos en cada componente.

---

## 🗺️ ROADMAP DE TRABAJO

### Fase 1 — Estabilización ✅ COMPLETADA
> **Objetivo cumplido:** El sistema lee y escribe datos desde un solo lugar (MongoDB via API REST)

| Tarea | Estado | Notas |
|---|---|---|
| Migrar `department.service.ts` a REST API | ✅ | Modelo renombrado a español (`Departamento`) |
| Migrar `ticket.service.ts` a REST API | ✅ | Storage Firebase conservado; métodos legacy con aliases |
| Migrar `report.service.ts` a REST API | ✅ | Aggregation pipelines en MongoDB |
| Corregir errores TS en componentes (campos en inglés vs español) | ✅ | `assignedUser`, `status`, `attachments`, etc. |
| Eliminar import Firestore de `auth.service.ts` | ✅ | Era código muerto (no se inyectaba) |
| Migrar `ticket-form` fuera de Angular Material | ✅ | Signals + Tailwind, ChangeDetectionStrategy.OnPush |
| `config.service.ts` | ✅ Completado | Usa `HttpClient` → `/api/configuracion`. Endpoint backend GET+PUT implementado con MongoDB |

**Criterio de éxito:** ✅ Ningún `import from '@angular/fire/firestore'` activo en ningún servicio del frontend. **Confirmado por auditoría completa (14 abr 2026).**

---

### Fase 2 — Limpieza de UI ✅ COMPLETADA
> **Objetivo cumplido:** Cero dependencias de Angular Material; UI 100% Tailwind CSS.
> **Auditado:** 14 de Abril de 2026 — todos los componentes confirmados migrados.

| Tarea | Estado | Componente |
|---|---|---|
| Migrar `file-upload` | ✅ MIGRADO | Shared |
| Migrar `ticket-detail` | ✅ MIGRADO | Tickets |
| Migrar `ticket-timeline` | ✅ MIGRADO | Tickets |
| Migrar `ticket-comments-list` | ✅ MIGRADO | Tickets |
| Migrar `department-form` | ✅ MIGRADO | Departamentos |
| Migrar `department-list` | ✅ MIGRADO | Departamentos |
| Migrar `performance-report` | ✅ MIGRADO | Reportes |
| Migrar `system-settings` | ✅ MIGRADO | Configuración |
| Eliminar dependencia `@angular/material` del `package.json` | ⏳ Pendiente | Build — ejecutar `npm uninstall @angular/material` |

**Criterio de éxito:** ✅ Toda la UI usa clases Tailwind. Pendiente solo el `npm uninstall @angular/material` para limpiar `package.json` (no genera errores de runtime porque no se importa en ningún componente).

---

### Fase 2.5 — Integración Almacenamiento en Windows Server (Prioridad Alta) 🟠
> **Objetivo:** Reemplazar Firebase Storage (1 GB / 5 GB descarga/mes) con el servidor físico Windows Server propio. Sin límite de almacenamiento, compresor de imágenes automático.
> **Documento de análisis completo:** `.claude/context/almacenamiento-archivos.md`

#### Sub-tarea A — Upload Service en Windows Server (Node.js)

| Tarea | Dificultad | Notas |
|---|---|---|
| Instalar Node.js y pm2 en Windows Server | Baja | Prerrequisito del servidor |
| Crear servicio Express `upload-service` | Media | multer + sharp + file-type + firebase-admin |
| Configurar HTTPS (Let’s Encrypt o certificado corporativo) | Media | Obligatorio para que el token no viaje en claro |
| Configurar Windows Firewall (regla de entrada en puerto elegido) | Baja | Abrir solo el puerto del servicio |
| Registrar como servicio de Windows con pm2 (`pm2 startup`) | Baja | Reinicio automático al encender el servidor |
| Definir carpeta de destino (`D:\tickets-adjuntos\`) sin permisos de ejecución | Baja | Seguridad OWASP |

#### Sub-tarea B — Migración en Angular

| Tarea | Dificultad | Notas |
|---|---|---|
| Migrar `file-upload.component` a Tailwind (eliminar 5 módulos Material) | Media | Drag & drop, barra de progreso real con `reportProgress: true` |
| Actualizar `ticket.service.ts`: reemplazar llamadas Firebase Storage por HTTP POST al Windows Server | Media | El URL del archivo se sigue guardando en MongoDB como string |
| Agregar `uploadUrl` a `environment.ts` y `environment.prod.ts` | Baja | `uploadUrl: 'https://[servidor]/upload'` |
| Validar formatos permitidos en cliente: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG | Baja | Lista blanca de 9 extensiones + MIME types |

#### Estado actual

| Componente | Estado |
|---|---|
| `file-upload.component.ts` | ⚠️ Pendiente — usa 5 módulos Angular Material, sin restricción de formatos |
| `ticket.service.ts` | ⚠️ Pendiente — usa Firebase Storage SDK |
| Windows Server Upload Service | ❌ No creado — requiere info del servidor |
| `environment.ts` | ❌ Falta campo `uploadUrl` |

**Prerrequisito para implementar:** El usuario debe proporcionar la información del servidor detallada en `.claude/context/almacenamiento-archivos.md` (IP, versión Windows Server, espacio en disco, puerto disponible, SSL).
**Formatos permitidos tras la migración:** PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG (9 formatos, validación por magic bytes en servidor).
**Compresor:** `sharp` aplica automáticamente calidad 80% a JPG/PNG. Documentos Office no se comprimen (ya son ZIP internamente).

---

### Fase 3 — UX y Flujo de Usuario (Prioridad Normal) 🟡
> **Objetivo:** Experiencia de usuario más fluida y profesional; especial atención a usuarios adultos mayores.

| Tarea | Dificultad | Agente |
|---|---|---|
| Skeleton loaders en listas (tickets, usuarios, departamentos) | Baja | 03-Frontend + 07-UIUX |
| Estado de carga por componente con spinner SVG personalizado | Baja | 07-UIUX |
| Páginas de error 404, 403, 500 con diseño Tailwind | Baja | 07-UIUX |
| `ErrorInterceptor` HTTP global (maneja 401/403/429/500) | Media | 02-Backend + 03-Frontend |
| Animaciones de transición entre páginas | Media | 07-UIUX |
| Confirmación visual al realizar acciones destructivas (modal de confirmación) | Baja | 07-UIUX |
| Mejorar tipografía: tamaños mínimos 16px, contraste WCAG AA | Baja | 07-UIUX |
| Revisar tamaños de toque en móvil (mínimo 44×44px) | Baja | 07-UIUX |
| Dashboard con KPIs visuales para todos los roles | Media | 03-Frontend + 07-UIUX |

---

### Fase 4 — Nuevas Funcionalidades (Prioridad Normal) 🟢
> **Objetivo:** Funcionalidades que aumentan el valor del sistema

| Tarea | Dificultad | Notas | Agente |
|---|---|---|---|
| Notificaciones por email (Resend.com free tier) | Media | Ticket creado, asignado, resuelto | 02-Backend |
| Exportar reportes a CSV (sin dependencias externas) | Baja | `Blob` + `URL.createObjectURL` | 03-Frontend |
| Búsqueda de tickets por texto en descripción | Baja | Con índice texto MongoDB | 02-Backend |
| Filtro de rango de fechas en reportes | Media | | 02-Backend + 03-Frontend |
| Indicador visual de SLA: verde/amarillo/rojo según tiempo restante | Baja | Computed signal | 03-Frontend + 07-UIUX |
| Calificación de satisfacción por usuario cuando ticket se cierra | Media | Ya hay endpoint backend | 03-Frontend + 07-UIUX |
| Vista comprimida en móvil para tabla de tickets (card por ticket) | Media | Mobile-first mejora | 07-UIUX + 03-Frontend |

---

### Fase 5 — Calidad y Estabilidad (Continuo) ⚪
> **Objetivo:** Sistema confiable en producción

| Tarea | Dificultad |
|---|---|
| Pruebas unitarias para handlers críticos de la API (auth, tickets) | Media |
| Pruebas e2e para flujo completo: login → crear ticket → resolver ticket | Alta |
| Monitoreo de errores en frontend (Sentry free tier) | Baja |
| Documentar variables de entorno requeridas en `.env.example` | Muy baja |
| Revisar índices MongoDB para campos de filtro frecuente | Media |

---

## 📋 ESTADO RESUMEN

| Área | Estado | Necesita |
|---|---|---|
| Backend API (Vercel Functions) | ✅ 90% completo | Implementar endpoint `/api/configuracion` |
| Autenticación (Firebase Auth) | ✅ Completo | Nada |
| Servicios frontend | ✅ **100%** migrado | Todos los servicios usan REST API. `config.service.ts` confirmado ✅ |
| Control de permisos UI (roles) | ✅ **CORREGIDO** (13 abr 2026) | Bugs de 403 y dropdowns resueltos |
| Componentes UI | ✅ **100% Tailwind** | **11/11 componentes migrados** — 0% Angular Material (14 abr 2026) |
| Modelos MongoDB | ✅ Completo | |
| Seguridad API | ✅ Completo | |
| Tests | ❌ 0% | Crear suite mínima |
| Notificaciones toast | ✅ `NotificacionService` implementado | Pendiente solo notificaciones por email |
| Almacenamiento archivos | ⚠️ Firebase Storage (1 GB límite) | Migrar a Windows Server Upload Service |
| Monitoreo | ❌ No existe | Error tracking |
| Agente UIUX | ✅ Creado | `.claude/agents/07-uiux.md` — diseño inclusivo + mobile-first |

**Conclusión:** El sistema tiene una base sólida y arquitectura correcta. Las Fases 1 y 2 están **completamente terminadas**: 100% REST API, 100% Tailwind CSS, 0% Angular Material, 0% Firestore en el frontend. La prioridad ahora es ejecutar `npm uninstall @angular/material` (limpieza de dependencia), continuar con la Fase 2.5 (almacenamiento Windows Server) o avanzar a las Fases 3-5 (UX, nuevas funcionalidades y calidad).
