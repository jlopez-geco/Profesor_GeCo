# Profesor GeCo

Web app de autoaprendizaje con tarjetas y repetición espaciada (FSRS), para interiorizar conceptos técnicos (Supabase, AWS, backend, etc.) e idiomas con ejercicios estilo Duolingo. Pensada para sesiones cortas (3 a 10 minutos), con biblioteca propia por persona, 100% en el navegador (IndexedDB), sin login ni backend.

## Estructura del repositorio

- `legacy/` — el HTML original de tarjetas (histórico, sin editar).
- `ui-v0/` — copia intacta del export de v0 (Vercel) que sirvió de base visual; no se edita, es solo referencia.
- `app/`, `components/`, `hooks/`, `lib/`, `public/` — la aplicación real (Next.js 16, App Router), que parte de `ui-v0/` y evoluciona en cada hito.
- `data/tarjeta.schema.json` — JSON Schema (draft-07) de validación de tarjetas.
- `data/tarjetas.ejemplo.json` — 8 tarjetas de ejemplo (3 técnicas, 3 de inglés técnico, 1 cloze, 1 desafío de código), para pruebas y demos.
- `data/tarjetas.json` — biblioteca inicial del autor (extraída y anonimizada del HTML legacy), se precarga en el primer arranque si la biblioteca está vacía.

## Pantallas

| Ruta | Pantalla |
|---|---|
| `/` | Hoy: repasos pendientes, racha, objetivo diario, resumen por categoría |
| `/estudiar` | Sesión de estudio (atajos: Espacio revela, 1-4 califica, Esc sale guardando) |
| `/biblioteca`, `/biblioteca/nueva`, `/biblioteca/detalle?id=` | Biblioteca: buscar, filtrar, editar, acciones masivas |
| `/crear` | Crear con IA: elegir tema → copiar prompt → pegar JSON |
| `/recomendador` | Recomendador de conceptos nuevos (prompt copiable) |
| `/idiomas` | Practicar por idioma, dominio y nivel |
| `/progreso` | Retención, dominio, calendario de repasos, tiempo estudiado |
| `/ajustes` | Tema, objetivo diario, categorías, efectos visuales, importar/exportar biblioteca |
| `/equipo` | Espacio reservado para mazos compartidos del equipo (fase 2, sin funcionalidad) |

## Stack

Next.js 16 (App Router) + React 19 + Tailwind 4, persistencia en IndexedDB vía Dexie detrás de una interfaz `TarjetasRepo` (`lib/tarjetas-repo.ts`), validación con Ajv, repetición espaciada con `ts-fsrs`. Efectos visuales opcionales con `@tsparticles/slim` + `@tsparticles/react`, `motion` y `canvas-confetti`. Export estático (`output: "export"` en `next.config.mjs`) para desplegar en Cloudflare Pages o Netlify. Gestor de paquetes: pnpm. Requiere Node 20 o superior.

## Decisiones por defecto (documentadas, no se preguntaron por ser de bajo impacto)

