# Agente: DevOps Engineer

> **Rol:** Eres el ingeniero de DevOps del Sistema de Tickets TI. Tu trabajo es garantizar deployments correctos en Vercel, configurar variables de entorno de forma segura, administrar Firebase y MongoDB Atlas, y mantener el sistema operativo dentro de los límites de los planes gratuitos.

---

## 🎯 Dominio de Conocimiento

- Vercel (deployments, Serverless Functions, dominios, variables de entorno)
- MongoDB Atlas M0 (gestión de acceso, índices, monitoreo)
- Firebase Console (**Solo Auth y Storage** — Firestore ya NO se usa como base de datos)
- Angular build optimization (`ng build --configuration production`)
- Diagnóstico de errores de cold start en Vercel Functions
- Control de versiones y branching con Git

---

## 🚀 Configuración de Vercel

### vercel.json (configuración actual)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/sistema-tickets-ti/browser",
  "framework": "angular",
  "installCommand": "npm install --include=dev",
  "functions": {
    "api/functions/api/index.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/functions/api/index.ts" },
    { "source": "/:path*", "destination": "/index.html" }
  ]
}
```

### Headers de Seguridad en vercel.json
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive, nosnippet" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive, nosnippet" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### Variables de Entorno en Vercel
Las siguientes variables DEBEN estar configuradas en Vercel Dashboard → Settings → Environment Variables con scope **Production** y **Preview**:

| Variable | Scope | Descripción |
|---|---|---|
| `MONGODB_URI` | Production, Preview | URI completa de MongoDB Atlas (incluye usuario, password, cluster) |
| `FIREBASE_PROJECT_ID` | Production, Preview | ID del proyecto Firebase |
| `FIREBASE_PRIVATE_KEY` | Production, Preview | Clave privada del service account (con `\n` como saltos de línea) |
| `FIREBASE_CLIENT_EMAIL` | Production, Preview | Email del service account |
| `NODE_ENV` | Production | Valor: `production` |

⚠️ **Importante con FIREBASE_PRIVATE_KEY:** En Vercel Dashboard, pegar la clave tal cual (con saltos de línea reales). El código ya hace `.replace(/\\n/g, '\n')` para compatibilidad.

---

## 🔧 Comandos de Build

### Build Completo (como lo hace Vercel)
```bash
# Desde la raíz del proyecto
npm run build
# Esto ejecuta: ng build --configuration production && cd api && npm install && npm run build
```

### Build Solo Frontend
```bash
ng build --configuration production
# Output en: dist/sistema-tickets-ti/browser/
```

### Verificar TypeScript de la API sin compilar
```bash
cd api && npm run build
# Ejecuta: tsc --noEmit (solo chequea tipos, no emite archivos)
```

### Desarrollo Local
```bash
npm run dev
# Ejecuta: concurrently "ng serve" "npm run dev --prefix ./api"
# Frontend: http://localhost:4200
# API: Vercel Dev en localhost (si se usa vercel dev)
```

---

## 📊 Límites del Plan Gratuito — Monitoreo

### Vercel Hobby (revisar mensualmente en vercel.com/[user]/[project]/analytics)
| Métrica | Límite | Alerta si supera |
|---|---|---|
| Bandwidth | 100 GB/mes | 80 GB |
| Serverless Invocations | 100,000/mes | 80,000 |
| Build Minutes | 100 min/mes | 80 min |
| Function Duration | 10 segundos | 8 segundos avg |

### MongoDB Atlas M0 (revisar en cloud.mongodb.com)
| Métrica | Límite | Acción si se acerca |
|---|---|---|
| Storage | 512 MB | Limpiar tickets cerrados > 1 año |
| Connections | 100 simultáneas | maxPoolSize ya configurado en 10 |
| Operations/seg | Sin límite estricto | Optimizar queries lentas con índices |

### Firebase Spark (revisar en console.firebase.google.com)
| Métrica | Límite | Acción |
|---|---|---|
| Storage (archivos adjuntos) | 1 GB | Limitar archivos a 2 MB, tipos: imagen/pdf/txt |
| Storage Download | 5 GB/mes | Monitorear |
| Auth | Sin límite práctico | — |

> **NOTA:** Firestore NO se usa como base de datos principal (migrado a MongoDB). Si hay reads/writes en Firestore en el dashboard, son réplica de servicios aún no migrados (deuda técnica).

---

## 🗄️ MongoDB Atlas — Índices Recomendados

```javascript
// Colección: tickets
db.tickets.createIndex({ "creadoPorUid": 1, "createdAt": -1 });
db.tickets.createIndex({ "estado": 1, "createdAt": -1 });
db.tickets.createIndex({ "asignadoAUid": 1, "estado": 1 });
db.tickets.createIndex({ "departamento": 1, "estado": 1 });
db.tickets.createIndex({ "prioridad": 1, "estado": 1 });
db.tickets.createIndex({ "numero": 1 }, { unique: true });

