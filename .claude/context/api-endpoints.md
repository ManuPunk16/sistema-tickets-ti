# Referencia de API Endpoints

Base URL: `https://tickets-ti-cj.vercel.app/api`

Todos los endpoints (excepto los indicados) requieren:
```
Authorization: Bearer {firebase_id_token}
Content-Type: application/json
```

---

## Auth

### POST /auth/verificar
Llamar después de cada login. Crea o recupera el perfil del usuario en MongoDB.

**Roles:** Público (requiere token Firebase válido)

**Response 200 — Usuario existente:**
```json
{
  "ok": true,
  "usuario": {
    "uid": "string",
    "email": "string",
    "displayName": "string",
    "role": "admin | support | user | pending | inactive",
    "department": "string | undefined",
    "position": "string | undefined",
    "lastLogin": "ISO date",
    "createdAt": "ISO date"
  },
  "esNuevo": false
}
```

**Response 200 — Usuario nuevo:**
```json
{
  "ok": true,
  "usuario": { ... },
  "esNuevo": true,
  "mensaje": "Cuenta creada. Pendiente de aprobación por un administrador."
}
```

**Response 403:**
```json
{ "error": "Cuenta desactivada. Contacte al administrador." }
// o
{ "error": "Cuenta pendiente de aprobación por un administrador." }
```

---

### GET /auth/perfil
Obtener el perfil del usuario autenticado.

**Roles:** Cualquier usuario activo

**Response 200:**
```json
{ "ok": true, "usuario": { ...UserProfile } }
```

---

## Tickets

### GET /tickets
Listar tickets con paginación y filtros.

**Roles:** Cualquier usuario activo (filtrando por propietario si es `user`)

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `pagina` | number | Página (default: 1) |
| `limite` | number | Por página (default: 25, max: 100) |
| `estado` | string | Filtrar por estado (solo admin/support) |
| `prioridad` | string | Filtrar por prioridad (solo admin/support) |
| `categoria` | string | Filtrar por categoría (solo admin/support) |
| `departamento` | string | Filtrar por departamento (solo admin/support) |
| `asignadoAUid` | string | Filtrar por técnico asignado (solo admin/support) |
| `todos` | `'true'` | Admin: ver todos sin filtro propio (solo admin) |

**Response 200:**
```json
{
  "ok": true,
  "datos": [ ...tickets sin comentarios/archivos/historial ],
  "total": 47,
  "pagina": 1,
  "limite": 25,
  "paginas": 2
}
```

---

### POST /tickets
Crear nuevo ticket.

**Roles:** Cualquier usuario activo (rate limit: 30 req/min)

**Body:**
```json
{
  "titulo": "string (requerido, max 200)",
  "descripcion": "string (requerido, max 5000)",
  "categoria": "hardware | software | red | accesos | correo | impresoras | telefonos | servidores | seguridad | otro",
  "departamento": "string (debe existir en colección departamentos)",
  "prioridad": "baja | media | alta | critica (opcional, default: media)",
  "etiquetas": ["string", ...] // opcional
}
```

**Response 201:**
```json
{ "ok": true, "ticket": { ...ITicket } }
```

**Response 400:**
```json
{ "ok": false, "error": "Campos requeridos: titulo, descripcion, categoria, departamento" }
```

---

### GET /tickets/:id
Obtener detalle completo (con comentarios, archivos, historial).

**Roles:** Cualquier activo (`user` solo puede ver los suyos)

**Nota:** Los comentarios con `esInterno: true` NO se devuelven a usuarios con role `user`.

**Response 200:**
```json
{
  "ok": true,
  "ticket": {
    ...ITicket,
    "comentarios": [ ...IComentario ],
    "archivos": [ ...IArchivo ],
    "historial": [ ...IHistorialEntrada ]
  }
}
```

---

### PUT /tickets/:id
Actualizar campos del ticket.

**Roles:** `admin` puede editar todo; `support` puede editar tickets asignados; `user` puede editar solo sus propios tickets en estado `nuevo`

---

### DELETE /tickets/:id
Eliminar ticket permanentemente.

**Roles:** Solo `admin`

---

### POST /tickets/:id/comentarios
Agregar comentario al ticket.

**Roles:** Cualquier usuario activo

**Body:**
```json
{
  "texto": "string (requerido, max 5000)",
  "esInterno": false
}
```
**Nota:** Solo `admin` y `support` pueden usar `esInterno: true`. Si un `user` lo intenta, se ignora el campo.

---

### PATCH /tickets/:id/asignar
Asignar o reasignar técnico al ticket.

