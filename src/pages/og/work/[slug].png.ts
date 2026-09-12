import type { APIRoute, GetStaticPaths } from 'astro';
import { caseStudies, type CaseStudy } from '../../../data/caseStudies';
import { renderShareCard } from '../../../lib/shareCard';

export const prerender = true;

export const getStaticPaths = (() => caseStudies.map((study) => ({
  params: { slug: study.slug },
  props: { study },
}))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { study } = props as { study: CaseStudy };
  const image = await renderShareCard({
    eyebrow: `Case study · ${study.eyebrow}`,
    title: study.title,
    detail: study.stack.join(' · '),
    labels: study.visual === 'runtime'
      ? ['before', 'rewrite', 'after']
      : study.visual === 'workflow'
        ? ['trigger', 'branch', 'action']
        : ['item', 'relation', 'impact'],
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
