# Trama · demo de reservas de bienestar

Trama es un prototipo navegable de un marketplace que conecta clientes, profesionales de bienestar y gestores de salas o gimnasios. Permite recorrer búsquedas, reservas, agendas, perfiles por rol y conversaciones ficticias.

> **Es una demo local.** No hay cuentas reales, base de datos, pagos, reservas operativas, mensajes externos ni disponibilidad conectada a espacios reales. Los perfiles, importes, horarios, ubicaciones y métricas son datos de muestra.

## Documentación

La [documentación completa del proyecto](docs/DOCUMENTACION_COMPLETA_TRAMA.md) explica los roles y permisos, los recorridos de cada pantalla, las reglas de disponibilidad y precio, la agenda, el estado técnico, las limitaciones y las funcionalidades acordadas o pendientes para una plataforma operativa.

La [especificación funcional original](docs/Especificacion_funcional_plataforma_profesionales_clientes_espacios.docx) contiene el alcance de producto inicial, junto con propuestas y decisiones por resolver. Para conocer el comportamiento actual, consulta la documentación completa y el código.

## Requisitos y arranque

- Node.js 20.19 o posterior.
- pnpm.

```bash
pnpm install
pnpm dev
```

Vite muestra en la terminal la dirección local, normalmente `http://localhost:5173`. El servidor de desarrollo escucha también en la red local.

## Cuentas demo

Desde el perfil de la esquina superior derecha puedes entrar como cliente, profesional, gestor de espacio o cuenta con doble rol. No se necesita contraseña. El menú superior cambia según el rol y **Mensajes** aparece para cliente y profesional.

La persona visitante puede explorar servicios, profesionales y espacios. Para simular un pago debe iniciar sesión como cliente. El resultado de pago solo modifica el estado de la demo en ese navegador.

## Comandos disponibles

```bash
pnpm dev            # Desarrollo local
pnpm typecheck      # Comprobación de tipos
pnpm test           # Pruebas unitarias de dominio
pnpm test:coverage  # Pruebas con cobertura de módulos de dominio
pnpm build          # TypeScript y build de producción
```

Las pruebas actuales se centran en reglas y utilidades del dominio; no son pruebas end-to-end de una plataforma con backend.
