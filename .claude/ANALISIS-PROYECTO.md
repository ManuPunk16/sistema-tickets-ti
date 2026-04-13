# 📊 Análisis del Sistema de Tickets TI

> **Generado:** Análisis completo del estado actual, capacidades, limitaciones y roadmap de trabajo.  
> **Última actualización:** 10 de Abril de 2026 — Fase 1 (Estabilización) completada.  
> **Propósito:** Guía de referencia para tomar decisiones técnicas y de priorización.

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
- ✅ **COMPLETADO:** `ticket.service.ts` migrado a REST API (HttpClient) — eliminado Firestore

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
- ✅ Mobile-first design en los componentes ya migrados

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
| `config.service.ts` | ⚠️ Firestore | **Deuda técnica** — requiere crear endpoint `/api/configuracion` primero |

**Riesgo:** Si un administrador crea un departamento desde la pantalla (que llama a la API REST → MongoDB), y luego el usuario ve la lista (que lee de Firestore), el departamento no aparecerá. Los datos están duplicados en dos bases de datos que no se sincronizan.

#### 🟡 IMPORTANTE — Angular Material en componentes activos

| Componente | Módulos Material problemáticos |
|---|---|
| `ticket-list` | `MatTableDataSource`, `MatPaginator`, `MatSort` (12+ imports) |
| `ticket-form` | ✅ **MIGRADO** — Angular Material eliminado, Signals + Tailwind |
| `ticket-detail` | MatSnackBar, MatTabs, MatChips, MatMenu |
| `ticket-timeline` | `MatIconModule` |
| `ticket-comments-list` | `MatCard`, `MatIcon`, `MatDivider` |
| `department-list` | 13+ imports, template completo en `mat-*` |
| `department-form` | `MatFormField`, `MatSnackBar` |
| `performance-report` | `MatTableDataSource`, `MatPaginator`, `MatSort` |
| `system-settings` | `MatSnackBar`, `MatSlideToggle`, `MatTabs` |
| `login` | `MatSnackBar` vía constructor injection (patrón legacy) |

**Total:** ~9 componentes con Angular Material activo.  
**Impacto visual:** Inconsistencia entre los componentes ya migrados a Tailwind y los que usan Material.

#### 🟡 IMPORTANTE — Patrones legacy en componentes viejos
- `login.component.ts` usa constructor injection en lugar de `inject()`
- Varios componentes usan `@Input()`/`@Output()` en lugar de `input()`/`output()`
- Algunos componentes tienen `*ngIf`/`*ngFor` en lugar del control flow nativo
- No se usa `ChangeDetectionStrategy.OnPush` en componentes con Material

#### 🟢 MENOR — Calidad de código
- No hay suite de pruebas unitarias ni e2e
- Algunos errores que deberían mostrarse como toast al usuario se pierden silenciosamente
- No hay skeleton loaders; las pantallas en carga muestran blanco

---

## 💡 RECOMENDACIONES

### Recomendación #1 — Completar la migración de servicios ANTES que cualquier otra cosa
El riesgo de inconsistencia de datos entre Firestore y MongoDB es el problema más serio porque afecta la integridad del sistema. Un ticket creado desde la API no aparece en la lista porque la lista lee de Firestore. **Esto debe resolverse antes de usar el sistema en producción.**

Orden de migración: `department.service.ts` → `ticket.service.ts` → `report.service.ts`
- `department.service.ts` es el más sencillo (5 métodos CRUD)
- `ticket.service.ts` es el más complejo (queries con filtros, adjuntos de Storage)
- `report.service.ts` solo requiere llamar a los endpoints ya implementados

### Recomendación #2 — Crear un NotificacionService propio antes de migrar componentes
Antes de eliminar `MatSnackBar` de 9 componentes, crear un `NotificacionService` basado en Signals que lo reemplace en todos lados. Así la migración de Material es atómica por componente y no queda ninguno sin sistema de toast.

