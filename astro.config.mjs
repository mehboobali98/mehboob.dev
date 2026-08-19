// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Absolute URL for canonical + OG tags. Change this in one place if the domain
  // lands somewhere other than mehboobali.dev.
  site: 'https://mehboobali.dev',
  integrations: [mdx()],
  markdown: {
    // 'css-variables' hands token colors over to CSS instead of baking in a theme's
    // palette. Shiki's defaults ship pink/blue/purple, which would put three unrelated
    // accent colors on a page whose whole system is greyscale plus one amber. The
    // variables are defined in styles/global.css. MDX inherits this config.
    shikiConfig: { theme: 'css-variables' },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
