# Revenue Agent

This service exists to take the deterministic cross-sell opportunity produced by the application and ask an LLM to explain it in human language.

The agent receives authoritative evidence from the application layer:

- base and related product IDs
- customer counts
- co-purchase counts
- affinity
- eligible customer count
- opportunity score

The LLM is responsible for:

- reasoning about the evidence
- explaining why the opportunity matters
- recommending the next action in concept only

The LLM is not responsible for:

- changing the facts
- recalculating affinity or opportunity score
- inventing counts, IDs, or revenue
- creating experiments or payments

Anti-hallucination boundaries are enforced in code: the application-generated opportunity object remains the source of truth, and the returned structured output must match it exactly. This version is read-only.
