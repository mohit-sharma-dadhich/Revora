# Engineering Log — bugs found, root causes, and fixes

This is an honest record of the harder bugs hit while building Revora,
kept because the debugging process is as much a part of the engineering
as the final code. Every entry here was a real, reproduced issue —
several were caught only by tracing the actual data flow end to end,
not by reading code in isolation.

## 1. The ownership-stamping bug (the most severe one)

**Symptom:** every merchant's private data — their proposed experiments,
their payment records, several categories of audit log entries — was
silently visible to every other merchant, even after multi-tenancy was
supposedly implemented.

**Root cause:** the ownership utility had two different functions that
looked interchangeable but weren't. `ownershipFilter(auth)` was built
for *reads* — it returns a `$or` clause matching "the shared baseline
OR this merchant's own data," which is correct for querying. But it was
also reused to build *write* payloads: `Experiment.create({
...ownershipFilter(auth), ... })`. Spreading a `{ $or: [...] }` object
into a document payload injects a literal field named `$or`, which
Mongoose's default strict mode silently drops — no error, no warning.
The result: `ownerId`/`sessionId` were never actually set on the
created document. It landed in the shared baseline bucket instead of
being private, and the read-side filter (correctly) showed baseline
data to everyone.

**Fix:** added a second, deliberately differently-named function,
`ownershipFields(auth)`, that returns a plain field object for writes
(`{ ownerId: ... }` or `{ sessionId: ..., expiresAt: ... }`), and
audited every `.create()` call site in the codebase to make sure reads
and writes never shared the same helper again.

**Lesson:** a read filter and a write payload can have the same shape
in simple cases, which makes it easy to reuse one function for both —
right up until one of them needs to express "OR," at which point they
silently diverge. Now they have distinct names on purpose.

## 2. The private-data-vs-demo-data design, in three iterations

**v1 — no scoping at all.** Every merchant saw the same global dataset.
Not a bug so much as a missing feature, but worth noting as the
starting point.

**v2 — blended baseline.** Reads showed "your data OR the shared
baseline" combined into one ranked list. This mostly worked, but the
ranking formula (`affinity * sqrt(audience size)`) meant a merchant's
own smaller, genuinely qualifying opportunity could still be outranked
by the larger seeded baseline for the single featured card — technically
correct, but confusing, since nothing told the merchant which source
they were actually looking at.

**v3 — exclusive switch (current).** If a merchant has any private data
of their own, show *only* theirs — no blending. If they have none, show
baseline. If nothing in their own data clears the discovery thresholds,
say so explicitly with the actual numbers ("your strongest pair reached
42% co-purchase overlap; the app requires 65%") instead of silently
falling back to demo data. This is the version that actually matches
"my data if I have it, an honest answer if I don't."

**A regression along the way:** after building v3's backend logic
correctly, the frontend never actually sent the `auto` mode it needed —
it always explicitly requested `'private'` or `'demo'` based on which
onboarding button was last clicked, defaulting to `'demo'` the moment
that signal was missing (e.g. reaching the page via a nav link instead
of the onboarding flow). This silently reintroduced "always shows demo
data" through a brand-new code path, months after the original version
of that bug was fixed. Caught by deliberately testing the "reach the
page a different way" scenario, not by re-testing the original repro.

## 3. Import pipeline: three separate bugs in three rounds

1. **Multer array bug.** `upload.fields()` always returns an array per
   field, even with `maxCount: 1`. The controller passed the array
   itself where a single file object was expected, so every import
   attempt crashed on `.buffer` being `undefined` — before a single CSV
   row was ever parsed.
2. **Temporal dead zone bug.** A dedup lookup was written that referenced
   the parsed CSV records before the line that actually parses them —
   an ordering mistake introduced while fixing bug #1, caught immediately
   by the resulting crash.
3. **Transaction + wipe-and-replace regression.** A later attempt to fix
   "re-importing throws a duplicate key error" wrapped the whole import
   in a MongoDB transaction and deleted all of a merchant's existing
   data before reinserting. Two problems: transactions require a replica
   set, which a standard local MongoDB isn't configured as — every
   import would fail outright in that setup — and the delete step would
   have silently wiped a merchant's *experiment* order history on any
   re-import, since experiment-flow orders share the same ownership
   scope as imported ones. Reverted to a simple, additive,
   `externalId`-based dedup instead: skip rows that already exist,
   never delete anything.

## 4. Rate-limited re-analysis, not a one-time gate

Early designs considered a minimum-conversions gate before an experiment
could be analyzed at all. The actual need was different: prevent
re-running the same statistical test on unchanged data, without ever
blocking a merchant from seeing an update once real new data exists.
The final rule — re-analysis requires at least one new completed order
in *either* group since the last analysis (not both) — was reached after
walking through a concrete asymmetric scenario: an experiment where only
the control group is converting shouldn't be permanently unanalyzable
just because the treatment group hasn't moved.

## 5. Verdict-gated actions, enforced twice

The Scale action is only meaningful after a `SCALE` verdict — offering
it during `STOP` or `INSUFFICIENT_DATA` would invite exactly the kind
of "just add more people until it looks significant" pattern real
experimentation discipline exists to prevent. This is enforced in two
places on purpose, not one: the frontend hides the button entirely
outside a `SCALE` verdict, and the backend independently rejects the
request if the experiment's stored decision isn't `SCALE` — so the rule
holds even against a direct API call, not just a UI that happens to
hide a button.

---

Every fix above was verified against the running code — by reproducing
the failure with a real script or request, not just by reading the diff
— before being considered closed.