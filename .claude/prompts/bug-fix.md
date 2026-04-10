# Prompt: Corrección de Bug

> Usa este prompt cuando debas diagnosticar y corregir un error en el sistema.

---

## Descripción del Bug

**ID (opcional):** BUG-[]
**Módulo:** []
**Severidad:** [ crítica | alta | media | baja ]
**Roles afectados:** []

### Pasos para reproducir
1. 
2. 
3. 

### Resultado actual
[]

### Resultado esperado
[]

### Contexto adicional
```
Error de consola: []
Status HTTP: []
Body de respuesta: []
Dispositivo/Navegador: []
```

---

## Instrucciones para el Agente

Lee primero:
1. `.claude/CLAUDE.md` — Convenciones y arquitectura
2. `.claude/context/reglas-negocio.md` — Para entender el comportamiento esperado
3. `.claude/agents/02-backend.md` o `03-frontend.md` — Según el módulo afectado

### Proceso de Diagnóstico:
1. **Localizar el código** responsable del comportamiento
2. **Entender la causa raíz** (no solo el síntoma)
3. **Verificar el impacto** en otros módulos relacionados
4. **Proponer la solución mínima** que resuelva el problema sin refactorings innecesarios
5. **Verificar seguridad** del fix (que no introduzca vulnerabilidades)
6. **Documentar el cambio** en el historial

### Validaciones Post-Fix:
- [ ] El fix resuelve el comportamiento reportado
- [ ] No rompe otros flujos relacionados
- [ ] No introduce vulnerabilidades (IDOR, inyección, etc.)
- [ ] Los tipos TypeScript son correctos
- [ ] Sin `console.log` de debug en producción
- [ ] Mobile: verificar que el fix funciona en pantallas pequeñas
