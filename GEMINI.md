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
