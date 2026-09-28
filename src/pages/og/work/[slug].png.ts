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
    eyebrow: `${study.flagship ? 'Flagship case study' : 'Case study'} · ${study.eyebrow}`,
    title: study.title,
    detail: study.stack.join(' · '),
    motif: study.visual === 'sync'
      ? { motif: 'bars', before: { label: '12–15 h', value: 12 }, after: { label: 'under 1 h', value: 1 } }
      : study.visual === 'workflow'
        ? { motif: 'path', labels: ['trigger', 'branch', 'action'] }
        : { motif: 'path', labels: ['item', 'relation', 'impact'] },
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
