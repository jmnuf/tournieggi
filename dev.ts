// import path from 'node:path';
// import apiHandler from './api/index';

const PORT = 8080;
const VITE_PORT = 5173;

const controller = new AbortController();

Bun.spawn({
  cmd: ['bun', 'vite', '--port', VITE_PORT.toString(10)],
  cwd: __dirname,
  stdout: 'ignore',
  stderr: 'ignore',
  signal: controller.signal,
});

const VITE_URL_ORIGIN = `http://localhost:${VITE_PORT}`;

const server = Bun.serve({
  port: PORT,
  development: true,

  routes: {
    '/api/*': async (request: Request) => {
      const pathname = (new URL(request.url)).pathname;
      console.log('[INFO]', request.method, pathname);
      const response = await import('./api/index?t=' + Date.now()).then(m => m.default(request) as Promise<Response>)
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      return response;
    },
  },

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    console.log('[INFO]', request.method, pathname);
    const response = await fetch(VITE_URL_ORIGIN + pathname);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return response;
  },
});
console.log(`[INFO] Running api at port ${PORT}`);
console.log(`[INFO] Running vite app in ${VITE_URL_ORIGIN}/`);

process.on('beforeExit', async () => {
  await server.stop(true);
  controller.abort();
});
