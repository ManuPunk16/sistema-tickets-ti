# Modelos de Datos — Sistema de Tickets TI

## Colección: tickets

### Campos Principales
| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `numero` | Number | Sí | Único, autoincremental. Formato legible: TKT-001 |
| `titulo` | String | Sí | trim, maxlength: 200 |
| `descripcion` | String | Sí | maxlength: 5000 |
| `estado` | String | Sí | enum: nuevo, asignado, en_proceso, en_espera, resuelto, cerrado |
| `prioridad` | String | Sí | enum: baja, media, alta, critica. Default: media |
| `categoria` | String | Sí | enum: hardware, software, red, accesos, correo, impresoras, telefonos, servidores, seguridad, otro |
| `departamento` | String | Sí | Nombre del departamento (desnormalizado) |
| `creadoPorUid` | String | Sí | uid de Firebase, indexed |
| `creadoPorNombre` | String | Sí | Desnormalizado para consultas rápidas |
| `asignadoAUid` | String | No | uid del técnico asignado |
| `asignadoANombre` | String | No | Desnormalizado |
| `fechaLimite` | Date | No | Calculado por SLA al crear |
| `fechaResolucion` | Date | No | Se establece al pasar a 'resuelto' |
| `tiempoReal` | Number | No | Minutos entre creación y resolución |
| `satisfaccion` | Number | No | Calificación 1-5, la da el solicitante |
| `etiquetas` | String[] | No | Tags libres para búsqueda |

### Sub-documento: IComentario
| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Autogenerado |
| `autorUid` | String | uid del autor |
| `autorNombre` | String | Nombre del autor |
| `texto` | String | max 5000 chars |
| `esInterno` | Boolean | Si true: solo visible para admin/support |
| `creadoEn` | Date | Fecha del comentario |

### Sub-documento: IArchivo
| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Autogenerado |
| `nombre` | String | Nombre del archivo |
| `url` | String | URL de Firebase Storage |
| `tipo` | String | MIME type (image/jpeg, application/pdf, etc.) |
| `tamanio` | Number | Tamaño en bytes (máx: 5MB = 5,242,880) |
| `creadoEn` | Date | Fecha de subida |

### Sub-documento: IHistorialEntrada
| Campo | Tipo | Descripción |
|---|---|---|
| `campo` | String | Campo que cambió (estado, prioridad, asignadoAUid, etc.) |
| `valorAntes` | String | Valor anterior |
| `valorDespues` | String | Valor nuevo |
| `cambiadoPor` | String | uid del usuario que realizó el cambio |
| `cambiadoEn` | Date | Timestamp del cambio |

---

## Colección: usuarios

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `uid` | String | Sí | Único, indexed. Corresponde al UID de Firebase Auth |
| `email` | String | Sí | Único |
| `displayName` | String | No | Default: '' |
| `photoURL` | String | No | URL de foto de perfil |
| `role` | String | Sí | enum: admin, support, user, pending, inactive. Default: pending |
| `department` | String | No | Nombre del departamento |
| `position` | String | No | Cargo o puesto |
| `authProvider` | String | Sí | enum: email, google |
| `lastLogin` | Date | No | Última vez que hizo login |
| `createdAt` / `updatedAt` | Date | Auto | Timestamps de Mongoose |

---

## Colección: departamentos

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `nombre` | String | Sí | Único, trim |
| `descripcion` | String | No | — |
| `responsableUid` | String | No | uid del responsable del departamento |
| `activo` | Boolean | Sí | Default: true |
| `createdAt` / `updatedAt` | Date | Auto | Timestamps de Mongoose |

---

## Enums y Constantes

### ROL (api/_lib/enums/index.ts)
```typescript
const ROL = {
  Admin:    'admin',
  Support:  'support',
  User:     'user',
  Pending:  'pending',
  Inactive: 'inactive',
}
```

### ESTADO_TICKET
```typescript
const ESTADO_TICKET = {
  Nuevo:      'nuevo',
  Asignado:   'asignado',
  EnProceso:  'en_proceso',
  EnEspera:   'en_espera',
  Resuelto:   'resuelto',
  Cerrado:    'cerrado',
}
```

### PRIORIDAD
```typescript
const PRIORIDAD = {
  Baja:    'baja',    // SLA: 72 horas
  Media:   'media',   // SLA: 24 horas
  Alta:    'alta',    // SLA: 8 horas
  Critica: 'critica', // SLA: 2 horas
}
```

### CATEGORIA_TICKET
```typescript
const CATEGORIA_TICKET = {
  Hardware:   'hardware',
  Software:   'software',
  Red:        'red',
  Accesos:    'accesos',
  Correo:     'correo',
  Impresoras: 'impresoras',
  Telefonos:  'telefonos',
  Servidores: 'servidores',
  Seguridad:  'seguridad',
  Otro:       'otro',
}
```

### SLA_HORAS (tiempo máximo de resolución)
```typescript
const SLA_HORAS = {
  baja:    72,
  media:   24,
  alta:    8,
  critica: 2,
}
```

---

## Índices en MongoDB

### Collection: tickets
```javascript
{ creadoPorUid: 1, createdAt: -1 }  // Tickets por usuario, más recientes primero
{ estado: 1, createdAt: -1 }        // Filtro por estado
{ asignadoAUid: 1, estado: 1 }      // Tickets asignados a técnico
{ departamento: 1, estado: 1 }      // Filtro por departamento
{ numero: 1 }                        // Lookup por número legible (único)
```

### Collection: usuarios
```javascript
{ uid: 1 }     // Lookup por UID de Firebase (único)
{ email: 1 }   // Verificación de duplicados (único)
{ role: 1 }    // Filtro por rol
```

### Collection: departamentos
```javascript
{ nombre: 1 }  // Lookup y unicidad (único)
{ activo: 1 }  // Filtro por activos
```

**NOTA Atlas M0:** Máximo 3 índices por colección. Priorizar los más críticos para queries frecuentes.
