import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import type { CardMotif } from '../../../lib/cardMotif';
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
      card: post.data.card,
      slug: post.id,
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags, card, slug } = props as {
    title: string;
    date: string;
    tags: string[];
    card?: CardMotif;
    slug: string;
  };
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
    motif: card,
    seed: slug,
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
