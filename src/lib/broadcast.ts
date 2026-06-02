export function broadcastEvent(event: string, data: unknown): void {
  try {
    fetch('http://localhost:3004/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => { /* silently ignore broadcast failures */ })
  } catch {
    /* silently ignore */
  }
}
