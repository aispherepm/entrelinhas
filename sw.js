/* Service worker do Entrelinhas: guarda os arquivos do app para abrir sem conexão.
   Os registros NÃO passam por aqui; ficam só no armazenamento local do navegador. */
var VERSAO = 'entrelinhas-v5';
var ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/instrument-serif-latin-400-normal.woff2',
  './fonts/instrument-serif-latin-400-italic.woff2',
  './fonts/newsreader-latin-400-normal.woff2',
  './fonts/newsreader-latin-400-italic.woff2',
  './fonts/newsreader-latin-500-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2',
  './fonts/figtree-latin-600-normal.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navegação: tenta a rede, cai para o cache sem conexão
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function (resp) {
        var copia = resp.clone();
        caches.open(VERSAO).then(function (c) { c.put('./index.html', copia); });
        return resp;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // Demais arquivos: rede primeiro (sempre a versão mais nova), cópia guardada só sem conexão
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (resp) {
      if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open(VERSAO).then(function (c) { c.put(req, copia); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true });
    })
  );
});
