# Profesor GeCo

Web app de autoaprendizaje con tarjetas y repetición espaciada (FSRS), para interiorizar conceptos técnicos (Supabase, AWS, backend, etc.) e idiomas con ejercicios estilo Duolingo. Pensada para sesiones cortas (3 a 10 minutos), con biblioteca propia por persona, 100% en el navegador (IndexedDB), sin login ni backend.

## Estructura del repositorio

- `legacy/` — el HTML original de tarjetas (histórico, sin editar).
- `ui-v0/` — copia intacta del export de v0 (Vercel) que sirvió de base visual; no se edita, es solo referencia.
- `app/`, `components/`, `hooks/`, `lib/`, `public/` — la aplicación real (Next.js 16, App Router), que parte de `ui-v0/` y evoluciona en cada hito.
- `data/tarjeta.schema.json` — JSON Schema (draft-07) de validación de tarjetas.
- `data/tarjetas.ejemplo.json` — 8 tarjetas de ejemplo (3 técnicas, 3 de inglés técnico, 1 cloze, 1 desafío de código), para pruebas y demos.
- `data/tarjetas.json` — biblioteca inicial del autor (extraída y anonimizada del HTML legacy), se precarga en el primer arranque si la biblioteca está vacía.

## Stack

Next.js 16 (App Router) + React 19 + Tailwind 4, persistencia en IndexedDB vía Dexie detrás de una interfaz `TarjetasRepo` (`lib/tarjetas-repo.ts`), validación con Ajv, repetición espaciada con `ts-fsrs`. Export estático (`output: "export"` en `next.config.mjs`) para desplegar en Cloudflare Pages o Netlify. Gestor de paquetes: pnpm.

## Decisiones por defecto (documentadas, no se preguntaron por ser de bajo impacto)

- **Ruta de detalle de tarjeta**: `/biblioteca/detalle?id=...` en vez de `/biblioteca/[id]`. El export estático de Next exige conocer los parámetros de rutas dinámicas en tiempo de build; como los ids de tarjeta son datos de usuario (IndexedDB), se optó por una ruta estática que lee el id por query string.
- **Alcance de `TarjetasRepo`**: la interfaz (`get, list, upsert, delete, exportAll, importAll`) cubre solo la colección de tarjetas. El historial de repasos y la sesión en curso (`lib/session.ts`) siguen usando Dexie directo porque necesitan transacciones atómicas multi-tabla (tarjeta + repaso + sesión a la vez); no forman parte del contrato pensado para migrar a Supabase en fase 2.
- **`importAll` reemplaza la biblioteca completa** (no es un merge): primero limpia la tabla y luego inserta. Así "exportar e importar recupera exactamente el mismo estado" (criterio de aceptación B4) queda garantizado. La importación asistida por IA (pantalla "Crear con IA") no usa este método — ahí cada tarjeta se revisa y aprueba una por una con `upsert`.
- **Primer arranque**: si la biblioteca está vacía, `lib/bootstrap.ts` precarga `data/tarjetas.json` automáticamente (no requiere que el usuario haga clic en nada). La pantalla de biblioteca vacía (`components/today/onboarding.tsx`, ya existente en la base v0) queda como respaldo para cuando alguien borra toda su biblioteca y prefiere empezar de cero.
- **Se eliminó `@vercel/analytics`**: venía integrado en la base v0 pero es telemetría de terceros, lo que choca con "los datos no salen del navegador" (criterio de aceptación B4).
- **Pruebas**: Vitest (entorno `node`) + `fake-indexeddb` para las pruebas que tocan `TarjetasRepo`/Dexie. Alias `@/*` apuntando a la raíz del repo, igual que en `tsconfig.json`.

## Privacidad

Algunas tarjetas del HTML legacy citaban nombres reales de proyectos/clientes de GeCo y un incidente de producción con fecha real. Como este repositorio es público, esos nombres y la fecha se anonimizaron al extraer las tarjetas (ver Hito 1); el contenido técnico se mantuvo intacto.

## Desarrollo

```bash
pnpm install
pnpm dev      # servidor de desarrollo
pnpm test     # pruebas unitarias (Vitest)
pnpm build    # export estático en out/
```

## Despliegue

Pendiente de documentar en el Hito 5 (Cloudflare Pages y Netlify).
