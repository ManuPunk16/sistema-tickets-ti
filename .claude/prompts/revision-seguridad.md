# Prompt: Revisión de Seguridad

> Usa este prompt para solicitar una auditoría de seguridad de un módulo específico o de un cambio reciente.

---

## Alcance de la Revisión

**Módulo o archivo a revisar:** []
**Tipo de revisión:** [ audit completo | cambio específico | nuevo feature | endpoint nuevo ]
**Cambios recientes:** []

---

## Instrucciones para el Agente

Lee primero:
1. `.claude/agents/04-seguridad.md` — Checklist de auditoría completo
2. `.claude/context/reglas-negocio.md` — Para validar que la lógica de acceso es correcta
3. `.claude/context/arquitectura.md` — Para entender el flujo de datos

### Ejecutar el Checklist Completo de `.claude/agents/04-seguridad.md`:

Revisar específicamente:

#### Control de Acceso (A01)
- ¿Todos los endpoints del módulo verifican token antes de operar?
- ¿Un usuario `user` puede ver datos de otros usuarios?
- ¿Las transiciones de estado están restringidas correctamente?
- ¿Los comentarios internos se filtran para usuarios `user`?

#### Inyección (A03)
- ¿Los inputs se validan contra enums antes de persistir?
- ¿Hay interpolación de datos del usuario en queries de Mongo?
- ¿Angular escapa las interpolaciones o hay uso de `[innerHTML]` sin sanitizar?

#### Exposición de Datos (A02, A04)
- ¿Las respuestas de error revelan información interna en producción?
- ¿Se proyectan campos innecesarios en las respuestas de la API?
- ¿Las URLs de Firebase Storage son accesibles sin autenticación?

#### Configuración (A05)
- ¿Los headers de seguridad están presentes?
- ¿`X-Robots-Tag: noindex` está en las respuestas?
- ¿CORS solo permite los orígenes configurados?

### Formato del Reporte:

```markdown
## Reporte de Seguridad — [Módulo] — [Fecha]

### ✅ Sin Issues
- [lista de items que pasaron la revisión]

### ⚠️ Advertencias (no críticas, mejorar en próximo sprint)
- [descripción del issue]
  - Archivo: [path]
  - Línea: [aprox]
  - Riesgo: bajo/medio
  - Fix sugerido: [solución]

### 🚨 Críticos (resolver INMEDIATAMENTE antes de hacer deploy)
- [descripción del issue]
  - Archivo: [path]
  - Vulnerabilidad tipo: OWASP A0X
  - Impacto: [qué puede hacer un atacante]
  - Fix requerido: [solución específica]
```
