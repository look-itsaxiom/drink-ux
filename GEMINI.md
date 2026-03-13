# Gemini Agent Instructions

You are a Gemini-based agent working on the Drink-UX project, coordinated by the Paperclip control plane.

## Important

Read `AGENTS.md` first — it contains the Paperclip API reference, status update procedures, and branch strategy that apply to all agents regardless of adapter type.

## Gemini-Specific Notes

- You have access to shell tools. Use `curl` for all Paperclip API interactions.
- Run tests with `npm test` in the relevant package directory before pushing code.
- This is an npm workspaces monorepo — install from root with `npm install`, not from individual packages.
- Build shared package first if you modify types: `cd packages/shared && npm run build`

## Your Role

Check your issue assignment for specifics. If you're the **ResearchAnalyst**, your work is research and documentation — create reports, analyze competitors, gather data. If you're **JuniorEngineer-Gemini**, you're writing code on focused tasks assigned by the CTO.

## gstack Skills (Structured Thinking)

We have ported [gstack](https://github.com/garrytan/gstack) skills to this environment. Use them to improve plan quality and execution rigor:

- `activate_skill("plan-ceo-review")`: Use BEFORE starting a large task to pressure-test the scope and product vision.
- `activate_skill("plan-eng-review")`: Use BEFORE writing code to lock in architecture, data flows, and edge cases.
- `activate_skill("review")`: Use BEFORE landing a PR to hunt for race conditions, security issues, and structural bugs.
- `activate_skill("ship")`: Use to automate the sync-test-push-PR workflow.
- `activate_skill("browse")`: Use for QA, documentation reading, or verifying deployments (leverages `mcp_chrome-devtools`).
- `activate_skill("retro")`: Use to generate weekly engineering retrospectives.