### Recomendación #3 — Migrar department-form y department-list primero (menor complejidad)
Son los componentes con menos lógica de negocio. Migrarlos primero establece el patrón Tailwind que luego se replica en los componentes de tickets.

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
| `config.service.ts` | ⏳ Pendiente | Requiere implementar endpoint `/api/configuracion` en backend primero |

**Criterio de éxito:** ✅ Ningún `import from '@angular/fire/firestore'` activo en servicios del frontend (excepto `config.service.ts`, documentado como deuda técnica pendiente de endpoint).

---

### Fase 2 — Limpieza de UI (Prioridad Alta) 🟠
> **Objetivo:** Cero dependencias de Angular Material; UI 100% Tailwind CSS

| Tarea | Dificultad | Componente |
|---|---|---|
| Crear `NotificacionService` personalizado (reemplaza MatSnackBar) | ✅ Hecho | Core |
| Migrar `department-form` | Baja | Departamentos |
| Migrar `department-list` | Media | Departamentos |
| Migrar `login.component` a Signals + inject() + Tailwind | ✅ Hecho | Auth |
| ~~Migrar `ticket-form`~~ | ✅ Hecho | Tickets |
| Migrar `ticket-list` (tabla, paginación, filtros) | ✅ Hecho | Tickets |
| Migrar `ticket-detail` y sub-componentes | Alta | Tickets |
| Migrar `performance-report` (tabla con paginación) | Media | Reportes |
| Migrar `system-settings` | Media | Configuración |
| Eliminar dependencia `@angular/material` del `package.json` | Baja | Build |

**Criterio de éxito:** `npm ls @angular/material` no muestra ningún paquete; toda la UI usa clases Tailwind.

---

### Fase 3 — Mejoras de UX (Prioridad Media) 🟡
> **Objetivo:** Experiencia de usuario más fluida y profesional

| Tarea | Dificultad |
|---|---|
| Skeleton loaders en listas (tickets, usuarios, departamentos) | Baja |
| Estado de carga por componente con spinner SVG personalizado | Baja |
| Páginas de error 404, 403, 500 con diseño Tailwind | Baja |
| `ErrorInterceptor` HTTP global (maneja 401/403/429/500) | Media |
| Animaciones de transición entre páginas | Media |
| Confirmación visual al realizar acciones destructivas (modal de confirmación) | Baja |

---

### Fase 4 — Nuevas Funcionalidades (Prioridad Normal) 🟢
> **Objetivo:** Funcionalidades que aumentan el valor del sistema

| Tarea | Dificultad | Notas |
|---|---|---|
| Notificaciones por email (Resend.com free tier) | Media | Ticket creado, asignado, resuelto |
| Exportar reportes a CSV (sin dependencias externas) | Baja | `Blob` + `URL.createObjectURL` |
| Búsqueda de tickets por texto en descripción | Baja | Con índice texto MongoDB |
| Filtro de rango de fechas en reportes | Media | |
| Vista de timeline por ticket (historial de cambios) | Media | Requiere guardar historial en BD |
| Indicador visual de SLA: verde/amarillo/rojo según tiempo restante | Baja | Computed signal |

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
| Servicios frontend | ✅ **100%** migrado (excepto `config.service.ts`) | Solo falta endpoint backend |
| Componentes UI | ⚠️ ~60% Tailwind | Eliminar Angular Material de ~8 componentes restantes |
| Modelos MongoDB | ✅ Completo | |
| Seguridad API | ✅ Completo | |
| Tests | ❌ 0% | Crear suite mínima |
| Notificaciones | ❌ No existe | Email + NotificacionService personalizado |
| Monitoreo | ❌ No existe | Error tracking |

**Conclusión:** El sistema tiene una base sólida y arquitectura correcta. Los problemas actuales son de migración incompleta, no de diseño. La prioridad absoluta es cerrar la brecha entre los dos almacenamientos de datos (Firestore vs MongoDB) antes de poner el sistema en producción real.
