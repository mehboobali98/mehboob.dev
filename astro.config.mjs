// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Absolute URL for canonical + OG tags. Change this in one place if the domain
  // lands somewhere other than mehboobali.dev.
  site: 'https://mehboobali.dev',
  vite: {
    plugins: [tailwindcss()]
  }
});