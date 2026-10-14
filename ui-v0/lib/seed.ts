import { db } from '@/lib/db'
import { emptySrs } from '@/lib/srs'
import type { Card } from '@/lib/types'

type SeedCard = Omit<Card, 'id' | 'origen' | 'estado' | 'creada' | 'srs' | 'dificultad'> & Partial<Pick<Card, 'dificultad'>>

const EJEMPLOS: SeedCard[] = [
  {
    tipo: 'concepto',
    categoria: 'Supabase',
    capa: 'Base de datos',
    etiquetas: ['rls', 'seguridad'],
    pregunta: '¿Qué es Row Level Security (RLS) en Supabase y por qué debe estar activo en tablas expuestas?',
    respuesta:
      'Es un mecanismo de Postgres que filtra **qué filas** puede leer o modificar cada usuario según políticas. Sin RLS, cualquier cliente con la `anon key` puede leer toda la tabla.',
    ejemplo: '```sql\nalter table notas enable row level security;\ncreate policy "propias" on notas\n  for select using (auth.uid() = user_id);\n```',
    dificultad: 'intermedia',
  },
  {
    tipo: 'concepto',
    categoria: 'AWS',
    capa: 'Storage',
    etiquetas: ['s3', 'seguridad'],
    pregunta: '¿Para qué sirve una URL prefirmada (presigned URL) de S3?',
    respuesta:
      'Da acceso **temporal** a un objeto privado (leer o subir) sin exponer credenciales. Expira en el tiempo que defines al firmarla.',
    explicacion: 'Útil para que el navegador suba archivos directo a S3 sin pasar por tu servidor.',
    dificultad: 'basica',
  },
  {
    tipo: 'alternativas',
    categoria: 'Backend',
    capa: 'Red',
    etiquetas: ['http', 'idempotencia'],
    pregunta: '¿Cuál de estos métodos HTTP **no** es idempotente?',
    respuesta: '`POST`: repetirlo puede crear varios recursos.',
    opciones: ['GET', 'PUT', 'DELETE', 'POST'],
    correcta: 3,
    explicacion: 'PUT y DELETE producen el mismo estado final aunque se repitan.',
    dificultad: 'basica',
  },
  {
    tipo: 'vocabulario',
    categoria: 'Inglés · Software',
    etiquetas: ['deploy'],
    pregunta: '**Rollback**',
    respuesta: 'Reversión (volver a una versión anterior)',
    ejemplo: 'We had to roll back the release after the error rate spiked.',
    explicacion: 'Sustantivo: *rollback*. Verbo: *to roll back* (separado). Registro neutro.',
    idioma: { lengua: 'en', dominio: 'software', nivel: 'B1', registro: 'neutro', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'vocabulario',
    categoria: 'Inglés · Legal',
    etiquetas: ['contratos'],
    pregunta: '**Liability**',
    respuesta: 'Responsabilidad (legal o financiera)',
    ejemplo: 'The Supplier’s total liability under this Agreement shall not exceed the fees paid.',
    explicacion: 'Muy frecuente en cláusulas de limitación de responsabilidad. Registro formal.',
    idioma: { lengua: 'en', dominio: 'legal', nivel: 'B2', registro: 'formal', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'vocabulario',
    categoria: 'Inglés · Finanzas',
    etiquetas: ['reportes'],
    pregunta: '**Actual (figures)**',
    respuesta: 'Cifras reales (lo efectivamente ocurrido)',
    ejemplo: 'Actuals came in 4% below budget for Q3.',
    explicacion: 'En reportes financieros se contrasta *actuals* con *budget* o *forecast*.',
    idioma: { lengua: 'en', dominio: 'finanzas', nivel: 'B2', registro: 'formal', falsos_amigos: ['actual ≠ actual (de ahora)'], audio: true },
  },
  {
    tipo: 'cloze',
    categoria: 'Supabase',
    capa: 'Edge Functions',
    etiquetas: ['deno'],
    pregunta: 'Las Edge Functions de Supabase se ejecutan sobre el runtime ____.',
    respuesta: 'Deno',
    correcta: 'Deno',
    explicacion: 'Se escriben en TypeScript y se despliegan con `supabase functions deploy`.',
    dificultad: 'basica',
  },
  {
    tipo: 'desafio_codigo',
    categoria: 'Backend',
    capa: 'Lógica',
    etiquetas: ['typescript', 'arrays'],
    pregunta:
      'Escribe una función `chunk<T>(arr: T[], size: number): T[][]` que divida un arreglo en grupos de `size` elementos.\n\n`chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]`',
    respuesta:
      '```ts\nfunction chunk<T>(arr: T[], size: number): T[][] {\n  const out: T[][] = []\n  for (let i = 0; i < arr.length; i += size) {\n    out.push(arr.slice(i, i + size))\n  }\n  return out\n}\n```',
    explicacion: 'Avanza de `size` en `size` y usa `slice`, que no muta el arreglo original. Valida `size > 0` en producción.',
    dificultad: 'intermedia',
  },
]

const FRANCES_A1: SeedCard[] = [
  {
    tipo: 'vocabulario',
    categoria: 'Francés · Conversacional',
    etiquetas: ['saludos'],
    pregunta: '**Enchanté(e)**',
    respuesta: 'Encantado(a) / Mucho gusto',
    ejemplo: 'Bonjour, je suis Camila. Enchantée !',
    explicacion: 'Se usa al conocer a alguien. Agrega una «e» si quien habla es mujer (se pronuncia igual).',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A1', registro: 'neutro', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'vocabulario',
    categoria: 'Francés · Conversacional',
    etiquetas: ['reuniones'],
    pregunta: '**Je ne comprends pas**',
    respuesta: 'No entiendo',
    ejemplo: 'Pardon, je ne comprends pas. Vous pouvez répéter ?',
    explicacion: 'Frase clave. En registro informal se acorta a «je comprends pas».',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A1', registro: 'neutro', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'vocabulario',
    categoria: 'Francés · Conversacional',
    etiquetas: ['trabajo'],
    pregunta: '**Une réunion**',
    respuesta: 'Una reunión',
    ejemplo: "J'ai une réunion à dix heures.",
    explicacion: 'Femenino: *une*. Verbo útil: *avoir une réunion*.',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A1', registro: 'neutro', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'cloze',
    categoria: 'Francés · Conversacional',
    etiquetas: ['presentarse'],
    pregunta: 'Je ____ ingénieure chez GeCo.',
    respuesta: 'suis (Soy ingeniera en GeCo.)',
    correcta: 'suis',
    explicacion: 'Verbo *être*: je suis, tu es, il/elle est.',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A1', registro: 'neutro', falsos_amigos: [], audio: true },
  },
  {
    tipo: 'vocabulario',
    categoria: 'Francés · Conversacional',
    etiquetas: ['falsos amigos'],
    pregunta: '**Actuellement**',
    respuesta: 'Actualmente, en este momento',
    ejemplo: 'Actuellement, je travaille sur un nouveau projet.',
    explicacion: 'Coincide con el español, a diferencia del inglés *actually*.',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A2', registro: 'neutro', falsos_amigos: ['actually (en) = en realidad'], audio: true },
  },
  {
    tipo: 'alternativas',
    categoria: 'Francés · Conversacional',
    etiquetas: ['cortesía'],
    pregunta: '¿Cómo pides algo **con cortesía** a un colega?',
    respuesta: '«Tu pourrais m’envoyer le fichier, s’il te plaît ?»',
    opciones: ['Envoie le fichier.', 'Tu pourrais m’envoyer le fichier, s’il te plaît ?', 'Le fichier, maintenant.', 'Je veux le fichier.'],
    correcta: 1,
    explicacion: 'El condicional (*pourrais*) suaviza la petición.',
    idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A2', registro: 'neutro', falsos_amigos: [], audio: true },
  },
]

function materialize(list: SeedCard[], offsetMs: number): Card[] {
  const base = Date.now() + offsetMs
  return list.map((c, i) => {
    const creada = new Date(base + i).toISOString()
    return {
      ...c,
      id: crypto.randomUUID(),
      dificultad: c.dificultad ?? 'intermedia',
      origen: 'manual',
      estado: 'revisada',
      creada,
      srs: emptySrs(new Date(base)),
    }
  })
}

export async function loadExamples({ frances }: { frances: boolean }) {
  const cards = materialize(EJEMPLOS, 0)
  if (frances) cards.push(...materialize(FRANCES_A1, 1000))
  await db.cards.bulkAdd(cards)
  return cards.length
}