// Colección: usuarios
db.usuarios.createIndex({ "uid": 1 }, { unique: true });
db.usuarios.createIndex({ "email": 1 }, { unique: true });
db.usuarios.createIndex({ "role": 1 });

// Colección: departamentos
db.departamentos.createIndex({ "nombre": 1 }, { unique: true });
db.departamentos.createIndex({ "activo": 1 });
```

**NOTA:** En Atlas M0 hay máximo 3 índices por colección en el tier gratuito. Priorizar los más usados.

---

## 🔥 Firebase — Configuración

> **IMPORTANTE:** Firebase se usa SOLO para Auth y Storage de adjuntos. Firestore **NO** es la base de datos del sistema (migrado a MongoDB Atlas).

### Storage Rules (en Firebase Console → Storage → Rules)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tickets/{ticketId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*|application/pdf|text/plain');
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Auth (en Firebase Console → Authentication → Settings)
- **Authorized domains:** Asegurarse de incluir `tickets-ti-cj.vercel.app`
- **Sign-in providers:** Email/Password ✅ y Google ✅
- **Email templates:** Personalizar con nombre del sistema

---

## 🚦 Diagnóstico de Problemas Comunes

### Cold Start lento en API (>8s)
```
Causa: Primera invocación de Vercel Function inicializa Firebase + MongoDB
Solución:
1. Verificar que initializeFirebase() use el flag booleano (ya implementado)
2. Verificar que mongoose.connect() use maxPoolSize: 10, serverSelectionTimeoutMS: 5000
3. NO importar módulos pesados de forma dinámica en el handler
4. Considerar reducir dependencias en package.json de /api
```

### Error "App already initialized" (Firebase)
```
Causa: Vercel puede reutilizar el proceso entre invocaciones
Solución: Ya implementado con el guard 'firebaseInicializado' y verificación de admin.apps.length
```

### Error de conexión MongoDB (timeout)
```
Causa: serverSelectionTimeoutMS expira o conexión reiniciada
Verificar:
1. MONGODB_URI correcta en variables de entorno de Vercel
2. IP de Vercel en whitelist de Atlas (o 0.0.0.0/0 si no es posible)
3. maxPoolSize no haya llegado al límite de 100 conexiones de M0
```

### Build falla en Vercel
```
Verificar secuencialmente:
1. ng build --configuration production pasa local
2. cd api && tsc --noEmit pasa sin errores
3. Variables de entorno configuradas en Vercel
4. package-lock.json committeado
5. Node version es compatible (engines.node: "24.x" en api/package.json)
```

---

## 🌿 Flujo de Git y Deploy

```bash
# Desarrollo de nuevas funcionalidades
git checkout -b feat/nombre-del-feature

# Commits semánticos en español
git commit -m "feat(tickets): agregar filtro por etiquetas en listado"
git commit -m "fix(auth): corregir redirección en tokens expirados"
git commit -m "security(api): agregar X-Frame-Options: DENY en headers"

# Deploy a producción
git checkout master
git merge feat/nombre-del-feature
git push origin master
# Vercel detecta el push y hace deploy automático
```

### Ambientes
| Branch | Ambiente | URL |
|---|---|---|
| `master` | Production | https://tickets-ti-cj.vercel.app |
| Cualquier otro | Preview | https://tickets-ti-[hash].vercel.app |

---

## 🔗 Referencias
- [CLAUDE.md](../CLAUDE.md) — Instrucciones maestras
- [context/restricciones-plan.md](../context/restricciones-plan.md) — Límites detallados
- [vercel.json](../../vercel.json) — Configuración de deployment
