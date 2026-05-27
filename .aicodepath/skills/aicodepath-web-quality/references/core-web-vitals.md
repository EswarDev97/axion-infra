# Core Web Vitals — Deep Reference

## LCP (Largest Contentful Paint) ≤ 2.5s

The LCP element is typically the hero image or largest above-fold text block.

### Preload the LCP image

```html
<!-- In <head>, before any stylesheets -->
<link rel="preload" as="image" href="/hero.webp"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w"
      imagesizes="(max-width:600px) 100vw, 800px"
      fetchpriority="high">
```

### TTFB optimization

- Use a CDN with edge PoPs close to users
- Enable HTTP/3 (QUIC) on your server
- Set `Cache-Control: public, max-age=31536000, immutable` on static assets
- Use `stale-while-revalidate` for HTML: `Cache-Control: max-age=3600, stale-while-revalidate=86400`

### SSR / SSG for HTML delivery

Framework patterns:
```js
// Next.js — static generation
export async function getStaticProps() { ... }

// Next.js — server rendering
export async function getServerSideProps() { ... }

// Nuxt — server rendering on by default
// Astro — static by default, SSR with `output: 'server'`
```

---

## INP (Interaction to Next Paint) ≤ 200ms

INP measures the worst interaction latency across the page session.

### Break up long tasks

```js
// Yield to browser between chunks
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 100 === 0) await scheduler.yield(); // or setTimeout(0)
  }
}

// scheduler.postTask for prioritized work
scheduler.postTask(() => doWork(), { priority: 'background' });
```

### Move CPU work to Web Workers

```js
// main.js
const worker = new Worker('./worker.js');
worker.postMessage({ data: largeDataset });
worker.onmessage = (e) => updateUI(e.data);

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data.data);
  self.postMessage(result);
};
```

### React patterns

```jsx
// Memoize expensive renders
const ExpensiveList = React.memo(({ items }) => (
  <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
));

// Memoize derived values
const sorted = useMemo(() => [...items].sort(compareFn), [items]);

// Memoize callbacks passed to children
const handleClick = useCallback((id) => dispatch({ type: 'SELECT', id }), [dispatch]);

// Defer non-critical updates
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchQuery(value));
```

---

## CLS (Cumulative Layout Shift) ≤ 0.1

### Always set image dimensions

```html
<!-- Always include width and height — browser reserves space before image loads -->
<img src="photo.jpg" width="800" height="600" alt="...">

<!-- Or use aspect-ratio in CSS -->
img { aspect-ratio: 4/3; width: 100%; }
```

### Reserve space for dynamic content

```css
/* Ad slot — reserve space before ad loads */
.ad-slot {
  min-height: 250px;
  container-type: inline-size;
}

/* Skeleton loader for content */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Font metrics matching (prevent FOUT shifts)

```css
/* Match fallback font metrics to web font using font descriptors */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter-fallback', sans-serif; }
```

### Safe animations (no layout-triggering properties)

```css
/* GOOD — compositor-only, no layout */
.animate { transition: transform 0.3s ease, opacity 0.3s ease; }

/* BAD — triggers layout recalculation */
.animate { transition: top 0.3s, left 0.3s, width 0.3s, height 0.3s; }
```

---

## Measurement

```bash
# Lighthouse CLI
npx lighthouse https://example.com --only-categories=performance --output=json

# web-vitals library (in browser)
import { onLCP, onINP, onCLS } from 'web-vitals';
onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

| Metric | Good   | Needs Work | Poor   |
|--------|--------|-----------|--------|
| LCP    | ≤ 2.5s | 2.5–4s   | > 4s   |
| INP    | ≤ 200ms| 200–500ms | > 500ms|
| CLS    | ≤ 0.1  | 0.1–0.25  | > 0.25 |
