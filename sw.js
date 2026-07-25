// Fairway Ledger — offline cache.
// Bump CACHE_NAME any time index.html (or anything else here) changes,
// so returning players get the update instead of a stale copy.
var CACHE_NAME = "fairway-ledger-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// pay.html gates a live payment link — it must always reflect the current
// server copy, so it's network-first (falls back to cache only if offline),
// never cached-forever like the app shell below.
function isPayPage(request){
  return request.url.indexOf("pay.html") !== -1;
}

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;

  if(isPayPage(event.request)){
    event.respondWith(
      fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first: once installed, the app itself never needs the network again.
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        if(event.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
