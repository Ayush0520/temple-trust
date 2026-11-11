# Temple Trust Website

A static website for a temple trust and the temples it maintains. No frameworks, no dependencies — plain HTML, CSS and a little vanilla JavaScript, assembled by a small Node script.

## Local development

```bash
npm run dev      # builds, then serves http://127.0.0.1:4321 and rebuilds on save
npm run build    # one-off build into dist/
```

The dev server binds to `127.0.0.1` only, so it is not reachable from other machines on the network.

## How it works

```
src/data/site.json       All content: trust details, temples, events, services, donation info
src/layout.html          Page shell — header, nav, footer (shared by every page)
src/pages/*.html         Body of each page; temple-detail.html is the template for each temple
assets/                  CSS, JS, images (copied to dist/ as-is)
build.mjs                Reads the JSON + templates, writes dist/
dist/                    Generated output — this is what gets published. Not committed.
```

Pages generated: home, temples, events, about, donate, contact, plus one page per temple at
`/temples/<slug>.html`. `sitemap.xml` and `robots.txt` are generated too.

## Editing content

Almost everything lives in **`src/data/site.json`**. To change darshan timings, add an event, or
correct the phone number, edit that file and save — the dev server rebuilds automatically.

**To add a temple**, append an object to the `temples` array:

```json
{
  "slug": "url-friendly-name",
  "name": "Temple Name",
  "deity": "Presiding deity",
  "location": "Area, City",
  "established": "1985",
  "accent": "#7A1F2B",
  "summary": "One line shown on cards.",
  "description": "A paragraph for the temple's own page.",
  "timings": [{ "label": "Morning darshan", "value": "6:00 AM – 12:00 PM" },
              { "label": "Evening darshan", "value": "4:00 PM – 9:00 PM" }],
  "aartis":  [{ "label": "Mangala Aarti", "value": "6:30 AM" }],
  "sevas": ["Seva name"],
  "festivals": ["Festival name"],
  "addressLine": "Full postal address",
  "mapQuery": "search text for Google Maps"
}
```

The temple page, its card on every listing, the footer links, the timings table and the sitemap all
pick it up on the next build. `accent` sets that temple's colour; the first two timings entries are
what the timings table shows.

Page headings and body text that is not in the JSON live in `src/pages/*.html`.

## Deployment

Publishing is handled by GitHub Pages via `.github/workflows/deploy.yml`: every push to `main`
builds the site and deploys `dist/`. Nothing generated is committed.

Links in the templates are root-relative (`/assets/...`). A GitHub Pages *project* site serves from
`/<repo>` instead of the root, so the workflow sets `BASE_PATH=/<repo>` in that case and leaves it
unset once a `CNAME` file (custom domain) is present. To reproduce a project-site build locally:

```bash
BASE_PATH=/temple-trust npm run build
```

### Custom domain

Put the bare domain in a `CNAME` file at the repo root (e.g. `templetrust.org`), set the same
domain under Settings → Pages → Custom domain, and point DNS at GitHub:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| CNAME | `www` | `<username>.github.io` |

Then enable *Enforce HTTPS* once the certificate is issued.
