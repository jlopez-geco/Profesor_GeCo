/** Carga canvas-confetti de forma diferida; solo se usa al completar la cola diaria (A10). */
export async function burstConfetti() {
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 35,
    origin: { y: 0.6 },
    colors: ['#022EBA', '#4F6EF7', '#A5B4FC', '#15211B'],
  })
}
