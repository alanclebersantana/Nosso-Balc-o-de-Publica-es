/* ==========================================================================
   Service Worker — cache do "app shell" para uso offline e instalação
   ========================================================================== */

const VERSAO_CACHE = "publicacoes-v7";

const ARQUIVOS_ESSENCIAIS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/temas.js",
  "./js/data.js",
  "./js/sync.js",
  "./js/export.js",
  "./js/app.js",
  "./js/firebase-config.js",
  "./js/lib/firebase/firebase-app-compat.js",
  "./js/lib/firebase/firebase-auth-compat.js",
  "./js/lib/firebase/firebase-firestore-compat.js",
  "./js/lib/jspdf.umd.min.js",
  "./js/lib/jspdf.plugin.autotable.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO_CACHE)
      .then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO_CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  const url = new URL(req.url);

  // Só cuidamos de requisições GET dentro da própria origem (app shell).
  // Chamadas ao Firebase/Firestore (outra origem) seguem direto pela rede.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegação (abrir/recarregar a página): tenta a rede primeiro, cai para
  // o cache se estiver offline — assim o app sempre abre, mesmo sem internet.
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          caches.open(VERSAO_CACHE).then((cache) => cache.put(req, resp.clone()));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Demais arquivos estáticos: cache primeiro, com atualização em segundo plano.
  evento.respondWith(
    caches.match(req).then((respostaCache) => {
      const buscaRede = fetch(req)
        .then((resp) => {
          if (resp && resp.ok) caches.open(VERSAO_CACHE).then((cache) => cache.put(req, resp.clone()));
          return resp;
        })
        .catch(() => respostaCache);
      return respostaCache || buscaRede;
    })
  );
});
