# Best Practices — Deep Reference

## Security Headers

### Nginx

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

### Express / Node.js (use Helmet)

```js
import helmet from 'helmet';

app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"], // prefer nonces here too
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

### CSP with Nonces (Next.js middleware example)

```js
// middleware.js
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

export function middleware(request) {
  const nonce = Buffer.from(uuid()).toString('base64');
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}
```

```jsx
// _document.js — use nonce on inline scripts
import { headers } from 'next/headers';

export default function RootLayout({ children }) {
  const nonce = headers().get('x-nonce');
  return (
    <html>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.__NONCE__="${nonce}"` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Input Sanitization

```js
// NEVER: sets HTML directly, XSS risk
element.innerHTML = userContent;

// GOOD: text only
element.textContent = userContent;

// GOOD: sanitize before setting as HTML (install: npm i dompurify)
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userContent, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href', 'target']
});
```

## Secure Cookies

```js
// Express
res.cookie('session', token, {
  httpOnly: true,   // not accessible via JS
  secure: true,     // HTTPS only
  sameSite: 'Strict', // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

## Passive Event Listeners

```js
// Scroll and touch listeners MUST be passive to not block rendering
window.addEventListener('scroll', handleScroll, { passive: true });
document.addEventListener('touchstart', handleTouch, { passive: true });
document.addEventListener('touchmove', handleMove, { passive: true });
```

## Event Delegation (performance + memory)

```js
// BAD — adds listener per item; breaks on dynamic content
items.forEach(item => item.addEventListener('click', handler));

// GOOD — one listener on parent, works for dynamic children too
list.addEventListener('click', (e) => {
  const item = e.target.closest('[data-item-id]');
  if (item) handler(item.dataset.itemId);
});
```

## Memory Cleanup

```js
// React — cleanup subscriptions, timers, fetch
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json()).then(setData);
  return () => controller.abort();
}, []);

// Vanilla — remove event listeners on teardown
const handler = (e) => doSomething(e);
element.addEventListener('click', handler);
// later:
element.removeEventListener('click', handler);
```

## Production Build Checks

```bash
# No exposed source maps
find dist -name "*.map" | head -5   # should be empty or internal only

# No console statements (using grep)
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "// eslint-disable"

# Dependency audit
npm audit --audit-level=high
```

## Deprecated Patterns → Modern Replacements

| Deprecated | Modern replacement |
|------------|-------------------|
| `document.write()` | `document.createElement()` + `appendChild()` |
| `XMLHttpRequest` (sync) | `fetch()` with `async/await` |
| `AppCache` (`manifest.appcache`) | Service Worker + Cache API |
| `alert()` / `confirm()` | Custom modal dialogs |
| `<table>` for layout | CSS Grid / Flexbox |
| Non-passive scroll listeners | `{ passive: true }` flag |
| `navigator.userAgent` sniffing | Feature detection (`'IntersectionObserver' in window`) |
