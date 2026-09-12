import type { APIRoute } from 'astro';
import { renderShareCard } from '../../lib/shareCard';

export const prerender = true;

export const GET: APIRoute = async () => {
  const image = await renderShareCard({
    eyebrow: 'Writing',
    title: 'Notes from building and debugging.',
    detail: 'Backend systems · performance · developer tooling',
    labels: ['observe', 'debug', 'write'],
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
