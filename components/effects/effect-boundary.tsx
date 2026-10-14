'use client'

import { Component, type ReactNode } from 'react'

/**
 * Si un efecto visual falla al cargar (ej. un bloqueador de contenido corta el
 * chunk de tsParticles), la app sigue funcionando: no mostramos nada en vez de
 * una pantalla de error (A10).
 */
export class EffectBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    // Silencioso a propósito: un efecto decorativo que falla no es un error del usuario.
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}
