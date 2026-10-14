import { describe, expect, it } from 'vitest'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { cardSchema } from '@/lib/schema/card-schema'
import ejemplos from '@/data/tarjetas.ejemplo.json'

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
