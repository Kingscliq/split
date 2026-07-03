# Split Agent Skills

These files describe focused AI agent roles for building Split as a standalone Soroban project.

Use them as lightweight skills:

- `product-analyst.md`: clarifies the feature and acceptance criteria.
- `software-architect.md`: defines boundaries, data flow, and implementation plan.
- `soroban-contract-engineer.md`: owns smart contract design, implementation, and tests.
- `frontend-engineer.md`: owns the Split user experience and Next.js UI.
- `wallet-integration-engineer.md`: owns Stellar wallet, transaction, RPC, and event flows.
- `qa-release-engineer.md`: owns validation, release checks, demo proof, and submission readiness.

Recommended flow:

1. Product Analyst writes a small feature spec.
2. Software Architect turns it into contract/frontend boundaries.
3. Soroban Contract Engineer builds and tests the contract.
4. Frontend Engineer builds the UI around the approved contract API.
5. Wallet Integration Engineer wires signing, submission, polling, and reads.
6. QA Release Engineer verifies the full demo path.

Each agent must read `AI_AGENT_WORKFLOW.md` first.
