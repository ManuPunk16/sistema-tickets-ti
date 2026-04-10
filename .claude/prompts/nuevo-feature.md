# Prompt: Implementar Nuevo Feature

> Usa este prompt como base cuando debas implementar una nueva funcionalidad. Completa las secciones marcadas con [].

---

## Contexto del Feature

**Nombre del feature:** []
**Módulo afectado:** [ auth | tickets | usuarios | departamentos | reportes | shared ]
**Tipo de cambio:** [ nuevo endpoint | nuevo componente | mejora de UX | corrección de lógica ]
**Roles que lo usan:** [ admin | support | user | todos ]
**Prioridad:** [ crítica | alta | media | baja ]

---

## Descripción

[]

---

## Criterios de Aceptación

- [ ] 
- [ ] 
- [ ] 

---

## Instrucciones para el Agente

Lee primero:
1. `.claude/CLAUDE.md` — Instrucciones maestras y convenciones
2. `.claude/context/arquitectura.md` — Para entender el sistema
3. `.claude/context/reglas-negocio.md` — Para respetar la lógica existente
4. `.claude/agents/01-arquitecto.md` — Para el diseño de la solución
5. `.claude/agents/02-backend.md` — Si hay cambios en la API
6. `.claude/agents/03-frontend.md` — Si hay cambios en Angular

### Proceso a seguir:
1. **Diseñar primero:** Definir el contrato de API y el modelo de datos antes de codificar
2. **Backend primero:** Implementar y verificar el handler
3. **Frontend después:** Implementar el servicio y componente Angular
4. **Seguridad:** Verificar el checklist de `.claude/agents/04-seguridad.md`
5. **Restricciones:** Verificar que no viole los límites de `.claude/context/restricciones-plan.md`

### Reglas Obligatorias:
- Todo el código en español (variables, comentarios, mensajes)
- Componentes standalone con `ChangeDetectionStrategy.OnPush`
- Signals para estado local del componente
- `input()` y `output()` en lugar de decoradores
- Control flow nativo (`@if`, `@for`, `@switch`)
- Mobile-first con Tailwind
- Sin `any` en TypeScript
- Verificar token + rol en CADA endpoint nuevo
- Registrar cambios importantes en `ticket.historial`
- Usar `logRequest()` y `logError()` del servicio de logging

---

## Checklist Pre-Entrega

### Backend
- [ ] Handler implementado siguiendo el patrón establecido
- [ ] Verificación de rol correcta (verificarUsuarioActivo / soloAdmin / adminOSoporte)
- [ ] Validación de inputs antes de persistir
- [ ] Respuestas usando `utils/respuestas.ts` (ok, creado, error, etc.)
- [ ] `logRequest()` y `logError()` implementados
- [ ] Sin `console.log` hardcodeados
- [ ] Paginación implementada si el endpoint devuelve listas
- [ ] Nuevo handler registrado en `functions/api/index.ts`

### Frontend
- [ ] Componente es standalone
- [ ] Usa `ChangeDetectionStrategy.OnPush`
- [ ] Estado con signals (no BehaviorSubject para estado local)
- [ ] Inputs/outputs como funciones
- [ ] Control flow nativo (sin *ngIf, *ngFor)
- [ ] Mobile-first con Tailwind (diseñar para 320px primero)
- [ ] Loading state visible al usuario
- [ ] Error state con mensaje amigable
- [ ] Lazy loading si es una ruta nueva
- [ ] Guard correcto si la ruta tiene restricción de rol
- [ ] aria-labels en elementos interactivos

### Seguridad
- [ ] No expone datos de otros usuarios a rol `user`
- [ ] Comentarios internos filtrados para role `user`
- [ ] Sin datos sensibles en respuestas de error
- [ ] No se puede cambiar el propio rol