**Roles:** `admin` o `support`

**Body:**
```json
{
  "uid": "string (uid del técnico o null para desasignar)",
  "nombre": "string (displayName del técnico)"
}
```

---

### PATCH /tickets/:id/estado
Cambiar estado del ticket siguiendo las transiciones válidas.

**Roles:** `admin` o `support`

**Body:**
```json
{
  "estado": "asignado | en_proceso | en_espera | resuelto | cerrado",
  "nota": "string (opcional, motivo del cambio)"
}
```

**Transiciones válidas:**
```
nuevo      → asignado, cerrado
asignado   → en_proceso, en_espera, cerrado
en_proceso → en_espera, resuelto, cerrado
en_espera  → en_proceso, cerrado
resuelto   → cerrado
cerrado    → (ninguna)
```

---

### POST /tickets/:id/satisfaccion
Calificación de satisfacción del usuario al resolver el ticket.

**Roles:** Solo el creador del ticket (role `user`)

**Body:**
```json
{ "satisfaccion": 1 | 2 | 3 | 4 | 5 }
```

---

## Usuarios

### GET /usuarios
Listar todos los usuarios con paginación.

**Roles:** Solo `admin`

**Query params:** `rol`, `pagina`, `limite`

**Response 200:**
```json
{
  "ok": true,
  "usuarios": [ ...IUsuario ],
  "total": 15,
  "pagina": 1,
  "limite": 50
}
```

---

### POST /usuarios
Crear usuario: Firebase Auth + MongoDB en un solo paso.

**Roles:** Solo `admin`

**Body:**
```json
{
  "email": "string (requerido)",
  "displayName": "string (requerido)",
  "password": "string (requerido, min 6 chars)",
  "role": "admin | support | user",
  "department": "string (opcional)",
  "position": "string (opcional)"
}
```

---

### GET /usuarios/:uid
Obtener detalle de usuario.

**Roles:** Solo `admin`

---

### PUT /usuarios/:uid
Actualizar datos del usuario (no contraseña).

**Roles:** Solo `admin`

---

### PATCH /usuarios/:uid/activar
Cambiar role de `inactive` o `pending` a `user`.

**Roles:** Solo `admin`

---

### PATCH /usuarios/:uid/desactivar
Cambiar role a `inactive`. Bloquea el acceso.

**Roles:** Solo `admin`

---

## Departamentos

### GET /departamentos
Listar departamentos.

**Roles:** Cualquier usuario activo (filtra solo activos por defecto)

**Query params:** `todos=true` (solo admin, muestra también inactivos)

---

### POST /departamentos
Crear departamento.

**Roles:** Solo `admin`

**Body:**
```json
{
  "nombre": "string (requerido, único)",
  "descripcion": "string (opcional)",
  "responsableUid": "string (opcional)"
}
```

---

### PUT /departamentos/:id
Actualizar departamento.

**Roles:** Solo `admin`

---

### DELETE /departamentos/:id
Eliminar / desactivar departamento.

**Roles:** Solo `admin`

---

## Reportes

### GET /reportes/resumen
KPIs globales del sistema.

**Roles:** `admin` o `support`

**Response 200:**
```json
{
  "ok": true,
  "resumen": {
    "total": 150,
    "abiertos": 45,
    "resueltos": 80,
    "cerrados": 25,
    "tiempoPromedioHoras": 12,
    "satisfaccionPromedio": 4.2
  },
  "porEstado": { "nuevo": 10, "asignado": 15, ... },
  "porPrioridad": { "baja": 30, "media": 80, ... },
  "porCategoria": { "software": 50, "hardware": 40, ... }
}
```

---

### GET /reportes/departamento
Métricas agrupadas por departamento.

**Roles:** `admin` o `support`

---

### GET /reportes/rendimiento
Métricas por técnico (asignados, resueltos, tiempo promedio).

**Roles:** `admin` o `support`

---

### GET /reportes/tendencia
Serie temporal de tickets creados/resueltos.

**Roles:** `admin` o `support`

**Query params:** `desde` (ISO date), `hasta` (ISO date), `intervalo` (`dia | semana | mes`)

---

## Códigos de Error Comunes

| Código | Descripción |
|---|---|
| 400 | Validación fallida o campos faltantes |
| 401 | Token no proporcionado o inválido/expirado |
| 403 | Rol insuficiente, cuenta pendiente o desactivada |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email duplicado, nombre duplicado) |
| 429 | Rate limit excedido |
| 500 | Error interno (mensaje genérico en producción) |
