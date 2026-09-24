export type CaseStudyVisual = 'sync' | 'workflow' | 'cmdb';

interface CaseStudySummary {
  role: string;
  constraint: string;
  decision: string;
  result: {
    value: string;
    note: string;
    evidenceNeeded?: boolean;
  };
}

export interface CaseStudy {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  stack: string[];
  visual: CaseStudyVisual;
  flagship?: boolean;
  summary: CaseStudySummary;
  artifactTitle: string;
  facts: Array<{ label: string; value: string }>;
  challenge: string;
  approach: string;
  result: string;
  accountability: {
    mine: string;
    team: string;
    tradeoff: string;
    hindsight: string;
  };
  post?: string;
  proof?: { label: string; href: string };
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'sync',
    slug: 'sync-pipeline',
    eyebrow: 'Backend performance',
    title: 'The sync job that took half a day',
    description:
      "AssetSonar's device sync was taking 12 to 15 hours. I rebuilt the pipeline around batched writes and removed the redundant lookups.",
    stack: ['Ruby on Rails', 'Delayed Job', 'MySQL'],
    visual: 'sync',
    flagship: true,
    summary: {
      role: 'Backend engineer brought in to diagnose and redesign the production path',
      constraint: 'A 12–15 hour sync could not keep its intended hourly schedule',
      decision: 'Batch the unit of work, eager-load related data, and keep the downstream contract stable',
      result: {
        value: 'Under 1 hour',
        note: 'Measured across a 15-day production window; the pattern was reused in later MDM integrations.',
      },
    },
    artifactTitle: 'Record-by-record work became bounded batch work.',
    facts: [
      { label: 'Before', value: '12–15 hours' },
      { label: 'After', value: 'Under 1 hour' },
      { label: 'Scale', value: 'Millions of records' },
      { label: 'Durability', value: 'All later MDM integrations' },
    ],
    challenge:
      "New hardware would not show up for most of a working day. The pipeline had accumulated N+1 queries and unbatched writes on a table carrying years of device history.",
    approach:
      'I traced the expensive query paths, rebuilt the work around bounded batches, and removed repeated lookups from the hot path. The redesign had to reduce runtime without changing the data contract downstream integrations relied on.',
    result:
      'The same job now finishes in under an hour. More importantly, the batching pattern became the base for every MDM integration added afterward instead of remaining a one-off performance patch.',
    accountability: {
      mine: 'I profiled the existing job, redesigned the batching and query paths, and shipped the change without altering the downstream data contract.',
      team: 'The backend team carried the pattern into later MDM integrations. I owned the original performance redesign.',
      tradeoff: 'The quickest rewrite would have changed the payload shape. Keeping the contract stable made the rollout safer and the pattern reusable.',
      hindsight: 'The fix started too late. I would put query counts and runtime budgets beside the job before its first large workload, not after it had become a half-day dependency.',
    },
    post: '/blog/the-sync-job-that-took-half-a-day/',
  },
  {
    id: 'workflow',
    slug: 'workflow-automation',
    eyebrow: 'Product and platform',
    title: 'Automation that could branch',
    description:
      'I led the replacement of a one-step rules engine with a production node canvas supporting branching, iteration, API execution, and readable run histories.',
    stack: ['Ruby on Rails', 'React Flow', 'ITSM'],
    visual: 'workflow',
    summary: {
      role: 'Technical delivery lead for an approximately 8-engineer team',
      constraint: 'One trigger and one sub-trigger; no chaining, branching, or useful failure path',
      decision: 'Composable nodes, schema-aware outputs, and run history that follows each branch',
      result: {
        value: 'Running in production',
        note: 'Evidence gap: add one verified adoption, reliability, or time-saving outcome before merge.',
        evidenceNeeded: true,
      },
    },
    artifactTitle: 'One condition can fork into two observable paths.',
    facts: [
      { label: 'Role', value: 'Technical delivery lead' },
      { label: 'Team', value: 'Approximately 8 engineers' },
      { label: 'Duration', value: '5 months' },
      { label: 'Status', value: 'Running in production' },
    ],
    challenge:
      'The old engine paired one trigger with one sub-trigger. It could not chain actions, branch on outcomes, or explain which step had failed when a rule behaved incorrectly.',
    approach:
      'I split delivery across execution, expression resolution, event triggers, branching and iteration, data transformation, integrations, and monitoring. Responses become schemas later nodes can read; arrays split into items and paginated endpoints follow themselves.',
    result:
      'The engine is running in production and remains the program I lead. It can carry an offboarding flow across several systems and show where a branch failed. I still need one verified operational outcome—such as active workflows, setup time saved, or recovery time—to make the result concrete.',
    accountability: {
      mine: 'I split the engine into workstreams, set the integration boundaries, reviewed the cross-cutting decisions, and kept backend and frontend delivery aligned.',
      team: 'Approximately eight engineers owned execution, expressions, triggers, branching, iteration, transformation, integrations, monitoring, and the node-canvas interface.',
      tradeoff: 'More flexible workflows are harder to explain when they fail. Schema-aware outputs and readable run histories had to grow with the node model.',
      hindsight: 'We let the node catalogue grow before replay rules and operational limits were boring and explicit. I would reverse that order.',
    },
    proof: {
      label: 'Publicly documented by EZO',
      href: 'https://ezo.io/assetsonar/docs/automate-it-workflows/',
    },
  },
  {
    id: 'cmdb',
    slug: 'cmdb-it-graph',
    eyebrow: 'Architecture and technical leadership',
    title: 'A CMDB that actually models relationships',
    description:
      'I led the architecture and delivery of a relationship model that can answer what touches a configuration item several hops away.',
    stack: ['Ruby on Rails', 'MySQL', 'Graph modeling'],
    visual: 'cmdb',
    summary: {
      role: 'Architecture and delivery lead for a 5-engineer team',
      constraint: 'Direct-only associations turned multi-hop questions into manual lookup chains',
      decision: 'N-level traversal that preserves relationship type and direction, revealed one level at a time',
      result: {
        value: 'Released to production in 7 months',
        note: 'Evidence gap: add one verified usage, support, or decision-time outcome before merge.',
        evidenceNeeded: true,
      },
    },
    artifactTitle: 'A multi-hop question becomes one traversal.',
    facts: [
      { label: 'Role', value: 'Architecture and lead' },
      { label: 'Team', value: '5 engineers' },
      { label: 'Duration', value: '7 months' },
      { label: 'Model', value: 'N-level traversal' },
    ],
    challenge:
      'Most CMDBs stop at direct associations. Answering which vendor contract covers the software on a particular server becomes a sequence of manual lookups instead of one navigable relationship.',
    approach:
      'I designed the data model for n-level traversal and led the ITSM-integrated interface built on top of it. Each configuration item expands to its next level while preserving relationship type and direction.',
    result:
      'The module moved from architecture to production in seven months and put multi-hop relationship exploration into the product interface. I still need one verified usage, support, or decision-time outcome to show what that changed for customers.',
    accountability: {
      mine: 'I designed the n-level traversal model and led delivery across the data model, relationship rules, and the interface built on top of them.',
      team: 'Five engineers implemented and integrated the module across the wider ITSM product.',
      tradeoff: 'Traversal depth is useful until the graph becomes unreadable. The model preserves type and direction while the interface reveals one useful level at a time.',
      hindsight: 'I would bring the ugliest real relationship paths into week one. Clean demo graphs do not expose where the model and the interface become hard to read.',
    },
    proof: {
      label: 'Publicly documented by EZO',
      href: 'https://ezo.io/assetsonar/docs/visualize-and-manage-cmdb-relationships-with-it-graph/',
    },
  },
];

export function findCaseStudy(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}
