# Restricciones de Planes Gratuitos

> **CRÍTICO:** Todas las decisiones técnicas deben respetar estos límites. Si una funcionalidad los viola, debe rediseñarse.

---

## Vercel Hobby (Plan Gratuito)

### Límites Operativos
| Recurso | Límite | Estrategia |
|---|---|---|
| Bandwidth | 100 GB/mes | Comprimir assets, aprovechar caché del CDN Angular |
| Serverless Function Invocations | 100,000/mes | ~3,333/día, suficiente para uso interno |
| Build Minutes | 100 min/mes | Builds solo cuando sea necesario (no CI/CD continuo) |
| Function Timeout | **10 segundos máximo** | `serverSelectionTimeoutMS: 5000`, queries optimizadas |
| Function Memory | 1024 MB (configurado) | No procesar imágenes ni archivos en el servidor |
| Concurrent Executions | 1,000 | Sin problemas en uso interno |
| Deployments | Ilimitados | — |

### Restricciones de Funcionalidad
- ❌ No hay background jobs o cron jobs nativos
- ❌ No hay Edge Functions del plan Pro
- ❌ No hay Analytics avanzados nativos
- ❌ No hay protección contra DDoS avanzada
- ✅ HTTPS automático incluido
- ✅ CDN global incluido
- ✅ Dominios `.vercel.app` gratuitos

### Estrategias para Respetar el Límite de 10s
```typescript
// 1. MongoDB con timeout corto (ya configurado)
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // falla rápido si no hay conexión
  socketTimeoutMS: 5000,
  maxPoolSize: 10,
});

// 2. Proyecciones para reducir datos transferidos
Ticket.find(filtro).select('-comentarios -archivos -historial');

// 3. Promise.all para operaciones paralelas independientes
const [tickets, total] = await Promise.all([
  Ticket.find(filtro).skip(skip).limit(limite),
  Ticket.countDocuments(filtro),
]);

// 3. Paginación siempre (nunca cargar todos los documentos)
.limit(Math.min(100, limite))
```

---

## MongoDB Atlas M0 (Plan Gratuito)

### Límites de Almacenamiento
| Recurso | Límite | Estrategia |
|---|---|---|
| Storage total | **512 MB** | No guardar binarios, limpiar tickets viejos |
| Connections simultáneas | **100** | `maxPoolSize: 10` (ya configurado) |
| RAM compartida | No garantizada | Optimizar queries, no usar cursores amantenidos |
| Transferencia | Sin límite explícito | Proyecciones para reducir datos |

### Restricciones de Funcionalidad M0
- ❌ Sin Atlas Search (búsqueda full-text)
- ❌ Sin Atlas Triggers (webhooks automáticos)
- ❌ Sin sharding
- ❌ Sin change streams persistentes
- ❌ `$lookup` muy limitado y lento (evitar)
- ✅ Índices compuestos: hasta 3 por colección en M0
- ✅ Agregaciones simples ($group, $match, $sort, $project)
- ✅ Connexión desde Vercel (IP whitelist o 0.0.0.0/0)

### Estimación de Storage
```
Por ticket:
- Campos básicos: ~500 bytes
- Por comentario: ~300 bytes
- Por entrada de historial: ~200 bytes
- Metadata Mongoose: ~100 bytes

Estimado por ticket con 5 comentarios y 5 entradas de historial:
500 + (5 × 300) + (5 × 200) = 3,000 bytes ≈ 3 KB

Con 512 MB disponibles:
512 MB / 3 KB ≈ 170,000 tickets máximos

Para uso interno (< 1,000 tickets/mes), el límite no es problema en años.
```

### Estrategia de Limpieza
```
- Tickets cerrados con más de 1 año → migrar a un storage archive o exportar a JSON
- Considerar archivar (no eliminar) para mantener historial de auditoría
```

---

## Firebase Spark (Plan Gratuito)

### Firebase Auth
| Recurso | Límite | Notas |
|---|---|---|
| Usuarios | Ilimitado | Sin restricción práctica |
| Verificaciones de email | 100/día | Sin problema (uso interno) |
| Logins por teléfono | 100 SMS/mes | No usar SMS en este sistema |

### Firebase Storage
| Recurso | Límite | Estrategia |
|---|---|---|
| Almacenamiento | **1 GB** | Límite de 5MB/archivo, tipos restringidos |
| Transferencia | **5 GB/mes** | URLs directas de Storage (sin proxy) |
| Operaciones | 50K upload/día, 1M download/día | Sin problema para uso interno |

**Cálculo Storage:**
```
Si cada archivo adjunto pesa en promedio 1 MB:
1 GB / 1 MB = 1,000 archivos adjuntos máximos

Estrategia: alertar al admin cuando storage supere 800 MB
```

### Firebase Firestore
| Recurso | Límite | Estrategia |
|---|---|---|
| Lecturas | **50,000/día** | Minimizar listeners en tiempo real |
| Escrituras | **20,000/día** | Solo escribir lo necesario |
| Eliminaciones | 20,000/día | — |
| Storage | 1 GB | Usar MongoDB para datos principales |

**Recomendación:** Usar Firestore solo si se necesita actualización en tiempo real (notificaciones, chat de tickets). La fuente de verdad es MongoDB.

---

## Tabla de Decisión: ¿Dónde Guardar Qué?

| Tipo de Dato | Dónde | Razón |
|---|---|---|
| Tickets, usuarios, departamentos | MongoDB Atlas | Query compleja, source of truth |
| Archivos adjuntos (PDF, imágenes) | Firebase Storage | Diseñado para binarios |
| Autenticación | Firebase Auth | Seguridad, no gestionar passwords |
| Actualización en tiempo real | Firebase Firestore | Si se implementa en el futuro |
| Sesiones de usuario | Firebase Auth token | Auto-renovado, seguro |
| Variables de entorno | Vercel (server-side) | Nunca en código fuente |
| Assets estáticos (JS, CSS, img) | Vercel CDN | Automático con el build de Angular |

---

## Alertas de Proximidad a Límites

Cuando cualquiera de estos umbrales se supere, revisar y optimizar:

| Servicio | Métrica | Umbral de Revisión |
|---|---|---|
| Vercel | Invocaciones | >80,000/mes |
| Vercel | Bandwidth | >80 GB/mes |
| MongoDB | Storage | >400 MB |
| Firebase Storage | Almacenamiento | >800 MB |
| Firebase Storage | Transferencia | >4 GB/mes |
| Firebase Firestore | Lecturas | >40,000/día |