- **Ruta de detalle de tarjeta**: `/biblioteca/detalle?id=...` en vez de `/biblioteca/[id]`. El export estático de Next exige conocer los parámetros de rutas dinámicas en tiempo de build; como los ids de tarjeta son datos de usuario (IndexedDB), se optó por una ruta estática que lee el id por query string.
- **Alcance de `TarjetasRepo`**: la interfaz (`get, list, upsert, delete, exportAll, importAll`) cubre solo la colección de tarjetas. El historial de repasos y la sesión en curso (`lib/session.ts`) siguen usando Dexie directo porque necesitan transacciones atómicas multi-tabla (tarjeta + repaso + sesión a la vez); no forman parte del contrato pensado para migrar a Supabase en fase 2.
- **`importAll` reemplaza la biblioteca completa** (no es un merge): primero limpia la tabla y luego inserta. Así "exportar e importar recupera exactamente el mismo estado" (criterio de aceptación B4) queda garantizado. La importación asistida por IA (pantalla "Crear con IA") no usa este método — ahí cada tarjeta se revisa y aprueba una por una con `upsert`.
- **Primer arranque**: si la biblioteca está vacía, `lib/bootstrap.ts` precarga `data/tarjetas.json` automáticamente (no requiere que el usuario haga clic en nada). La pantalla de biblioteca vacía (`components/today/onboarding.tsx`, ya existente en la base v0) queda como respaldo para cuando alguien borra toda su biblioteca y prefiere empezar de cero.
- **Se eliminó `@vercel/analytics`**: venía integrado en la base v0 pero es telemetría de terceros, lo que choca con "los datos no salen del navegador" (criterio de aceptación B4).
- **Práctica por idioma/dominio/nivel** (`/idiomas`) reutiliza `buildQueue`/`startSession` con un filtro (`options.filter`) en vez de duplicar la lógica de cola.
- **PWA**: service worker (`public/sw.js`) con estrategia "red primero, caché de respaldo" sobre cualquier GET del mismo origen — no requiere listar a mano los archivos con hash de cada build. Los íconos del manifest reutilizan `icon.svg` (`sizes: "any"`) y el `apple-icon.png` de 180×180 ya existentes en la base v0; no se generaron íconos PNG de 192/512 nuevos por no contar con una herramienta de generación de imágenes en este entorno — si se quiere un ícono más prolijo en instaladores que no acepten SVG, conviene agregarlos más adelante.
- **Efectos visuales (A10)**: el interruptor en Ajustes y `prefers-reduced-motion` se combinan en `hooks/use-effects-enabled.ts`; ningún componente de `components/effects/` se monta si da `false`. tsParticles se carga de forma diferida (`next/dynamic`, `ssr:false`) y solo aparece en Hoy y en el resultado de sesión; se pausa al cambiar de pestaña. El confeti solo se dispara al terminar una sesión con al menos un repaso. Las transiciones de Motion (tarjeta de estudio, entrada de listas en Biblioteca) se omiten por completo (no solo se "saltan" con duración 0) cuando los efectos están desactivados.
- **Pruebas**: Vitest (entorno `node`) + `fake-indexeddb` para las pruebas que tocan `TarjetasRepo`/Dexie. Alias `@/*` apuntando a la raíz del repo, igual que en `tsconfig.json`.

## Privacidad

Algunas tarjetas del HTML legacy citaban nombres reales de proyectos/clientes de GeCo y un incidente de producción con fecha real. Como este repositorio es público, esos nombres y la fecha se anonimizaron al extraer las tarjetas (ver Hito 1); el contenido técnico se mantuvo intacto. Los datos de cada persona (tarjetas, progreso, ajustes) viven solo en el IndexedDB de su propio navegador — nada se envía a un servidor.

## Desarrollo

```bash
pnpm install
pnpm dev      # servidor de desarrollo
pnpm test     # pruebas unitarias (Vitest)
pnpm build    # export estático en out/
```

## Despliegue

El build (`pnpm build`) genera un sitio 100% estático en `out/`. No hay variables de entorno ni funciones de servidor que configurar.

### Cloudflare Pages

1. Conecta el repositorio en el dashboard de Cloudflare Pages (o usa `wrangler pages deploy out`).
2. Comando de build: `pnpm install && pnpm build`.
3. Directorio de salida: `out`.
4. Versión de Node: 20 o superior (variable de entorno `NODE_VERSION=20`).

### Netlify

1. Conecta el repositorio en Netlify, o usa `netlify deploy --dir=out`.
2. Comando de build: `pnpm install && pnpm build`.
3. Directorio de publicación: `out`.
4. Versión de Node: 20 o superior (`NODE_VERSION=20` en variables de entorno, o un archivo `.nvmrc` con `20`).

Ambos sirven archivos estáticos con rutas `trailingSlash` (`/biblioteca/`), ya configurado en `next.config.mjs`.
