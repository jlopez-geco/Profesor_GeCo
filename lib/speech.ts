import type { Lengua } from '@/lib/types'

const LOCALE: Record<Lengua, string> = { en: 'en-US', fr: 'fr-FR' }

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
}

export function speak(text: string, lengua: Lengua, rate = 0.95) {
  if (!canSpeak()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(stripMarkdown(text))
  utter.lang = LOCALE[lengua]
  utter.rate = rate
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lengua))
  if (voice) utter.voice = voice
  synth.speak(utter)
  return true
}
