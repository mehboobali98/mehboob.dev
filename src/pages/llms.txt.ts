import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

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
    return `- [${p.data.title}](${site}/blog/${p.id}) (${date}): ${p.data.description.trim().replace(/\s+/g, ' ')}`;
  });

  const body = `# Mehboob Ali

> Principal Software Engineer in Lahore, Pakistan. Backend systems, technical
> leadership, and developer tooling. Currently leads the CMDB and Workflow
> Automation programs at 7Vals, and builds tooling that both engineers and coding
> agents use.

Open to remote or relocation. Contact: imehboobali@outlook.com

## Selected work

- Device synchronization: rebuilt a Rails sync pipeline running 12-15 hours down to
  under an hour, using batching and eager loading. The pattern was reused across
  later device integrations.
- CMDB / IT Graph: led a 5-engineer team for roughly seven months, architecture to
  production, covering configuration-item modeling and n-level relationship traversal.
- Workflow Automation: technical lead for an approximately 8-engineer team.

## Open source

- [rmine](https://github.com/mehboobali98/rmine): a Go CLI for Redmine covering
  issues, projects and time tracking, designed for developers, scripts and coding
  agents. Ships an embedded Claude Code skill installed via \`rmine skill install\`.
- [rmine-skills](https://github.com/mehboobali98/rmine-skills): Claude Code workflow
  skills built on rmine, including a spec-gated effort estimator that runs three
  subagents and a calibration skill that checks estimates against logged time.
- [bitwise_attributes](https://github.com/mehboobali98/bitwise_attributes): a Ruby gem
  packing boolean flags into a single ActiveRecord integer column.

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
