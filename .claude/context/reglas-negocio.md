# Reglas de Negocio — Sistema de Tickets TI

## 1. Ciclo de Vida de un Ticket

### 1.1 Creación
- Cualquier usuario activo puede crear tickets
- El estado inicial es siempre `nuevo`
- La prioridad default es `media` si no se especifica
- La `fechaLimite` se calcula automáticamente: `ahora + SLA_HORAS[prioridad]`
- El departamento debe existir y estar activo en la colección
- El `numero` es autoincremental y único (se obtiene con `countDocuments() + 1`)
- El nombre del creador (`creadoPorNombre`) se desnormaliza al momento de crear

### 1.2 Transiciones de Estado
Solo `admin` y `support` pueden cambiar estados. Las únicas transiciones válidas son:

```
nuevo      → asignado   (al asignar un técnico)
nuevo      → cerrado    (rechazo inmediato)
asignado   → en_proceso (técnico comienza a trabajar)
asignado   → en_espera  (esperando información del usuario)
asignado   → cerrado    (sin resolución posible)
en_proceso → en_espera  (esperando algo externo)
en_proceso → resuelto   (problema solucionado) ← registra fechaResolucion y tiempoReal
en_proceso → cerrado    (cancelado)
en_espera  → en_proceso (se reanuda el trabajo)
en_espera  → cerrado    (sin resolución posible)
resuelto   → cerrado    (confirmación final)
cerrado    → (ninguna)  ← estado terminal
```

**Al pasar a `resuelto`:**
```typescript
fechaResolucion = new Date();
tiempoReal = Math.round((fechaResolucion - ticket.createdAt) / 60000); // minutos
```

### 1.3 Asignación
- Solo `admin` y `support` pueden asignar/reasignar tickets
- Al asignar, el estado cambia automáticamente de `nuevo` a `asignado` si estaba en `nuevo`
- Se puede desasignar estableciendo `uid: null`
- Cada cambio de asignación se registra en `historial`

---

## 2. Sistema de Comentarios

### 2.1 Comentarios Públicos (`esInterno: false`)
- Visibles para todos los roles con acceso al ticket
- El usuario solicitante puede ver estos comentarios en sus tickets
- Útil para comunicar el progreso o pedir información adicional

### 2.2 Comentarios Internos (`esInterno: true`)
- **SOLO visibles para `admin` y `support`**
- Si un usuario con role `user` solicita el detalle del ticket, estos comentarios se filtran en el backend
- Útil para notas de diagnóstico, información sensible de infraestructura
- Un `user` jamás puede crear un comentario interno (el campo se ignora si lo intenta)

---

## 3. Sistema de Satisfacción

- El cliente puede calificar el ticket del 1 al 5 después de que sea `resuelto`
- Solo el creador original del ticket puede calificar
- Solo se puede calificar una vez (si ya tiene `satisfaccion`, se rechaza)
- Contribuye al `satisfaccionPromedio` en reportes
- Solo aplica cuando el estado es `resuelto` (no `cerrado`)

---

## 4. Gestión de Usuarios

### 4.1 Nuevo Usuario (registro)
- Al registrarse por primera vez (email o Google), el rol es `pending`
- Un administrador debe manualmente cambiar el rol a `user`, `support` o `admin`
- Un usuario `pending` NO puede acceder a ninguna funcionalidad del sistema
- El backend responde 403 a cualquier petición de un `pending`

### 4.2 Dominios Permitidos de Correo
```
gmail.com
consejeria.campeche.gob.mx
hotmail.com
```
Usuarios con otros dominios son rechazados en el flujo de autenticación del frontend.

### 4.3 Desactivación
- Un admin puede desactivar cualquier usuario (role → `inactive`)
- Un usuario `inactive` recibe 403 en todos los endpoints
- El historial y tickets del usuario se conservan (no se eliminan)
- **Prevención de lockout:** NO desactivar al último administrador activo

### 4.4 Jerarquía de Permisos
```
admin > support > user > pending (sin acceso) > inactive (bloqueado)
```

---

## 5. SLA y Alertas de Tiempo

### 5.1 Tiempos de Respuesta
| Prioridad | SLA | Uso recomendado |
|---|---|---|
| `critica` | 2 horas | Servidor caído, pérdida de datos |
| `alta` | 8 horas | Servicio degradado, múltiples afectados |
| `media` | 24 horas | Problema funcional individual |
| `baja` | 72 horas | Mejora, solicitud sin urgencia |

### 5.2 Visualización de SLA en Frontend
- Verde: tiempo restante > 50% del SLA
- Amarillo: tiempo restante entre 20% y 50%
- Rojo: tiempo restante < 20% o vencido
- La `fechaLimite` ya viene calculada desde el backend

---

## 6. Departamentos

- Un ticket debe pertenecer a un departamento activo
- Si un departamento se desactiva, sus tickets existentes no se ven afectados
- Se puede reactivar un departamento desactivado
- El `responsableUid` es referencial (no FK con integridad referencial en MongoDB)

---

## 7. Archivos Adjuntos

- Se almacenan en Firebase Storage (no en MongoDB)
- Solo se guarda en MongoDB: nombre, URL de Storage, tipo MIME, tamaño
- Tamaño máximo por archivo: 5 MB
- Tipos permitidos: imágenes (`image/*`), PDF, texto plano
- La URL de Firebase Storage es firmada o pública según las reglas configuradas
- Al eliminar un ticket, los archivos de Storage NO se eliminan automáticamente (considerarlo en futuras mejoras)

---

## 8. Reportes y Métricas

### 8.1 Acceso
- Solo `admin` y `support` tienen acceso a reportes
- Los usuarios (`user`) solo ven sus propios tickets en el dashboard personal

### 8.2 Métricas Calculadas
- **Tiempo promedio de resolución:** `avg(tiempoReal)` en minutos, convertido a horas para mostrar
- **Satisfacción promedio:** `avg(satisfaccion)` ignorando nulls
- **Tasa de resolución:** `(resueltos + cerrados) / total * 100`
- **Tickets vencidos:** tickets con `fechaLimite < now` y estado no terminal

### 8.3 Filtros Disponibles
- Por rango de fechas (`createdAt`)
- Por departamento
- Por técnico asignado
- Por categoría
- Por prioridad

---

## 9. Privacidad y No Indexación

- El sistema es **completamente privado**. No debe ser indexado por motores de búsqueda.
- `robots.txt` debe contener `Disallow: /`
- El header `X-Robots-Tag: noindex, nofollow` debe estar en todas las respuestas
- No exponer datos de usuarios en respuestas públicas
- Los errores en producción NO deben revelar detalles internos del sistema

---

## 10. Rate Limiting

| Limitador | Máximo | Ventana | Aplicación |
|---|---|---|---|
| `limitadorGeneral` | 100 req | 1 minuto | Todas las rutas |
| `limitadorAuth` | 10 req | 1 minuto | POST /auth/* |
| `limitadorEscritura` | 30 req | 1 minuto | POST/PUT/PATCH |

**Comportamiento al superar límite:** HTTP 429 con mensaje indicando los segundos de espera.
