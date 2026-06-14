import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { lookup } from 'mime-types';

const PORT = 3000;
const ROOT = '/home/z/my-project/.next/server/app';

const server = createServer(async (req, res) => {
  try {
    // For API routes, we can't serve static files - return error
    if (req.url.startsWith('/api/') || req.url.startsWith('/_next/data')) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('API not available in static mode');
      return;
    }
    
    // Serve the static HTML
    let filePath = join(ROOT, req.url === '/' ? 'index.html' : req.url + '.html');
    try {
      const s = await stat(filePath);
      if (s.isFile()) {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
        return;
      }
    } catch {}
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + e.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server on port ${PORT}`);
});
