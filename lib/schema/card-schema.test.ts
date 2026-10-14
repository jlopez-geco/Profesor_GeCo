import { describe, expect, it } from 'vitest'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { cardSchema } from '@/lib/schema/card-schema'
import ejemplos from '@/data/tarjetas.ejemplo.json'
import biblioteca from '@/data/tarjetas.json'

function compile() {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv.compile(cardSchema)
}

describe('tarjeta.schema.json', () => {
  it('valida las 8 tarjetas de ejemplo de A5', () => {
    const validate = compile()
    for (const card of ejemplos) {
      const ok = validate(card)
      expect(ok, JSON.stringify(validate.errors)).toBe(true)
    }
  })

  it('valida las 59 tarjetas de la biblioteca del autor (data/tarjetas.json)', () => {
    const validate = compile()
    for (const card of biblioteca) {
      const ok = validate(card)
      expect(ok, `${(card as { id: string }).id}: ${JSON.stringify(validate.errors)}`).toBe(true)
    }
  })

  it('acepta el campo "escala" opcional en tarjetas de concepto', () => {
    const validate = compile()
    const card = {
      tipo: 'concepto',
      categoria: 'Test',
      pregunta: '¿Qué es X?',
      respuesta: 'Es Y (nivel SWE)',
      escala: { nino: 'Para niños', adulto: 'Para adultos', senior: 'Cuidados', practica: 'Ejercicios' },
    }
    expect(validate(card), JSON.stringify(validate.errors)).toBe(true)
  })

  it('rechaza claves desconocidas dentro de "escala"', () => {
    const validate = compile()
    const card = {
      tipo: 'concepto',
      categoria: 'Test',
      pregunta: '¿Qué es X?',
      respuesta: 'Es Y',
      escala: { nivelInventado: 'x' },
    }
    expect(validate(card)).toBe(false)
  })

  it('exige opciones y correcta en tarjetas tipo alternativas', () => {
    const validate = compile()
    const card = {
      tipo: 'alternativas',
      categoria: 'Test',
      pregunta: '¿Cuál es?',
      respuesta: 'La A',
    }
    expect(validate(card)).toBe(false)
  })

  it('exige idioma en tarjetas de vocabulario', () => {
    const validate = compile()
    const card = {
      tipo: 'vocabulario',
      categoria: 'Inglés',
      pregunta: 'Hello',
      respuesta: 'Hola',
    }
    expect(validate(card)).toBe(false)
  })

  it('rechaza campos que no son parte del esquema', () => {
    const validate = compile()
    const card = {
      tipo: 'concepto',
      categoria: 'Test',
      pregunta: '¿Qué es X?',
      respuesta: 'Es Y',
      campoInventado: true,
    }
    expect(validate(card)).toBe(false)
  })

  it('rechaza un tipo fuera del enum', () => {
    const validate = compile()
    const card = {
      tipo: 'trivia',
      categoria: 'Test',
      pregunta: '¿Qué es X?',
      respuesta: 'Es Y',
    }
    expect(validate(card)).toBe(false)
  })
})
