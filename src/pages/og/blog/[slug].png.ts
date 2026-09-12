import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderShareCard } from '../../../lib/shareCard';

export const prerender = true;

export const getStaticPaths = (async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      date: post.data.date.toISOString(),
      tags: post.data.tags,
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags } = props as { title: string; date: string; tags: string[] };
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const image = await renderShareCard({
    eyebrow: 'Engineering note',
    title,
    detail: [formattedDate, ...tags].join(' · '),
    labels: ['observe', 'debug', 'write'],
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
