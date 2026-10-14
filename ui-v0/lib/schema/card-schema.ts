import { CARD_TYPES, DIFICULTADES, DOMINIOS, LENGUAS, NIVELES, REGISTROS, SRS_STATES } from '@/lib/types'

export const cardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://profesor-geco/schemas/tarjeta.json',
  title: 'Tarjeta de Profesor GeCo',
  type: 'object',
  required: ['tipo', 'categoria', 'pregunta', 'respuesta'],
  properties: {
    id: { type: 'string', minLength: 1 },
    tipo: { type: 'string', enum: [...CARD_TYPES] },
    categoria: { type: 'string', minLength: 1, maxLength: 80 },
    capa: { type: 'string', maxLength: 60 },
    etiquetas: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 40 }, maxItems: 20 },
    pregunta: { type: 'string', minLength: 1, maxLength: 4000 },
    respuesta: { type: 'string', minLength: 1, maxLength: 8000 },
    explicacion: { type: 'string', maxLength: 8000 },
    ejemplo: { type: 'string', maxLength: 4000 },
    opciones: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 2, maxItems: 6 },
    correcta: { oneOf: [{ type: 'integer', minimum: 0 }, { type: 'string', minLength: 1 }] },
    idioma: {
      type: 'object',
      required: ['lengua', 'dominio', 'nivel'],
      properties: {
        lengua: { type: 'string', enum: [...LENGUAS] },
        dominio: { type: 'string', enum: [...DOMINIOS] },
        nivel: { type: 'string', enum: [...NIVELES] },
        registro: { type: 'string', enum: [...REGISTROS] },
        falsos_amigos: { type: 'array', items: { type: 'string' } },
        audio: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    dificultad: { type: 'string', enum: [...DIFICULTADES] },
    origen: { type: 'string', enum: ['manual', 'ia'] },
    estado: { type: 'string', enum: ['borrador', 'revisada'] },
    creada: { type: 'string', format: 'date-time' },
    archivada: { type: 'boolean' },
    srs: {
      type: 'object',
      required: ['due', 'state'],
      properties: {
        due: { type: 'string', format: 'date-time' },
        stability: { type: 'number', minimum: 0 },
        difficulty: { type: 'number', minimum: 0 },
        reps: { type: 'integer', minimum: 0 },
        lapses: { type: 'integer', minimum: 0 },
        state: { type: 'string', enum: [...SRS_STATES] },
        scheduled_days: { type: 'number' },
        learning_steps: { type: 'number' },
        last_review: { type: 'string', format: 'date-time' },
      },
    },
  },
  additionalProperties: false,
  allOf: [
    {
      if: { properties: { tipo: { const: 'alternativas' } } },
      then: { required: ['opciones', 'correcta'] },
    },
    {
      if: { properties: { tipo: { enum: ['vocabulario', 'gramatica'] } } },
      then: { required: ['idioma'] },
    },
  ],
} as const

/** Versión compacta, pensada para incrustarse en los prompts de IA. */
export const promptSchemaSummary = `{
  "tarjetas": [
    {
      "tipo": "concepto | vocabulario | gramatica | cloze | alternativas | desafio_codigo",
      "categoria": "string (obligatorio)",
      "capa": "string opcional (ej. Auth, Base de datos, Storage, Edge Functions)",
      "etiquetas": ["string"],
      "pregunta": "string en markdown (obligatorio). En cloze, marca el hueco con ____",
      "respuesta": "string en markdown (obligatorio). En vocabulario: la traducción",
      "explicacion": "string opcional",
      "ejemplo": "string opcional",
      "opciones": ["string"],          // solo alternativas, 2 a 6
      "correcta": 0,                   // alternativas: índice (desde 0); cloze: texto exacto del hueco
      "idioma": {                      // obligatorio en vocabulario y gramatica
        "lengua": "en | fr",
        "dominio": "conversacional | software | legal | finanzas | sostenibilidad",
        "nivel": "A1 | A2 | B1 | B2 | C1",
        "registro": "formal | neutro | informal",
        "falsos_amigos": ["string"],
        "audio": true
      },
      "dificultad": "basica | intermedia | avanzada"
    }
  ]
}`
