export const CARD_TYPES = [
  'concepto',
  'vocabulario',
  'gramatica',
  'cloze',
  'alternativas',
  'desafio_codigo',
] as const
export type CardType = (typeof CARD_TYPES)[number]

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  concepto: 'Concepto',
  vocabulario: 'Vocabulario',
  gramatica: 'Gramática',
  cloze: 'Completar',
  alternativas: 'Alternativas',
  desafio_codigo: 'Desafío de código',
}

export const LENGUAS = ['en', 'fr'] as const
export type Lengua = (typeof LENGUAS)[number]
export const LENGUA_LABEL: Record<Lengua, string> = { en: 'Inglés', fr: 'Francés' }

export const DOMINIOS = ['conversacional', 'software', 'legal', 'finanzas', 'sostenibilidad'] as const
export type Dominio = (typeof DOMINIOS)[number]
export const DOMINIO_LABEL: Record<Dominio, string> = {
  conversacional: 'Conversacional',
  software: 'Software',
  legal: 'Legal',
  finanzas: 'Finanzas',
  sostenibilidad: 'Sostenibilidad',
}

export const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type Nivel = (typeof NIVELES)[number]

export const REGISTROS = ['formal', 'neutro', 'informal'] as const
export type Registro = (typeof REGISTROS)[number]

export const DIFICULTADES = ['basica', 'intermedia', 'avanzada'] as const
export type Dificultad = (typeof DIFICULTADES)[number]
export const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  basica: 'Básica',
  intermedia: 'Intermedia',
  avanzada: 'Avanzada',
}

export type Origen = 'manual' | 'ia'
export type Estado = 'borrador' | 'revisada'

export const SRS_STATES = ['nueva', 'aprendiendo', 'repaso', 'reaprendiendo'] as const
export type SrsStateName = (typeof SRS_STATES)[number]

export interface Srs {
  due: string
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: SrsStateName
  scheduled_days?: number
  learning_steps?: number
  last_review?: string
}

export interface IdiomaInfo {
  lengua: Lengua
  dominio: Dominio
  nivel: Nivel
  registro?: Registro
  falsos_amigos?: string[]
  audio?: boolean
}

export interface Card {
  id: string
  tipo: CardType
  categoria: string
  capa?: string
  etiquetas: string[]
  pregunta: string
  respuesta: string
  explicacion?: string
  ejemplo?: string
  opciones?: string[]
  correcta?: number | string
  idioma?: IdiomaInfo
  dificultad: Dificultad
  origen: Origen
  estado: Estado
  creada: string
  archivada?: boolean
  srs: Srs
}

export type Rating = 1 | 2 | 3 | 4
export const RATING_LABEL: Record<Rating, string> = {
  1: 'Otra vez',
  2: 'Difícil',
  3: 'Bien',
  4: 'Fácil',
}

export interface Review {
  id?: number
  cardId: string
  rating: Rating
  fecha: string
  duracionMs: number
  eraNueva: boolean
  estadoPrevio: SrsStateName
  categoria: string
}

export interface StudySession {
  id: 'actual'
  dia: string
  cola: string[]
  indice: number
  iniciada: string
  etiqueta?: string
}

export interface AppSettings {
  limiteNuevas: number
  objetivoMinutos: number
  categorias: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  limiteNuevas: 10,
  objetivoMinutos: 5,
  categorias: [],
}
