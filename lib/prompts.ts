import { promptSchemaSummary } from '@/lib/schema/card-schema'
import {
  CARD_TYPE_LABEL,
  DIFICULTAD_LABEL,
  DOMINIO_LABEL,
  LENGUA_LABEL,
  type CardType,
  type Dificultad,
  type Dominio,
  type Lengua,
  type Nivel,
  type Registro,
} from '@/lib/types'

const RULES = `Reglas de salida:
- Responde SOLO con JSON válido, sin texto antes ni después y sin comentarios.
- Usa exactamente los nombres de campo del esquema (en español, sin tildes en las claves).
- No incluyas "id", "origen", "estado", "creada" ni "srs": la app los completa.
- Preguntas breves y concretas, una idea por tarjeta. Respuestas en markdown, idealmente de 1 a 4 líneas.
- Usa bloques de código markdown con lenguaje (\`\`\`sql, \`\`\`ts, etc.) cuando corresponda.`

const EXAMPLE_TECH = `{
  "tarjetas": [
    {
      "tipo": "concepto",
      "categoria": "Supabase",
      "capa": "Base de datos",
      "etiquetas": ["rls", "seguridad"],
      "pregunta": "¿Qué hace \`auth.uid()\` dentro de una política RLS?",
      "respuesta": "Devuelve el id del usuario autenticado que hace la consulta, para compararlo con la columna dueña de la fila.",
      "ejemplo": "\`\`\`sql\\ncreate policy \\"propias\\" on notas for select using (auth.uid() = user_id);\\n\`\`\`",
      "escala": {
        "nino": "Es como un gafete con tu nombre: la puerta solo te deja pasar a ti, aunque haya muchas puertas iguales.",
        "adulto": "Piensa en un casillero con muchas llaves iguales por fuera, pero que solo abre la del dueño.",
        "senior": "- auth.uid() es null si la consulta no viene autenticada: una política que solo compara con user_id sin manejar ese caso puede devolver de más o de menos según el rol.",
        "practica": "- Escribe una política que use auth.uid() y pruébala con dos usuarios distintos."
      },
      "dificultad": "intermedia"
    }
  ]
}`

const EXAMPLE_LANG = `{
  "tarjetas": [
    {
      "tipo": "vocabulario",
      "categoria": "Inglés · Legal",
      "etiquetas": ["contratos"],
      "pregunta": "**Indemnify**",
      "respuesta": "Indemnizar; mantener indemne",
      "ejemplo": "The Supplier shall indemnify the Client against any third-party claims.",
      "explicacion": "Registro formal, típico de cláusulas contractuales.",
      "idioma": { "lengua": "en", "dominio": "legal", "nivel": "B2", "registro": "formal", "falsos_amigos": [], "audio": true },
      "dificultad": "intermedia"
    }
  ]
}`

export interface TechPromptInput {
  tema: string
  categoria?: string
  capa?: string
  cantidad: number
  dificultad: Dificultad
  tipos: CardType[]
}

export function buildTechPrompt(i: TechPromptInput) {
  return `Eres un tutor técnico senior. Crea ${i.cantidad} tarjetas de estudio con repetición espaciada para un profesional que trabaja en Chile. Escribe en español (Chile), tono profesional y cercano; mantén en inglés los términos técnicos que se usan así en la industria.

Tema o contexto de trabajo:
"""
${i.tema.trim()}
"""

Requisitos:
- Categoría: ${i.categoria?.trim() ? `"${i.categoria.trim()}"` : 'elige una categoría breve y consistente (ej. "Supabase", "AWS", "Backend")'}.
${i.capa?.trim() ? `- Capa: "${i.capa.trim()}".` : '- Indica en "capa" la capa a la que pertenece cada concepto (ej. Auth, Base de datos, Storage, Edge Functions, Red, Observabilidad).'}
- Dificultad: ${DIFICULTAD_LABEL[i.dificultad].toLowerCase()} ("${i.dificultad}").
- Tipos permitidos: ${i.tipos.map((t) => `${t} (${CARD_TYPE_LABEL[t]})`).join(', ')}. Mézclalos.
- "alternativas": 4 opciones plausibles, "correcta" es el índice desde 0.
- "cloze": marca el hueco en "pregunta" con ____ y pon el texto exacto en "correcta".
- "desafio_codigo": un mini ejercicio de 3 a 10 minutos; en "respuesta" la solución en un bloque de código y en "explicacion" por qué funciona.
- "concepto": "respuesta" es la explicación nivel SWE (profesional estándar). Agrega además "escala" con "nino" (ELI5, una analogía simple de uso diario), "adulto" (una analogía más elaborada para quien no es técnico), "senior" (2 a 4 errores comunes o cuidados) y "practica" (2 a 4 ejercicios cortos para practicarlo). Si algún nivel no aporta, omítelo.
- Prioriza lo que se usa en el trabajo diario y los errores comunes.

${RULES}

Esquema:
${promptSchemaSummary}

Ejemplo de salida válida:
${EXAMPLE_TECH}`
}

