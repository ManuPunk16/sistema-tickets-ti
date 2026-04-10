# Sistema de Tickets TI — Instrucciones Maestras para Claude

> **IMPORTANTE:** Todas las respuestas, comentarios de código, nombres de variables y documentación deben estar en **ESPAÑOL**.

---

## 🎯 Propósito del Proyecto

**Sistema de Tickets TI** es una plataforma privada en la nube para gestionar todas las solicitudes y peticiones dirigidas al personal de Tecnologías de la Información (TI). Su objetivo es:

- **Auditar** y **validar** el trabajo del personal de TI con trazabilidad completa
- **Centralizar** solicitudes: hardware, software, red, accesos, correo, impresoras, teléfonos, servidores, seguridad
- **Controlar** cada solicitud con historial detallado, tiempos de respuesta (SLA) y satisfacción del usuario
- Ser **rápido, accesible y mobile-first** para el personal que reporta desde cualquier dispositivo

**Contexto de uso:** Sistema interno de la Consejería del Estado de Campeche. Acceso restringido a usuarios aprobados manualmente por un administrador. NO es público ni indexeable.

---

## 🏗️ Stack Tecnológico

### Frontend
| Tecnología | Versión | Notas |
|---|---|---|
| Angular | 21.x | Standalone components, Signals, Control Flow nativo |
| Tailwind CSS | 4.x | UI/UX principal — **CERO Angular Material** |
| Firebase SDK | 12.x | **Solo Auth y Storage** — `signIn`, `signOut`, `getIdToken`, adjuntos de tickets. Sin Firestore como BD |
| TypeScript | 5.9.x | Strict mode habilitado |

> **⚠️ RESTRICCIÓN CRÍTICA:** Angular Material está **PROHIBIDO** en este proyecto. Todo el UI/UX debe construirse con Tailwind CSS 4.x. No usar `mat-*` components, `MatModule`, ni `MatSnackBar`.

### Backend
| Tecnología | Versión | Notas |
|---|---|---|
| Vercel Functions | @vercel/node ^5 | Serverless, plan gratuito |
| Express | 5.x | Router HTTP |
| MongoDB / Mongoose | ^9.x | MongoDB Atlas M0 (gratuito) |
| Firebase Admin SDK | ^13.x | Verificación de tokens en servidor |
| Winston | ^3.x | Logging estructurado |
| Joi | ^18.x | Validación de schemas |

### Infraestructura
| Servicio | Plan | Límites a respetar |
|---|---|---|
| Vercel | Gratuito (Hobby) | 100GB bandwidth/mes, 100k invocaciones/mes, 10s timeout por función |
| MongoDB Atlas | M0 (gratuito) | 512 MB storage, 100 conexiones simultáneas, sin sharding |
| Firebase | Spark (gratuito) | Auth: sin límite práctico. Storage: 1 GB / 5 GB descarga/mes (adjuntos de tickets). Firestore: **no se usa** (migrado a MongoDB) |

> **🔄 ESTADO DE MIGRACIÓN:** Este proyecto fue migrado de Firebase (Firestore + Storage + Auth) a Vercel + MongoDB Atlas. Firebase **solo conserva Auth**. Los servicios `TicketService`, `ReportService` y `DepartmentService` aún leen de Firestore (deuda técnica — pendiente de migrar a la API REST).

---

## 📁 Estructura de Archivos

