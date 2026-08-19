import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Mehboob Ali',
    description:
      'Notes on backend systems, performance work, and the tooling around shipping software.',
    // Set from `site` in astro.config.mjs -- the feed needs absolute URLs, so this is the
    // one place a missing domain would surface as a build error rather than a silent bug.
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
