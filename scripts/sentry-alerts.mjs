// Create 4 production alert rules in Sentry via REST API.
const SENTRY_TOKEN = process.env.SENTRY_TOKEN;
const ORG = 'microstay-holdings-llc';
const PROJECT = 'javascript-nextjs';

if (!SENTRY_TOKEN) {
  console.error('Missing SENTRY_TOKEN env var');
  process.exit(1);
}

async function create(rule) {
  const res = await fetch(`https://sentry.io/api/0/projects/${ORG}/${PROJECT}/rules/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENTRY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function list() {
  const res = await fetch(`https://sentry.io/api/0/projects/${ORG}/${PROJECT}/rules/`, {
    headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
  });
  return res.json();
}

const NOTIFY_ACTION = {
  id: 'sentry.mail.actions.NotifyEmailAction',
  targetType: 'IssueOwners',
  fallthroughType: 'ActiveMembers',
};

// Sentry interval values (from API docs):
//   '1m', '5m', '15m', '1h', '1d', '1w', '30d'
// Level values: 10=debug, 20=info, 30=warning, 40=error, 50=fatal
// Environment omitted — Sentry rejects non-existent environments; apply to all.

// ─── Rule 1: Auth failure spike ─────────────────────────────
const rule1 = {
  name: 'Auth failure spike (admin/vendor)',
  actionMatch: 'all',
  filterMatch: 'all',
  frequency: 5,
  conditions: [
    { id: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition' },
  ],
  filters: [
    { id: 'sentry.rules.filters.tagged_event.TaggedEventFilter', key: 'url', match: 'co', value: '/api/admin' },
    { id: 'sentry.rules.filters.level.LevelFilter', match: 'gte', level: '30' },
  ],
  actions: [NOTIFY_ACTION],
};

// ─── Rule 2: Rate limit flood ───────────────────────────────
const rule2 = {
  name: 'Rate limit flood (429 spike)',
  actionMatch: 'all',
  filterMatch: 'all',
  frequency: 10,
  conditions: [
    { id: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition', interval: '5m', value: 50 },
  ],
  filters: [
    { id: 'sentry.rules.filters.tagged_event.TaggedEventFilter', key: 'status_code', match: 'eq', value: '429' },
  ],
  actions: [NOTIFY_ACTION],
};

// ─── Rule 3: Stripe webhook signature failures ──────────────
const rule3 = {
  name: 'Stripe webhook signature failures',
  actionMatch: 'all',
  filterMatch: 'all',
  frequency: 60,
  conditions: [
    { id: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition', interval: '1h', value: 1 },
  ],
  filters: [
    { id: 'sentry.rules.filters.tagged_event.TaggedEventFilter', key: 'url', match: 'co', value: '/api/vendor/billing/webhook' },
    { id: 'sentry.rules.filters.level.LevelFilter', match: 'gte', level: '40' },
  ],
  actions: [NOTIFY_ACTION],
};

// ─── Rule 4: Any new production error ───────────────────────
const rule4 = {
  name: 'New production error',
  actionMatch: 'all',
  filterMatch: 'all',
  frequency: 30,
  conditions: [
    { id: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition' },
  ],
  filters: [],
  actions: [NOTIFY_ACTION],
};

const rules = [
  { label: '#1 Auth failure spike', rule: rule1 },
  { label: '#2 Rate limit flood', rule: rule2 },
  { label: '#3 Webhook signature failures', rule: rule3 },
  { label: '#4 New production error', rule: rule4 },
];

console.log('\n━━━ Creating Sentry alert rules ━━━');
for (const { label, rule } of rules) {
  const r = await create(rule);
  if (r.status === 200 || r.status === 201) {
    console.log(`   ✓ ${label} — created id=${r.body.id}`);
  } else {
    console.log(`   ✗ ${label} — status=${r.status}`);
    console.log(`     ${JSON.stringify(r.body).slice(0, 250)}`);
  }
}

console.log('\n━━━ Final list of alert rules ━━━');
const all = await list();
if (Array.isArray(all)) {
  for (const r of all) console.log(`   • [${r.id}] ${r.name}`);
} else {
  console.log(JSON.stringify(all).slice(0, 300));
}
