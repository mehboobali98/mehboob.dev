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
    Writing.astro          The three most recent posts, pulled from the blog collection
    PostRow.astro          One post row, shared by the homepage section and /blog
  content/blog/            Posts live here, one .mdx file each
  content.config.ts        Post frontmatter schema
  layouts/Post.astro       Reading layout for a single post
  pages/index.astro        Assembles all the above
  pages/blog/              Post index and post routes
  pages/rss.xml.ts         Feed
  styles/global.css        Color/type tokens, prose styles, code theme
public/
  resume/                  Five tailored resumes, PDF + DOCX each, linked from the Contact section
  favicon.svg
```

To change any content — stats, case studies, resume links — it's all plain data at the top of the
relevant component file, not buried in markup.

## Writing a post

Drop a `.mdx` file in `src/content/blog/`. The filename becomes the URL, so
`the-sync-job.mdx` is served at `/blog/the-sync-job`. Nothing else needs registering --
no index to update, no import to add.

```mdx
---
title: The sync job that took half a day
description: >-
  One or two sentences. This is what shows on /blog, on the homepage, and in the feed,
  so write it as a summary rather than a teaser.
date: 2026-08-20
tags: ['Ruby on Rails', 'Performance']
draft: false
---

Body starts here. Standard Markdown, plus JSX if you want it.
```

`title`, `description` and `date` are required; `tags` and `draft` default to empty and
`false`. The schema is enforced at build time, so a typo in a field name fails the build
with the file and line rather than silently publishing something half-formed.

Publishing a post means exactly one thing: it appears at `/blog`, on the homepage
Writing section (newest three), and in `/rss.xml`. Set `draft: true` and it gets no route
at all -- not merely unlinked, but genuinely unreachable -- so unfinished writing can sit
in the repo safely.

Run `npm run dev` and the post shows up as you save.

### Notes on formatting

- **Code blocks** are highlighted with the site's own palette (amber keywords, the
  paper/quiet ramp for everything else) rather than a stock theme. That's wired through
  `shikiConfig: { theme: 'css-variables' }` in `astro.config.mjs` plus the
  `--astro-code-*` variables in `global.css`. Don't swap in a named Shiki theme -- they
  all ship three or four unrelated accent colors.
- **Prose styling** lives under `.prose` in `global.css`. There's no typography plugin,
  so a new element type (tables, footnotes) needs a rule adding there.
- **Images** aren't set up as a pipeline. Put a file in `public/` and reference it as
  `/name.png`; if posts start needing real image handling, that's the point to add
  `astro:assets`.

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

`public/resume/` holds five tailored variants, each as a PDF and a DOCX. Swap the files and keep the
filenames the same, or update the `resumes` array at the top of `src/components/Contact.astro` if you
rename them. The array stores a base filename per variant and the markup appends `.pdf` / `.docx`, so
both formats have to keep matching names. They're served as static downloads, no build step needed.

## Notes for next time

- The numbers graph's node coordinates are hardcoded SVG paths generated once from a small Python
  script (not checked into this repo) — if you want to regenerate the layout with different stats,
  the pattern is: pick 5 (x,y) points for the highlighted path, scatter ~30 quiet background points
  with a min-distance constraint, connect nearest neighbors for the mesh.
- Fonts are self-hosted via `@fontsource/*` packages specifically to avoid a Google Fonts CDN call at
  runtime — keep that pattern if you add more weights or families.
