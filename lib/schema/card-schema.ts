import schemaJson from '@/data/tarjeta.schema.json'

export const cardSchema = schemaJson

/** Versión compacta, pensada para incrustarse en los prompts de IA. */
export const promptSchemaSummary = `{
  "tarjetas": [
    {
      "tipo": "concepto | vocabulario | gramatica | cloze | alternativas | desafio_codigo",
      "categoria": "string (obligatorio)",
      "capa": "string opcional (ej. Auth, Base de datos, Storage, Edge Functions)",
      "etiquetas": ["string"],
      "pregunta": "string en markdown (obligatorio). En cloze, marca el hueco con ____",
      "respuesta": "string en markdown (obligatorio). En vocabulario: la traducción. En concepto: la explicación nivel SWE (profesional estándar)",
      "explicacion": "string opcional",
      "ejemplo": "string opcional",
      "escala": {                      // opcional, solo en tipo "concepto": otros niveles de lectura
        "nino": "string opcional — explicación para niños (ELI5)",
        "adulto": "string opcional — analogía para un adulto sin contexto técnico",
        "senior": "string opcional — cuidados y errores comunes, nivel senior",
        "practica": "string opcional — 2 a 4 ejercicios sugeridos para practicar"
      },
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
