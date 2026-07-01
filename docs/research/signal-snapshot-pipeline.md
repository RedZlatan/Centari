# Signal Snapshot Pipeline

Centari should keep raw research signals useful without turning the `signals`
table into an endless news pile.

This pipeline separates three layers:

1. **Live signal radar**
   - `signals`
   - fresh approved items used by the Research Map

2. **Trend intelligence**
   - `trend_snapshot_runs`
   - `trend_snapshots`
   - daily, weekly and monthly summaries per tracked domain

3. **Human understanding**
   - `human_layers`
   - `signal_human_layers`
   - `human_layer_snapshots`
   - maps signals to perception, spatial cognition, stress, learning,
     decision-making, body/environment and team coordination

## First implementation

The first pass is rule-based.

Run locally:

```bash
npm run worker:snapshot:dry
npm run worker:snapshot:daily
npm run worker:snapshot:weekly
npm run worker:snapshot:monthly
```

Required environment:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Daily cadence

Daily snapshot:

- reads approved signals published in the daily window
- groups them by domain
- selects top signals using signal strength, curator score, novelty and momentum
- maps signals into human layers by keyword rules
- writes trend and human-layer snapshots

## AI layer later

AI should not decide the data model.

Once snapshots exist, a cheap model can run once or twice per day to fill:

- `trend_snapshots.ai_summary`
- `human_layer_snapshots.ai_summary`

Good prompts should use only the compact snapshot data, not the full raw signal
archive. That keeps cost predictable and makes the summaries auditable.

## Newsletter path

The newsletter should read from snapshots, not directly from all raw signals:

- daily: top signals per domain
- weekly: trend movement and repeated themes
- monthly: deeper pattern review

The same snapshots can later feed Journal drafts.
