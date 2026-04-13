# 📁 Almacenamiento de Archivos en Servidor Propio (Windows Server)

> **Fecha de análisis:** 13 de Abril de 2026  
> **Contexto:** El sistema actualmente usa Firebase Storage (plan Spark: 1 GB total / 5 GB descarga/mes). Se evalúa migrar a un servidor físico Windows Server propio para mayor control y almacenamiento ilimitado.

---

## 🔍 Situación Actual

| Aspecto | Estado actual |
|---|---|
| Proveedor | Firebase Storage (plan Spark gratuito) |
| Límite almacenamiento | **1 GB total** |
| Límite descarga | **5 GB / mes** |
| Formatos permitidos hoy | Todos (sin restricción real en validación) |
| Tamaño máximo actual | 10 MB por archivo (configurado en `FileUploadComponent`) |
| Archivos guardados como | URLs de Firebase Storage en campo `archivos[]` del ticket MongoDB |

---

## 📊 OPCIONES DISPONIBLES (Ordenadas por prioridad recomendada)

---

### 🥇 OPCIÓN 1 — Servicio de Carga Express.js en Windows Server (RECOMENDADA)

**¿Qué es?**  
Un API REST minimalista construido con Node.js/Express corriendo en el Windows Server como servicio de Windows (usando `pm2` o `node-windows`). Su única responsabilidad: recibir archivos, validarlos, comprimirlos si aplica, y guardarlos en una carpeta dedicada. Devuelve una URL de acceso al archivo guardado.

**Arquitectura:**
```
Angular Frontend
  → POST multipart/form-data a https://[IP-O-DOMINIO]:3001/upload
    → [Windows Server Express API]
      ✔ Valida token Firebase (Firebase Admin SDK)
      ✔ Valida tipo real del archivo (magic bytes, no solo extensión)
      ✔ Comprime imágenes JPG/PNG con `sharp` (calidad configurable)
      ✔ Guarda en carpeta dedicada (sin permisos de ejecución)
      ✔ Devuelve { url, nombre, tamanoOriginal, tamanoFinal }
  → Angular guarda la URL en MongoDB via Vercel API
```

**Formatos permitidos y compresión:**
| Formato | MIME type | Compresión |
|---|---|---|
| PDF | `application/pdf` | ❌ Sin compresión (ya comprimidos internamente) |
| DOC | `application/msword` | ❌ Sin compresión efectiva |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | ❌ (ya es ZIP internamente) |
| XLS | `application/vnd.ms-excel` | ❌ Sin compresión efectiva |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | ❌ (ya es ZIP internamente) |
| PPT | `application/vnd.ms-powerpoint` | ❌ Sin compresión efectiva |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | ❌ (ya es ZIP internamente) |
| JPG/JPEG | `image/jpeg` | ✅ `sharp` → calidad 80%, ahorro ~40-60% |
| PNG | `image/png` | ✅ `sharp` → convierte a WebP o comprime, ahorro ~30-50% |

> **Nota importante sobre documentos Office:** Los formatos DOCX, XLSX y PPTX son técnicamente archivos ZIP (Open XML). Intentar comprimirlos de nuevo con gzip/zlib da beneficio nulo o negativo (incluso aumentan tamaño). **La compresión real solo aplica y vale la pena en imágenes JPG/PNG.**

**Ventajas:**
- ✅ Sin límite de almacenamiento (solo disco físico)
- ✅ Sin costo adicional (hardware propio)
- ✅ Compresión automática de imágenes antes de guardar
- ✅ Mismo stack tecnológico (Node.js) que el backend de Vercel
- ✅ Acceso directo a los archivos para backup
- ✅ Validación por magic bytes (segura, ignora la extensión del archivo)
- ✅ Control total sobre retención, borrado y organización de carpetas

