# mehboobali.dev

Personal portfolio site. Built with [Astro](https://astro.build) + Tailwind CSS v4, self-hosted fonts
(no external CDN calls), single scrolling page.

## Structure

```
src/
  layouts/Layout.astro     Base HTML shell, meta tags
  components/
    Nav.astro              Sticky sidebar (desktop) / top bar (mobile)
    Hero.astro
    Numbers.astro          The interactive stats graph -- edit the `stats` array here
    CaseStudies.astro      Edit the `studies` array here
    OpenSource.astro       Edit the `projects` / `alsoBuilt` arrays here
    Now.astro
    Contact.astro          Edit the `resumes` array here
  pages/index.astro        Assembles all the above
  styles/global.css        Color/type tokens, all in one place under @theme
public/
  resume/                  The three tailored .docx resumes, downloadable from the Contact section
  favicon.svg
```

To change any content — stats, case studies, resume links — it's all plain data at the top of the
relevant component file, not buried in markup.

## Local development

Requires Node 22+.

```bash
npm install
npm run dev       # http://localhost:4321, live reload
npm run build     # outputs static site to dist/
npm run preview   # serve the built dist/ locally, to sanity-check before deploying
```

## Deploying

The build output in `dist/` is a fully static site — any static host works. Two free options that
both give you a custom domain with automatic HTTPS in a few clicks:

**Cloudflare Pages** (recommended — pairs naturally if you also buy the domain through Cloudflare):
1. Push this project to a GitHub repo.
2. In the Cloudflare dashboard: Workers & Pages -> Create -> Pages -> connect the repo.
3. Build command: `npm run build`. Output directory: `dist`.
4. Deploy, then add your custom domain under the project's Custom Domains tab.

**Vercel:**
1. Push to GitHub.
2. Import the repo at vercel.com/new — it auto-detects Astro, no config needed.
3. Add your custom domain under Project Settings -> Domains.

Either way: connect the repo once, and every future `git push` redeploys automatically.

## Domain

Not registered yet. Suggested, in priority order:
- `mehboobali.dev` — standard convention for developer sites, forces HTTPS
- `mehboobali.com` — backup if `.dev` is taken, more universally recognized outside tech

Check availability and buy at Cloudflare Registrar (sells at cost, no markup) or Namecheap.
Takes about five minutes.

## Updating the resumes

Swap the three files in `public/resume/` and keep the filenames the same (or update the `href`s in
`src/components/Contact.astro` if you rename them). They're served as static downloads, no build step
needed.

## Notes for next time

- The numbers graph's node coordinates are hardcoded SVG paths generated once from a small Python
  script (not checked into this repo) — if you want to regenerate the layout with different stats,
  the pattern is: pick 5 (x,y) points for the highlighted path, scatter ~30 quiet background points
  with a min-distance constraint, connect nearest neighbors for the mesh.
- Fonts are self-hosted via `@fontsource/*` packages specifically to avoid a Google Fonts CDN call at
  runtime — keep that pattern if you add more weights or families.