export interface LangPromptInput {
  lengua: Lengua
  dominio: Dominio
  nivel: Nivel
  registro: Registro
  tema: string
  cantidad: number
}

export function buildLanguagePrompt(i: LangPromptInput) {
  const lang = LENGUA_LABEL[i.lengua].toLowerCase()
  const focus =
    i.dominio === 'conversacional'
      ? 'frases útiles para reuniones, correos breves y conversación de trabajo'
      : `terminología, colocaciones y registro formal propios de ${DOMINIO_LABEL[i.dominio].toLowerCase()} (contratos, informes, documentación técnica o reportes ESG según corresponda)`
  return `Eres profesor de ${lang} para hispanohablantes de Chile. Crea ${i.cantidad} tarjetas de ${lang}, nivel ${i.nivel}, dominio "${i.dominio}", registro ${i.registro}. Enfócate en ${focus}.
${i.tema.trim() ? `\nContexto del estudiante:\n"""\n${i.tema.trim()}\n"""\n` : ''}
Requisitos para cada tarjeta:
- "pregunta": el término o frase en ${lang} (en negrita si es una sola palabra).
- "respuesta": la traducción al español.
- "ejemplo": una oración en ${lang} en el contexto del dominio.
- "explicacion": nota de registro y uso (en español, 1 o 2 líneas).
- "idioma": { "lengua": "${i.lengua}", "dominio": "${i.dominio}", "nivel": "${i.nivel}", "registro": "${i.registro}", "falsos_amigos": [...], "audio": true }. Incluye falsos amigos solo si existen.
- "categoria": "${LENGUA_LABEL[i.lengua]} · ${DOMINIO_LABEL[i.dominio]}".
- Mezcla tipos: mayoría "vocabulario", algunas "cloze" (hueco ____ en la oración en ${lang}, "correcta" con la palabra exacta) y algunas "alternativas" (4 opciones, "correcta" índice desde 0). Toda tarjeta, de cualquier tipo, debe incluir el objeto "idioma".

${RULES}

Esquema:
${promptSchemaSummary}

Ejemplo de salida válida:
${EXAMPLE_LANG}`
}

export interface RecommenderInput {
  categorias: string[]
  conceptosExistentes: string[]
  intereses: string
  cantidad: number
}

export function buildRecommenderPrompt(i: RecommenderInput) {
  const existing = i.conceptosExistentes.slice(0, 150).map((q) => `- ${q.replace(/\s+/g, ' ').slice(0, 140)}`)
  return `Eres un mentor técnico senior. Recomienda ${i.cantidad} conceptos NUEVOS que esta persona todavía no tiene en su biblioteca y que le darían más valor en su trabajo. Entrégalos como tarjetas de estudio. Escribe en español (Chile).

Categorías que estudia: ${i.categorias.length ? i.categorias.join(', ') : 'sin categorías aún'}.
${i.intereses.trim() ? `Intereses y flujo de trabajo actual:\n"""\n${i.intereses.trim()}\n"""\n` : ''}
Conceptos que YA tiene (no los repitas ni hagas variantes):
${existing.length ? existing.join('\n') : '- (biblioteca vacía)'}

Criterios:
- Prioriza conceptos que conecten con lo que ya sabe (siguiente paso natural) y huecos frecuentes.
- Indica la "capa" de cada concepto (Auth, Base de datos, Storage, Edge Functions, Red, etc.).
- Mezcla "concepto", "alternativas" y al menos un "desafio_codigo".
- En "explicacion", agrega una línea: "Por qué ahora: ..." conectándolo con lo que ya estudia.

${RULES}

Esquema:
${promptSchemaSummary}

Ejemplo de salida válida:
${EXAMPLE_TECH}`
}
