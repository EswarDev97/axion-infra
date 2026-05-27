# Performance — Deep Reference

## Image Optimization

```html
<!-- Responsive image with modern formats -->
<picture>
  <source type="image/avif" srcset="hero-400.avif 400w, hero-800.avif 800w">
  <source type="image/webp" srcset="hero-400.webp 400w, hero-800.webp 800w">
  <img src="hero-800.jpg" srcset="hero-400.jpg 400w, hero-800.jpg 800w"
       sizes="(max-width: 600px) 100vw, 800px"
       width="800" height="450" alt="Hero image" loading="lazy">
</picture>

<!-- Eager-load hero (above fold, do NOT lazy-load) -->
<img src="hero.webp" width="1200" height="630" alt="..." loading="eager" fetchpriority="high">
```

## Font Optimization

```html
<!-- Preconnect to font origin -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload critical font file -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;   /* show fallback immediately, swap when loaded */
  font-weight: 100 900; /* variable font range */
}
```

## JavaScript Splitting

```js
// Dynamic import — code splits automatically in Webpack/Vite/Rollup
const { heavyModule } = await import('./heavy-module.js');

// React lazy loading
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Load on interaction (facade pattern)
button.addEventListener('click', async () => {
  const { initChat } = await import('./chat-widget.js');
  initChat();
}, { once: true });
```

## Critical CSS Inlining

```html
<head>
  <!-- Inline only above-fold CSS (< 14KB) -->
  <style>/* critical styles */</style>

  <!-- Load rest asynchronously -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

## Third-Party Script Facades

```html
<!-- YouTube facade — only load player on click -->
<div class="youtube-facade" data-video-id="abc123" style="aspect-ratio:16/9">
  <img src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="Video thumbnail" loading="lazy">
  <button aria-label="Play video">▶</button>
</div>

<script>
document.querySelector('.youtube-facade button').addEventListener('click', () => {
  const id = document.querySelector('.youtube-facade').dataset.videoId;
  document.querySelector('.youtube-facade').innerHTML =
    `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" ...></iframe>`;
});
</script>
```

## Runtime Performance

```js
// Avoid layout thrashing — batch reads then writes
// BAD
elements.forEach(el => el.style.width = el.offsetWidth + 10 + 'px');

// GOOD
const widths = elements.map(el => el.offsetWidth); // batch read
elements.forEach((el, i) => el.style.width = widths[i] + 10 + 'px'); // batch write

// Debounce resize/scroll
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
window.addEventListener('resize', debounce(handleResize, 150), { passive: true });

// Animation — only transform/opacity
el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }],
  { duration: 300, easing: 'ease-out', fill: 'forwards' });
```

## Service Worker Caching

```js
// Cache-first for static assets, network-first for HTML
self.addEventListener('fetch', (event) => {
  const isHTML = event.request.headers.get('accept').includes('text/html');
  event.respondWith(
    isHTML
      ? fetch(event.request).catch(() => caches.match('/offline.html'))
      : caches.match(event.request).then(r => r || fetch(event.request))
  );
});
```

## Performance Budget Enforcement (Lighthouse CI)

```json
{
  "ci": {
    "assert": {
      "budgets": [{
        "resourceSizes": [
          { "resourceType": "script", "budget": 300 },
          { "resourceType": "stylesheet", "budget": 100 },
          { "resourceType": "image", "budget": 500 },
          { "resourceType": "total", "budget": 1500 }
        ]
      }]
    }
  }
}
```