```
sistema-tickets-ti/
├── src/                          # Frontend Angular
│   └── app/
│       ├── core/
│       │   ├── enums/            # RolUsuario
│       │   ├── guards/           # AuthorizedUserGuard, adminGuard, authRedirectGuard
│       │   ├── interceptors/     # authInterceptor (adjunta Bearer token)
│       │   ├── models/           # Ticket, UserProfile, Department, Report
│       │   ├── services/         # auth, ticket, user, department, report, config
│       │   └── utils/            # platform.utils (detección mobile/iOS)
│       ├── layout/               # MainLayoutComponent (navbar + sidebar)
│       ├── modules/
│       │   ├── auth/             # Login, Register, ForgotPassword
│       │   ├── dashboard/        # Página principal con KPIs
│       │   ├── tickets/          # Lista, Detalle, Formulario + subcomponentes
│       │   ├── usuarios/         # Gestión de usuarios (solo admin)
│       │   ├── departamentos/    # CRUD departamentos (solo admin)
│       │   ├── reportes/         # Dashboard reportes, por depto, rendimiento
│       │   └── configuracion/    # Settings del sistema (solo admin)
│       └── shared/               # file-upload, navbar, sidebar
├── api/                          # Backend Vercel Functions (TypeScript)
│   ├── _lib/
│   │   ├── config/database.ts    # Conexión MongoDB con pool
│   │   ├── enums/index.ts        # ROL, ESTADO_TICKET, PRIORIDAD, CATEGORIA_TICKET, SLA_HORAS
│   │   ├── handlers/             # auth, tickets, usuarios, departamentos, reportes
│   │   ├── middleware/           # autenticacion, roles, rateLimiter
│   │   ├── models/               # Ticket, Usuario, Departamento (Mongoose)
│   │   └── utils/                # logger, respuestas
│   └── functions/api/index.ts   # Entry point único → router a handlers
├── .claude/                      # Este directorio — documentación LLM
└── vercel.json                   # Configuración de deployment
```

---

## 🔐 Arquitectura de Seguridad (CRÍTICO)

### Principios Fundamentales
1. **No confianza por defecto** — Todo endpoint verifica token Firebase antes de operar
2. **Roles en MongoDB, no en Firebase** — Firebase solo autentica; MongoDB es la fuente de verdad del rol
3. **Usuario Pending por defecto** — Nuevos registros quedan en estado `pending` hasta aprobación manual
4. **CORS restrictivo** — Solo `localhost:4200` y `tickets-ti-cj.vercel.app` permitidos
5. **Rate Limiting** — 100 req/min global, 10/min auth, 30/min escritura
6. **Sin indexación** — `robots.txt` con `Disallow: /`, `X-Robots-Tag: noindex, nofollow`
7. **No exponer credenciales** — Variables de entorno en Vercel, nunca en código

### Headers de Seguridad Requeridos (siempre mantener)
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control: no-store (para API)
```

### Flujo de Autenticación
```
Usuario → Firebase Auth (login) → ID Token → Angular Interceptor
→ API /auth/verificar → Firebase Admin (verifica token) → MongoDB (busca rol)
→ Responde con UserProfile (incluye rol real)
```

---

## 👥 Roles del Sistema

| Rol | Descripción | Permisos |
|---|---|---|
| `admin` | Administrador del sistema | Todo: usuarios, departamentos, reportes, asignaciones |
| `support` | Personal de TI | Ver/gestionar tickets asignados o sin asignar, reportes |
| `user` | Usuario solicitante | Crear tickets, ver solo sus propios tickets |
| `pending` | Recién registrado | Sin acceso hasta aprobación del admin |
| `inactive` | Desactivado | Bloqueado permanentemente |

---

## 🎫 Ciclo de Vida de un Ticket

```
NUEVO → ASIGNADO → EN_PROCESO → RESUELTO → CERRADO
              ↓         ↓
          EN_ESPERA ←→ EN_PROCESO