**Desventajas:**
- ⚠️ Requiere el servidor expuesto a internet (con HTTPS) o en la misma red LAN
- ⚠️ Es responsabilidad del equipo mantener el servicio activo (pm2 reinicio automático)
- ⚠️ Necesita certificado SSL (Let's Encrypt gratuito o autofirmado)
- ⚠️ Si el servidor se apaga, la carga de archivos falla (no aplica si es solo LAN)

**Paquetes Node.js necesarios:**
```json
{
  "multer": "^1.4.5",            // manejo de multipart/form-data
  "sharp": "^0.34.x",           // compresión de imágenes
  "file-type": "^19.x",         // detección de tipo real (magic bytes)
  "firebase-admin": "^13.x",    // verificación de tokens Firebase
  "express": "^5.x",            // HTTP server
  "cors": "^2.x",               // restricción de origen
  "helmet": "^8.x",             // headers de seguridad
  "express-rate-limit": "^7.x", // rate limiting
  "pm2": "^5.x"                 // gestor de proceso (global)
}
```

---

### 🥈 OPCIÓN 2 — MinIO en Windows Server (S3-compatible)

**¿Qué es?**  
MinIO es un servidor de objetos de código abierto 100% compatible con la API de Amazon S3. Corre como binario en Windows. Puede reemplazar Firebase Storage con mínimos cambios en el código Angular (`@aws-sdk/client-s3` en lugar del SDK de Firebase Storage).

**Ventajas:**
- ✅ API S3-compatible (industria estándar)
- ✅ Panel web de administración incluido
- ✅ Políticas de acceso tipo bucket (público/privado por carpeta)
- ✅ Soporta versioning y lifecycle (borrado automático de archivos viejos)
- ✅ Compresión transparente a nivel de almacenamiento (configurable)

**Desventajas:**
- ⚠️ Requiere ~512 MB RAM mínimo en Windows
- ⚠️ Más configuración inicial que Express
- ⚠️ Requiere migrar el SDK de Firebase Storage → `@aws-sdk/client-s3`
- ⚠️ La compresión de imágenes sigue requiriendo `sharp` antes del upload

**Cuándo preferirlo:** Si el volumen de archivos crece mucho y se necesita gestión avanzada (versioning, lifecycle, políticas por carpeta, panel admin visual).

---

### 🥉 OPCIÓN 3 — Solo limitar tamaño + mantener Firebase Storage

**¿Qué es?**  
No migrar de proveedor. Solo reforzar las validaciones en el `FileUploadComponent`: restringir formatos a los 9 tipos permitidos y bajar el límite a **5 MB por archivo** en lugar de 10 MB actuales.

**Ventajas:**
- ✅ Cero cambios en infraestructura
- ✅ Implementación en 1-2 horas
- ✅ Sin servidor que mantener

**Desventajas:**
- ❌ Sigue limitado a 1 GB de almacenamiento total (Firebase Spark)
- ❌ Las descargas se cuentan contra el límite de 5 GB/mes
- ❌ Sin compresión de imágenes

**Cuándo elegirla:** Si el volumen de archivos adjuntos es bajo (< 50 tickets/mes con adjuntos) y no se anticipan más de 200 MB de archivos acumulados.

---

### OPCIÓN 4 — IIS + WebDAV en Windows Server ❌ NO RECOMENDADA

WebDAV permite acceso a carpetas del servidor mediante HTTP, pero:
- Alto riesgo de seguridad si no está correctamente configurado
- No permite validación de tokens ni lógica de negocio
- Difícil de integrar con Angular de forma segura
- Mal soporte en navegadores modernos para subida de archivos

**No usar.**

---

## 🏆 DECISIÓN RECOMENDADA

**Opción 1 (Express.js en Windows Server)** por las siguientes razones en orden de importancia:

1. **Almacenamiento ilimitado** — no hay techo de 1 GB
2. **Compresión real de imágenes** — las imágenes JPG/PNG que adjuntan los usuarios son el tipo más pesado y el único que se puede comprimir de forma significativa
3. **Mismo stack** — el equipo ya conoce Node.js/Express (backend de Vercel usa el mismo patrón)
4. **Control total** — backup propio, organización de carpetas por fecha/ticket, ningún proveedor externo
5. **Seguridad integrada** — misma validación de tokens Firebase que usa el backend de Vercel

---

## 📋 INSTRUCTIVO — Información necesaria del Windows Server

Para implementar la Opción 1 se necesita la siguiente información del servidor:

### 🔧 Información básica del servidor

| Dato | Por qué se necesita | Ejemplo |
|---|---|---|
| **Versión de Windows Server** | Compatibilidad de Node.js y configuración de firewall | Windows Server 2019 / 2022 |
| **Arquitectura** | Descarga correcta de Node.js | x64 (casi siempre) |
| **RAM disponible** | Determinar límite de concurrencia de uploads | 4 GB, 8 GB, etc. |
| **Espacio en disco disponible** | Planificar capacidad | 500 GB, 1 TB, etc. |
| **¿Tiene Node.js instalado?** | Ahorrar paso de instalación | Sí/No + versión |

### 🌐 Información de red

| Dato | Por qué se necesita | Ejemplo |
|---|---|---|
| **IP interna del servidor** | Configurar la URL del servicio de archivos en Angular | `192.168.1.10` |
| **¿Tiene IP pública fija o dominio?** | Determinar si usuarios externos pueden cargar archivos | `mi-servidor.consejeria.gob.mx` |
| **¿El servidor está en la misma LAN que los usuarios?** | Si es solo intranet, se simplifica el SSL | Sí/No |
| **Puerto disponible** | El servicio de carga escuchará en este puerto | `3001` (recomendado) o `443` |
| **¿Puede abrir puertos en el firewall de Windows?** | Necesario para que Angular llegue al servidor | Sí/No |
| **¿Hay un router/switch con NAT entre internet y el servidor?** | Necesario para port-forwarding si es acceso externo | Sí/No |

### 🔒 Información de seguridad

| Dato | Por qué se necesita | Ejemplo |
|---|---|---|
| **¿Tiene certificado SSL/TLS?** | HTTPS es obligatorio para seguridad | Sí (corporativo) / No (usaremos autofirmado) |
| **¿Qué antivirus/EDR usa?** | Para configurar excepción en la carpeta de uploads | Windows Defender / otro |
| **¿Tiene Windows Firewall activo?** | Necesario crear regla de entrada en puerto elegido | Sí/No |
| **¿Bajo qué usuario de Windows corre las apps?** | Para permisos de escritura en la carpeta de archivos | LocalSystem / usuario de servicio |
| **¿Tiene IIS instalado?** | Para decidir si usar IIS como reverse proxy o puerto directo | Sí/No |

### 📂 Información de almacenamiento

| Dato | Por qué se necesita | Ejemplo |
|---|---|---|
| **¿En qué disco guardar los archivos?** | Separar del disco del SO es recomendable | `D:\`, `E:\` |
| **¿Nombre de la carpeta deseada?** | Ruta de destino de los uploads | `D:\tickets-adjuntos\` |
| **¿Hay cuota de disco para esta carpeta?** | Configurar umbral de alerta | Sin cuota / 100 GB |

---

## 🔒 Consideraciones de Seguridad — Checklist completo

### En el Windows Server

| # | Medida | Relevancia | Descripción |
|---|---|---|---|
| 1 | **HTTPS obligatorio** | 🔴 CRÍTICA | Todos los uploads deben ir cifrados. Sin HTTPS el token Firebase viaja en texto claro. Usar Let's Encrypt (gratuito) o certificado corporativo. |
| 2 | **Validar token Firebase en CADA request** | 🔴 CRÍTICA | El servicio Express debe verificar el Bearer token con Firebase Admin SDK antes de aceptar cualquier archivo. Sin esto cualquiera puede subir archivos. |
| 3 | **Validar tipo real (magic bytes)** | 🔴 CRÍTICA | No confiar en la extensión ni en el Content-Type del cliente. La librería `file-type` lee los primeros bytes del archivo para determinar su tipo real. Esto previene que alguien suba un `.exe` renombrado como `.pdf`. |
| 4 | **Carpeta sin permisos de ejecución** | 🔴 CRÍTICA | La carpeta `D:\tickets-adjuntos\` no debe tener permisos `Ejecutar` en Windows. Solo `Lectura` y `Escritura`. Si alguien logra subir un script, no podrá ejecutarlo. |
| 5 | **CORS restrictivo** | 🔴 CRÍTICA | Solo permitir requests de `https://tickets-ti-cj.vercel.app` y `http://localhost:4200`. Bloquear cualquier otro origen. |
| 6 | **Rate limiting** | 🟡 ALTA | Máximo 10 uploads por usuario por minuto. Previene abuso de almacenamiento. |
| 7 | **Tamaño máximo por archivo** | 🟡 ALTA | `multer` configurado con `limits: { fileSize: 10MB }`. No permitir archivos vacíos (mínimo 1 KB). |
| 8 | **Regla entrante en Windows Firewall** | 🟡 ALTA | Solo permitir conexiones en el puerto del servicio (ej: 3001) desde las IPs de los usuarios (o 0.0.0.0 si es internet). |
| 9 | **pm2 como gestor de proceso** | 🟡 ALTA | pm2 reinicia el servicio automáticamente si se cae. También permite reinicio al arrancar Windows. |
| 10 | **Nombres de archivo sanitizados** | 🟡 ALTA | Nunca guardar el archivo con el nombre original del usuario. Usar `UUID + extensión` para evitar path traversal y conflictos. |
| 11 | **Windows Defender excepción de carpeta** | 🟠 MEDIA | Agregar la carpeta de uploads a las exclusiones de Defender para evitar falsos positivos en archivos PDF/DOC legítimos, pero activar escaneo bajo demanda periódico. |
| 12 | **Logs de acceso** | 🟠 MEDIA | Registrar cada upload: quién subió, qué archivo, cuándo, tamaño. Útil para auditoría. Usar `winston` igual que en el backend de Vercel. |
| 13 | **Backups periódicos** | 🟠 MEDIA | Programar una tarea en el Programador de Tareas de Windows que copie la carpeta de uploads a una ubicación de backup diariamente. |
| 14 | **Separar disco del SO** | 🟢 BAJA | Los archivos adjuntos idealmente en un disco `D:\` diferente al sistema operativo `C:\`. Si el disco del SO se llena, el servidor no se cae. |
| 15 | **Reverse proxy con IIS (si ya está instalado)** | 🟢 BAJA | Si el servidor tiene IIS, usarlo como reverse proxy en puerto 443 apuntando al Node.js en 3001. Mejora la gestión del certificado SSL. |

### En el código Angular (Frontend)

| # | Medida | Estado actual | Acción |
|---|---|---|---|
| 1 | Validar extensión en cliente | ⚠️ Parcial | Agregar lista blanca de 9 extensiones en `FileUploadComponent` |
| 2 | Validar tamaño en cliente | ✅ Hay límite | Cambiar de 10 MB a **8 MB** (dar margen para overhead HTTP) |
| 3 | Mostrar vista previa de imágenes | ❌ No existe | Opcional pero recomendable para UX |
| 4 | Barra de progreso real | ❌ No existe | Usar `HttpClient` con `reportProgress: true` |

### En Vercel (Backend existente)

No hay cambio en el backend de Vercel. Las URLs de los archivos subidos al Windows Server simplemente se guardan como strings en el modelo `Ticket.archivos[]` en MongoDB, igual que las URLs de Firebase Storage hoy.

---

## 📐 Arquitectura con la integración

```
Angular Frontend
  ├── [auth/tickets/datos] → POST/GET → Vercel Function → MongoDB Atlas (sin cambio)
  │
  └── [archivos adjuntos]  → POST multipart → Windows Server Upload API
                                                  ├── Validar token Firebase
                                                  ├── Validar tipo (magic bytes)
                                                  ├── Comprimir imagen (sharp)
                                                  ├── Guardar en D:\tickets-adjuntos\{año}\{mes}\
                                                  └── Devolver { url: "https://srv/files/uuid.jpg" }
                                                  
                           ← GET (descargar archivo) ← Windows Server Static Files
```

---

## 🔢 Estimación de almacenamiento

Asumiendo uso real del sistema:

| Tipo de adjunto | Tamaño promedio (después de compresión) | Adjuntos/mes estimados | MB/mes |
|---|---|---|---|
| Imágenes JPG/PNG (capturas de pantalla) | ~200 KB (comprimido de ~800 KB) | 80 | ~16 MB |
| PDF (manuales, reportes) | ~500 KB | 30 | ~15 MB |
| DOCX/XLSX/PPTX | ~200 KB | 20 | ~4 MB |
| **Total/mes** | — | — | **~35 MB/mes** |

Con 1 TB de disco disponible, la capacidad es de aproximadamente **28 años** con este volumen de uso. Incluso con 50 GB disponibles, son más de 10 años.

---

## ⏭️ Pasos para implementar (una vez confirmada la información del servidor)

1. **Instalar Node.js LTS** en Windows Server (si no está)
2. **Instalar pm2** globalmente (`npm install -g pm2`)
3. **Crear el proyecto `upload-service`** (Express + multer + sharp + firebase-admin)
4. **Configurar `.env`** del servicio con: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `UPLOAD_DIR`, `PORT`, `ALLOWED_ORIGINS`
5. **Configurar regla de firewall** de Windows (entrada: TCP puerto elegido)
6. **Obtener certificado SSL** (Let's Encrypt con `win-acme` para Windows, gratuito)
7. **Actualizar `FileUploadComponent`** en Angular: cambiar endpoint de Firebase Storage → nuevo URL del servidor
8. **Actualizar `ticket.service.ts`**: cambiar lógica de subida a Firebase por llamada al nuevo endpoint
9. **Pruebas de carga y seguridad**
10. **Configurar backup** en Programador de Tareas de Windows
