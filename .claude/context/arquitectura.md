# Arquitectura — Sistema de Tickets TI

## Diagrama General

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser / Mobile)               │
│                                                                    │
│  Angular 21 SPA                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Auth Module  │  Tickets Module  │  Usuarios  │  Reportes│    │
│  │  Dashboard    │  Layout          │  Depto.    │  Config  │    │
│  └──────────────────────────────────────────────────────────┘    │
│       │ Firebase SDK (Auth)     │ HttpClient → /api/*             │
└───────┼─────────────────────────┼────────────────────────────────┘
        │                         │
        ▼                         ▼
┌──────────────┐         ┌─────────────────────────────────────┐
│  Firebase    │         │  Vercel Serverless Function          │
│  Auth        │         │  /api/functions/api/index.ts         │
│  (JWT ID     │         │                                       │
│   Tokens)    │         │  CORS → Rate Limit → Dispatch         │
│              │         │       │                               │
│  Storage     │         │  ┌────┴──────────────────────────┐   │
│  (Archivos   │         │  │ handlers:                      │   │
│   adjuntos)  │         │  │ auth | tickets | usuarios      │   │
│              │         │  │ departamentos | reportes       │   │
│  Firestore   │         │  └────────────────┬──────────────┘   │
│  (tiempo     │         │                   │                   │
│   real)      │         │  Firebase Admin   │  Mongoose         │
└──────────────┘         │  (verifica tokens)│  (queries)        │
         ▲               └───────────────────┼───────────────────┘
         │                                   │
         │                                   ▼
         │                          ┌──────────────────┐
         └──────────────────────────│  MongoDB Atlas   │
                                    │  M0 (512 MB)     │
                                    │                  │
                                    │  Collections:    │
                                    │  - tickets       │
                                    │  - usuarios      │
                                    │  - departamentos │
                                    └──────────────────┘
```

---

## Flujo de Autenticación Detallado

```
1. Usuario ingresa credenciales en Angular
        │
        ▼
2. Firebase Auth SDK (client-side)
   signInWithEmailAndPassword() o signInWithPopup()
        │
        ▼
3. Firebase emite ID Token (JWT) — válido 1 hora
        │
        ▼
4. Angular llama a POST /api/auth/verificar
   con header: Authorization: Bearer {idToken}
        │
        ▼
5. Firebase Admin SDK verifica el token
   admin.auth().verifyIdToken(token) → DecodedIdToken
        │
        ▼
6. MongoDB busca usuario por uid
   - Si no existe → crea con role='pending'
   - Si existe y role='inactive' → 403
   - Si existe y role='pending' → 403
   - Si existe y role activo → actualiza lastLogin
        │
        ▼
7. Backend responde con UserProfile (incluye role real de MongoDB)
        │
        ▼
8. Angular almacena perfil en AuthService.userProfileSubject
        │
        ▼
9. Guards verifican role para proteger rutas
   - authorized-user.guard: cualquier usuario activo
   - admin.guard: solo role='admin'
```

---

## Arquitectura del Backend (Entry Point Único)

```
/api/functions/api/index.ts
         │
         ├── Validar CORS (orígenes permitidos)
         ├── Aplicar rate limiting global (100 req/min)
         │
         ├── pathname.startsWith('/api/auth')         → authHandler
         ├── pathname.startsWith('/api/tickets')      → ticketsHandler
         ├── pathname.startsWith('/api/usuarios')     → usuariosHandler
         ├── pathname.startsWith('/api/departamentos')→ departamentosHandler
         └── pathname.startsWith('/api/reportes')     → reportesHandler
```

**Por qué un solo entry point:**
- Vercel Hobby permite solo funciones en `/api/**`
- Centraliza headers de seguridad y rate limiting
- Simplifica el `vercel.json`

---

## Modelo de Datos (Colecciones MongoDB)

### tickets
```
{
  numero: Number (autoincremental, único)  // TKT-001
  titulo: String (max 200)
  descripcion: String (max 5000)
  estado: 'nuevo' | 'asignado' | 'en_proceso' | 'en_espera' | 'resuelto' | 'cerrado'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: 'hardware' | 'software' | 'red' | 'accesos' | 'correo' | 'impresoras' | 'telefonos' | 'servidores' | 'seguridad' | 'otro'
  departamento: String (referencia por nombre)
  creadoPorUid: String (uid de Firebase)
  creadoPorNombre: String (desnormalizado para consultas rápidas)
  asignadoAUid?: String
  asignadoANombre?: String
  comentarios: IComentario[]
  archivos: IArchivo[]
  historial: IHistorialEntrada[]
  fechaLimite?: Date (calculada por SLA)
  fechaResolucion?: Date
  tiempoReal?: Number (minutos hasta resolución)
  satisfaccion?: 1|2|3|4|5
  etiquetas: String[]
  createdAt: Date
  updatedAt: Date
}
```

### usuarios
```
{
  uid: String (unique, Firebase UID)
  email: String (unique)
  displayName: String
  photoURL?: String
  role: 'admin' | 'support' | 'user' | 'pending' | 'inactive'
  department?: String
  position?: String
  authProvider: 'email' | 'google'
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}
```

### departamentos
```
{
  nombre: String (unique, trim)
  descripcion?: String
  responsableUid?: String
  activo: Boolean (default: true)
  createdAt: Date
  updatedAt: Date
}
```

---

## Decisiones de Diseño

### Por qué MongoDB como fuente de verdad (no Firestore)
- MongoDB Atlas M0 ofrece 512 MB y consultas complejas con agregaciones
- Firestore tiene límites de 50K lecturas/día en plan gratuito
- Las queries de reportes (aggregation pipeline) son más expresivas en MongoDB
- Firestore se usa solo como complemento para datos en tiempo real si es necesario

### Por qué Firebase Auth (no JWT propio)
- Gestión segura de tokens, refresh automático
- Google SSO integrado
- No requiere rotar secretos manualmente
- Admin SDK permite verificar tokens en el servidor sin exponer secrets al cliente

### Por qué Vercel Functions (no Express tradicional)
- Deploy automático, sin servidor que administrar
- Plan gratuito suficiente para el volumen esperado
- HTTPS automático
- Single entry point simplifica la arquitectura

### Por qué desnormalizar nombres (creadoPorNombre, asignadoANombre)
- MongoDB M0 no permite populate() eficiente con grandes colecciones
- Evita N+1 queries en listados de tickets
- Costo: actualizar nombre del usuario requiere actualizar tickets (raro)

---

## Configuración de Entorno

### Desarrollo Local
```
Frontend: http://localhost:4200 (ng serve)
API: Se puede usar vercel dev para simular Functions localmente
MongoDB: Misma URI de Atlas o MongoDB local
Firebase: Misma config de producción (no hay emuladores configurados)
```

### Producción
```
Frontend + API: https://tickets-ti-cj.vercel.app
MongoDB: MongoDB Atlas cluster (configurado en MONGODB_URI)
Firebase: Proyecto sistema-tickets-ti-cj
```
