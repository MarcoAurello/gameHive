// Guarda os arquivos do jogo para funcionar offline.
// Ao mudar qualquer arquivo do jogo, aumente a VERSAO para os aparelhos baixarem a nova.
const VERSAO = 'colmeia-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

// Apaga caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Fonte do Google: guarda na primeira vez para usar offline depois
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(VERSAO + '-fontes').then(async (cache) => {
        const salvo = await cache.match(e.request);
        if (salvo) return salvo;
        const resposta = await fetch(e.request);
        cache.put(e.request, resposta.clone());
        return resposta;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Arquivos do jogo: tenta a rede (versão mais nova) e cai para o cache offline
  e.respondWith(
    fetch(e.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO).then((cache) => cache.put(e.request, copia));
        return resposta;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
