// Persistent server launcher - spawns Next.js as a detached daemon
const { spawn } = require('child_process');
const fs = require('fs');

const LOG = '/home/z/my-project/dev.log';
const PID_FILE = '/home/z/my-project/.server.pid';

function start() {
  const logFd = fs.openSync(LOG, 'a');

  const child = spawn(
    'node',
    ['/home/z/my-project/node_modules/.bin/next', 'dev', '-p', '3000', '-H', '0.0.0.0', '--turbopack'],
    {
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
      detached: true,
    }
  );

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`Started server PID ${child.pid}`);
  process.exit(0);
}

// Check if already running
try {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
  process.kill(pid, 0);
  console.log(`Server already running as PID ${pid}`);
  process.exit(0);
} catch {
  start();
}