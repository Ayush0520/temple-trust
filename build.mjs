import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const out = join(root, 'dist');

const site = JSON.parse(readFileSync(join(src, 'data', 'site.json'), 'utf8'));
const layout = readFileSync(join(src, 'layout.html'), 'utf8');
const page = (name) => readFileSync(join(src, 'pages', `${name}.html`), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

// Set BASE_PATH=/repo-name when the site is served from a subdirectory
// (a GitHub Pages project site). Leave unset for a custom domain or user site.
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const withBase = (html) => (BASE ? html.replace(/((?:href|src)=")\/(?!\/)/g, `$1${BASE}/`) : html);

const aartiCount = site.temples.reduce((n, t) => n + t.aartis.length, 0);

const base = {
  trustName: esc(site.trustName),
  trustShortName: esc(site.trustShortName),
  tagline: esc(site.tagline),
  established: esc(site.established),
  registrationNo: esc(site.registrationNo),
  domain: esc(site.domain),
  intro: esc(site.intro),
  templeCount: site.temples.length,
  aartiCount,
  address: esc(site.contact.address),
  phone: site.contact.phone.replace(/\s/g, ''),
  phoneDisplay: esc(site.contact.phoneDisplay),
  email: esc(site.contact.email),
  officeHours: esc(site.contact.officeHours),
  accountName: esc(site.donation.accountName),
  bankName: esc(site.donation.bankName),
  accountNo: esc(site.donation.accountNo),
  ifsc: esc(site.donation.ifsc),
  upi: esc(site.donation.upi),
  taxNote: esc(site.donation.taxNote),
};

/* ---------- partial renderers ---------- */

const templeCard = (t) => `
      <a class="temple-card" href="/temples/${t.slug}.html" style="--accent: ${t.accent}">
        <span class="card-emblem" aria-hidden="true">${esc(t.name.trim().split(/\s+/).slice(-2, -1)[0]?.[0] || t.name[0])}</span>
        <h3>${esc(t.name)}</h3>
        <p class="card-deity">${esc(t.deity)}</p>
        <p class="card-summary">${esc(t.summary)}</p>
        <span class="card-meta">${esc(t.location)}</span>
        <span class="card-cta">View temple</span>
      </a>`;

const templesGrid = (list) => `<div class="card-grid">${list.map(templeCard).join('')}\n    </div>`;

const eventItem = (e) => `
      <li class="event-item">
        <div class="event-date">${esc(e.dateDisplay)}</div>
        <div class="event-body">
          <h3>${esc(e.name)}</h3>
          <p class="event-temple">${esc(e.temple)}</p>
          <p>${esc(e.details)}</p>
        </div>
      </li>`;

const eventsList = (list) => `<ul class="event-list plain">${list.map(eventItem).join('')}\n    </ul>`;

const servicesGrid = () => `<div class="feature-grid">${site.services
  .map((s) => `
      <div class="feature">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
      </div>`)
  .join('')}\n    </div>`;

const timingsTable = () => `
    <div class="table-wrap">
      <table class="timings">
        <thead><tr><th>Temple</th><th>Morning</th><th>Evening</th></tr></thead>
        <tbody>${site.temples
          .map((t) => `
          <tr>
            <th scope="row"><a href="/temples/${t.slug}.html">${esc(t.name)}</a></th>
            <td>${esc(t.timings[0]?.value || '—')}</td>
            <td>${esc(t.timings[1]?.value || '—')}</td>
          </tr>`)
          .join('')}
        </tbody>
      </table>
    </div>`;

const festivalsByTemple = () => `<div class="feature-grid">${site.temples
  .map((t) => `
      <div class="feature" style="--accent: ${t.accent}">
        <h3><a href="/temples/${t.slug}.html">${esc(t.name)}</a></h3>
        <p>${t.festivals.map(esc).join(' · ')}</p>
      </div>`)
  .join('')}\n    </div>`;

const sevasGrid = () => `<div class="feature-grid">${site.temples
  .map((t) => `
      <div class="feature" style="--accent: ${t.accent}">
        <h3>${esc(t.name)}</h3>
        <ul class="plain">${t.sevas.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>`)
  .join('')}\n    </div>`;

const contactTempleList = () => site.temples
  .map((t) => `
          <li>
            <a href="/temples/${t.slug}.html">${esc(t.name)}</a>
            <span class="muted small">${esc(t.addressLine)}</span>
          </li>`)
  .join('');

const footerTempleLinks = () => site.temples
  .map((t) => `<li><a href="/temples/${t.slug}.html">${esc(t.name)}</a></li>`)
  .join('');

/* ---------- page assembly ---------- */

const navKeys = ['home', 'temples', 'events', 'about', 'contact'];
const activeVars = (current) =>
  Object.fromEntries(navKeys.map((k) => [`active_${k}`, k === current ? ' class="is-active" aria-current="page"' : '']));

function readMeta(tpl) {
  const m = tpl.match(/^<!--\s*\ntitle:\s*(.*?)\ndescription:\s*(.*?)\n-->\s*/s);
  if (!m) throw new Error('page is missing its title/description comment block');
  return { title: m[1].trim(), description: m[2].trim(), body: tpl.slice(m[0].length) };
}

function render({ pageName, outPath, canonicalPath, active, vars }) {
  const { title, description, body } = readMeta(page(pageName));
  const all = { ...base, ...vars };
  const content = fill(body, all);
  const html = fill(layout, {
    ...all,
    ...activeVars(active),
    pageTitle: fill(title, all),
    pageDescription: fill(description, all).replace(/"/g, '&quot;'),
    canonicalPath: BASE + canonicalPath,
    content,
    footer_temple_links: footerTempleLinks(),
  });
  const dest = join(out, outPath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, withBase(html));
  return outPath;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const written = [];

written.push(render({
  pageName: 'index', outPath: 'index.html', canonicalPath: '/', active: 'home',
  vars: {
    temples_grid: templesGrid(site.temples),
    events_preview: eventsList(site.events.slice(0, 3)),
    services_grid: servicesGrid(),
  },
}));

written.push(render({
  pageName: 'temples', outPath: 'temples.html', canonicalPath: '/temples.html', active: 'temples',
  vars: { temples_grid: templesGrid(site.temples), timings_table: timingsTable() },
}));

written.push(render({
  pageName: 'events', outPath: 'events.html', canonicalPath: '/events.html', active: 'events',
  vars: { events_list: eventsList(site.events), festivals_by_temple: festivalsByTemple() },
}));

written.push(render({
  pageName: 'about', outPath: 'about.html', canonicalPath: '/about.html', active: 'about',
  vars: { services_grid: servicesGrid() },
}));

written.push(render({
  pageName: 'donate', outPath: 'donate.html', canonicalPath: '/donate.html', active: '',
  vars: { sevas_grid: sevasGrid() },
}));

written.push(render({
  pageName: 'contact', outPath: 'contact.html', canonicalPath: '/contact.html', active: 'contact',
  vars: { contact_temple_list: contactTempleList() },
}));

for (const t of site.temples) {
  written.push(render({
    pageName: 'temple-detail',
    outPath: join('temples', `${t.slug}.html`),
    canonicalPath: `/temples/${t.slug}.html`,
    active: 'temples',
    vars: {
      t_name: esc(t.name),
      t_deity: esc(t.deity),
      t_location: esc(t.location),
      t_established: esc(t.established),
      t_accent: t.accent,
      t_summary: esc(t.summary),
      t_description: esc(t.description),
      t_addressLine: esc(t.addressLine),
      t_mapQuery: encodeURIComponent(t.mapQuery),
      t_sevas: t.sevas.map((s) => `<li>${esc(s)}</li>`).join(''),
      t_festivals: t.festivals.map(esc).join(' · '),
      t_timings: t.timings.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join(''),
      t_aartis: t.aartis.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join(''),
      t_other_temples: templesGrid(site.temples.filter((x) => x.slug !== t.slug)),
    },
  }));
}

/* static assets + SEO files */
cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(out, 'CNAME'));
writeFileSync(join(out, '.nojekyll'), '');

const urls = ['/', '/temples.html', '/events.html', '/about.html', '/donate.html', '/contact.html',
  ...site.temples.map((t) => `/temples/${t.slug}.html`)];
writeFileSync(join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>https://${site.domain}${BASE}${u}</loc></url>`).join('\n') +
  `\n</urlset>\n`);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://${site.domain}${BASE}/sitemap.xml\n`);

console.log(`Built ${written.length} pages into dist/${BASE ? ` (base path ${BASE})` : ''}`);
written.forEach((p) => console.log('  ' + p));
