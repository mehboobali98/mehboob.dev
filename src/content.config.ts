import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Posts are plain files on disk, not a CMS -- same principle as the rest of the site,
// where content lives next to the markup that renders it. `draft: true` keeps a post
// out of the index, the RSS feed, and the generated routes entirely, so half-finished
// writing can sit in the repo without being published.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
