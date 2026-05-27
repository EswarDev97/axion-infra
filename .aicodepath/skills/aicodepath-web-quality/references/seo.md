# SEO — Deep Reference

## robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://example.com/sitemap.xml
```

## XML Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

Limits: ≤ 50,000 URLs, ≤ 50 MB uncompressed. Use sitemap index for larger sites.

## Essential Head Tags

```html
<head>
  <!-- Canonical — prevents duplicate content -->
  <link rel="canonical" href="https://example.com/page">

  <!-- Open Graph (social sharing) -->
  <meta property="og:title" content="Page Title (≤ 60 chars)">
  <meta property="og:description" content="Page description (≤ 155 chars)">
  <meta property="og:image" content="https://example.com/og-image.jpg"> <!-- 1200×630 -->
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:type" content="website">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Page Title">
  <meta name="twitter:description" content="Description">
  <meta name="twitter:image" content="https://example.com/og-image.jpg">
</head>
```

## Structured Data (JSON-LD)

### Organization / WebSite

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Example Inc",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png",
      "sameAs": ["https://twitter.com/example", "https://linkedin.com/company/example"]
    },
    {
      "@type": "WebSite",
      "url": "https://example.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://example.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
```

### Article

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "datePublished": "2024-01-15T08:00:00Z",
  "dateModified": "2024-01-20T10:00:00Z",
  "author": { "@type": "Person", "name": "Author Name" },
  "publisher": {
    "@type": "Organization",
    "name": "Example Inc",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  },
  "image": "https://example.com/article-image.jpg",
  "description": "Article description"
}
</script>
```

### FAQ

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the return policy?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer a 30-day return policy on all items."
      }
    }
  ]
}
</script>
```

### BreadcrumbList

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://example.com/blog" },
    { "@type": "ListItem", "position": 3, "name": "Article Title" }
  ]
}
</script>
```

## URL Structure Rules

- Use hyphens (`-`), not underscores (`_`)
- All lowercase
- ≤ 75 characters
- No unnecessary query parameters in canonical URLs
- Descriptive slugs: `/blog/web-performance-tips` not `/blog/post-123`

## hreflang for Multi-Language

```html
<head>
  <link rel="alternate" hreflang="en" href="https://example.com/page">
  <link rel="alternate" hreflang="es" href="https://es.example.com/pagina">
  <link rel="alternate" hreflang="x-default" href="https://example.com/page">
</head>
```

Rules: every language page must reference all other languages + itself. `x-default` is for language selectors.

## Title & Meta Description Quick Rules

| Element | Length | Notes |
|---------|--------|-------|
| `<title>` | 50–60 chars | Primary keyword first, brand last (`Keyword - Brand`) |
| `<meta description>` | 150–160 chars | Unique, compelling, include CTA |
| `<h1>` | 1 per page | Contains primary keyword, matches page intent |
