import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { contact } from '../site';
import { caseStudies } from '../data/caseStudies';

// https://llmstxt.org convention: a plain-Markdown summary of the site for models that
// are given the URL directly. Generated from the same collection that builds /blog, so
// it can't drift from what's actually published the way a hand-written file would.
export async function GET(context: APIContext) {
  const site = context.site?.origin ?? '';

  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const postLines = posts.map((p) => {
    const date = p.data.date.toISOString().slice(0, 10);
    return `- [${p.data.title}](${site}/blog/${p.id}/) (${date}): ${p.data.description.trim().replace(/\s+/g, ' ')}`;
  });

  // Same reasoning for the case studies: the homepage and /work pages render from this
  // data, so the summary here can't claim a different stack or scope than they do.
  const workLines = caseStudies.map(
    (s) =>
      `- [${s.title}](${site}/work/${s.slug}/): ${s.description.trim().replace(/\s+/g, ' ')} ` +
      `(${s.facts.map((f) => `${f.label}: ${f.value}`).join('; ')}; stack: ${s.stack.join(', ')})`
  );

  const body = `# Mehboob Ali

> Senior backend engineer (Ruby on Rails, MySQL) in Lahore, Pakistan, currently
> Principal Software Engineer at 7Vals. Backend systems, technical
> leadership, and developer tooling. Leads Workflow Automation at 7Vals after
> taking the CMDB / IT Graph from architecture to production, and builds tooling
> that both engineers and coding agents use.

Open to remote or relocation. Contact: ${contact.email}

## Selected work

${workLines.join('\n')}

## Open source

- [rmine](https://github.com/mehboobali98/rmine): a Go CLI for Redmine covering
  issues, projects and time tracking, designed for developers, scripts and coding
  agents. Ships an embedded Claude Code skill installed via \`rmine skill install\`.
- [rmine-skills](https://github.com/mehboobali98/rmine-skills): Claude Code workflow
  skills built on rmine, including a spec-gated effort estimator that runs three
  subagents and a calibration skill that checks estimates against logged time.
- [bitwise_attributes](https://github.com/mehboobali98/bitwise_attributes): a Ruby gem
  packing boolean flags into a single ActiveRecord integer column.
- [job-search-agent](https://github.com/mehboobali98/job-search-agent): job discovery
  for Codex. The finder and judge agents can't write; one deterministic script owns
  every tracker change, and it never submits an application.

## Publication

- [Open research knowledge graph for structuring scholarly contributions using
  transformers](https://doi.org/10.1109/ICACS55311.2023.10089637). Mehboob Ali,
  Abdullah Malik and Maryam Bashir. IEEE ICACS, 2023.

## Writing

${postLines.join('\n')}

## Links

- Site: ${site}
- Feed: ${site}/rss.xml
- GitHub: https://github.com/mehboobali98
- LinkedIn: https://www.linkedin.com/in/mehboobali98
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