```

**SLA por prioridad:**
- `critica` → 2 horas
- `alta` → 8 horas
- `media` → 24 horas
- `baja` → 72 horas

---

## ⚠️ Restricciones del Plan Gratuito (NUNCA ignorar)

### Vercel Hobby
- Timeout máximo de función: **10 segundos** → usar `serverSelectionTimeoutMS: 5000`
- Sin background jobs ni cron jobs nativos
- Sin Workers Edge
- Deployment único por proyecto

### MongoDB Atlas M0
- **512 MB** máximo de storage → optimizar documentos, no guardar binarios
- **100 conexiones** simultáneas → usar connection pooling (`maxPoolSize: 10`)
- Sin agregaciones complejas con `$lookup` grandes
- Sin índices de texto completo (Atlas Search requiere M10+)

### Firebase Spark
- Storage: **1 GB** almacenamiento, **5 GB** de descarga/mes → limitar adjuntos a 5 MB por archivo
- Auth: sin límite práctico
- Firestore: **no se usa** — ignorar cualquier lectura/escritura residual (deuda técnica pendiente de eliminar)

---

## 🚫 Directivas NO Hacer

- ❌ Nunca usar `any` en TypeScript
- ❌ Nunca poner credenciales, API keys ni secrets en código fuente
- ❌ Nunca usar `*ngIf`, `*ngFor` (usar `@if`, `@for`)
- ❌ Nunca usar `@Input()`, `@Output()` decoradores (usar `input()`, `output()` funciones)
- ❌ Nunca usar módulos NgModule
- ❌ Nunca hacer `console.log` en producción (usar `logRequest`/`logError` de winston)
- ❌ Nunca omitir `ChangeDetectionStrategy.OnPush`
- ❌ Nunca exponer mensajes de error internos en producción
- ❌ Nunca hacer consultas a MongoDB sin índices en campos de filtro frecuente
- ❌ Nunca subir archivos > 5MB a Firebase Storage (fijarlo en el cliente)
- ❌ Nunca agregar meta tags `<meta name="robots">` que permitan indexación
- ❌ Nunca usar `window` directamente (verificar SSR-safety)
- ❌ **NUNCA** usar Angular Material (`mat-*`, `MatModule`, `MatSnackBar`, `MatDialog`, etc.)
- ❌ **NUNCA** usar `ngClass` ni `ngStyle` (usar class bindings directos de Tailwind)
- ❌ **NUNCA** leer datos desde Firestore en el frontend (Firestore solo fue la capa legada; ahora es REST API + MongoDB)
- ❌ **NUNCA** usar `MatTableDataSource`, `MatPaginator` ni `MatSort` (implementar con signals y Tailwind)

---

## ✅ Convenciones de Código

### Nomenclatura
- Variables, funciones, propiedades: **camelCase en español** (`obtenerTickets`, `estadoActual`)
- Clases, interfaces: **PascalCase** (`TicketService`, `ITicket`)
- Archivos: **kebab-case** (`ticket-list.component.ts`, `auth.handler.ts`)
- Constantes: **UPPER_SNAKE_CASE** (`ESTADO_TICKET`, `SLA_HORAS`)
- Rutas API: **kebab-case** (`/api/tickets/:id/comentarios`)

### Estructura de Respuesta API
```typescript
// Éxito
{ ok: true, datos: [...], total: N, pagina: N, limite: N, paginas: N }

// Error
{ ok: false, error: 'Mensaje legible en español' }
```

### Commits
```
feat(modulo): descripción en español
fix(modulo): descripción en español
docs(modulo): descripción en español
refactor(modulo): descripción en español
security(modulo): descripción en español
```

---

## 🤖 Equipo de Agentes Disponibles

Consulta `.claude/agents/` para activar el agente apropiado:

| Agente | Archivo | Cuándo usarlo |
|---|---|---|
| Arquitecto | `agents/01-arquitecto.md` | Diseño de nuevas funcionalidades, refactoring estructural |
| Backend Developer | `agents/02-backend.md` | Handlers, modelos, middleware, queries MongoDB |
| Frontend Developer | `agents/03-frontend.md` | Componentes Angular, signals, templates, rutas |
| Security Auditor | `agents/04-seguridad.md` | Revisión de seguridad, hardening, OWASP |
| QA Engineer | `agents/05-qa.md` | Tests, cobertura, casos edge, validaciones |
| DevOps Engineer | `agents/06-devops.md` | Vercel, Firebase, variables de entorno, deployments |

---

## 📚 Contexto de Referencia

- `.claude/context/arquitectura.md` — Arquitectura detallada del sistema
- `.claude/context/api-endpoints.md` — Referencia completa de endpoints
- `.claude/context/modelos-datos.md` — Schemas de MongoDB documentados
- `.claude/context/reglas-negocio.md` — Reglas y lógica del negocio
- `.claude/context/restricciones-plan.md` — Límites de planes gratuitos
