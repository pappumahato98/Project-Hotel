// keep-alive.ts - Keeps the sandbox alive by periodically doing work
import { execSync } from 'child_process'

setInterval(() => {
  try {
    execSync('curl -s -o /dev/null http://localhost:3000/', { timeout: 5000 })
  } catch { /* ignore */ }
}, 10000)

// Keep the process alive
setInterval(() => {}, 60000)
