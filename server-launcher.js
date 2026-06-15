const { spawn } = require('child_process');
const fs = require('fs');
const logFile = fs.openSync('/home/z/my-project/dev.log', 'a');

function start() {
  const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    stdio: ['ignore', logFile, logFile],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096', PORT: '3000' },
    cwd: '/home/z/my-project',
  });

  child.on('exit', (code) => {
    fs.writeSync(logFile, `\n[launcher] Server exited with code ${code}, restarting in 2s...\n`);
    setTimeout(start, 2000);
  });

  child.on('error', (err) => {
    fs.writeSync(logFile, `\n[launcher] Error: ${err.message}, restarting in 2s...\n`);
    setTimeout(start, 2000);
  });

  fs.writeSync(logFile, `[launcher] Started server PID ${child.pid}\n`);
}

start();