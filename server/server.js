import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import express from 'express';
// import vite from 'vite';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const app = express();

export async function createServer() {
  const resolve = (p) => path.resolve(root, p);

  let vite = await (
    await import('vite')
  ).createServer({
    root,
    logLevel: 'info',
    server: {
      middlewareMode: true,
      watch: {
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 100,
      },
      hmr: {
        port: undefined,
      },
    },
    appType: 'custom',
  });

  app.use((await import('compression')).default());
  app.use(
    (await import('serve-static')).default(resolve('dist/client'), {
      index: false,
    })
  );

  app.get('/ping', async (req, res) => {
    res.send({ message: 'pong' });
  });

  app.use('*', async (req, res) => {
    const url = '/';

    const template = fs.readFileSync(
      resolve('dist/client/index.html'),
      'utf-8'
    );
    const render = (await import('../dist/server/entry-server.js')).SSRRender;

    const appHtml = render(url); //Rendering component without any client side logic de-hydrated like a dry sponge
    const html = template.replace(`<!--app-html-->`, appHtml); //Replacing placeholder with SSR rendered components

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html); //Outputing final html
  });

  return { app, vite };
}

createServer().then(({ app }) =>
  app.listen(3033, () => {
    console.log('http://localhost:3033');
  })
);
