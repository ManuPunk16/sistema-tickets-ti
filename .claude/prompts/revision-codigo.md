# Prompt: Revisión de Código

> Usa este prompt para solicitar una revisión de calidad de código antes de hacer merge o deploy.

---

## Código a Revisar

**Archivos modificados:** []
**Feature/Bug que implementa:** []
**PR/Branch:** []

---

## Instrucciones para el Agente

Lee primero:
1. `.claude/CLAUDE.md` — Convenciones del proyecto
2. `.claude/agents/02-backend.md` — Si hay cambios en la API
3. `.claude/agents/03-frontend.md` — Si hay cambios en Angular
4. `.claude/agents/04-seguridad.md` — Checklist de seguridad básico

### Revisar:

#### Calidad de Código
- [ ] Sin `any` en TypeScript
- [ ] Tipos explícitos donde no son inferidos obviamente
- [ ] Sin `console.log` en código de producción
- [ ] Nombres en español para variables, funciones y comentarios
- [ ] No hay lógica de negocio en componentes Angular (pertenece a servicios)

#### Angular
- [ ] Componente standalone con `ChangeDetectionStrategy.OnPush`
- [ ] `input()` y `output()` (no decoradores `@Input`, `@Output`)
- [ ] Control flow nativo (sin `*ngIf`, `*ngFor`)
- [ ] Lazy loading para rutas nuevas
- [ ] Signals para estado local (no BehaviorSubject innecesarios)
- [ ] Mobile-first en estilos Tailwind

#### Backend
- [ ] Handler sigue el patrón establecido
- [ ] Verificación de rol antes de operar con datos
- [ ] Respuestas estandarizadas con `utils/respuestas.ts`
- [ ] Paginación en endpoints de listas
- [ ] Logging con `logRequest` y `logError`

#### Rendimiento
- [ ] Proyecciones en queries MongoDB (sin cargar campos pesados innecesariamente)
- [ ] Paginación con límite máximo de 100
- [ ] `Promise.all` para operaciones paralelas independientes
- [ ] Sin loops síncronos que procesen grandes volúmenes de datos

#### Seguridad (básico)
- [ ] No hay IDOR: usuarios `user` solo acceden a SUS recursos
- [ ] Inputs validados antes de persistir
- [ ] Sin datos sensibles en mensajes de error
