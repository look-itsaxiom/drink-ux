# Evaluation: gstack Skills for Agent Capability Upgrades

This report evaluates the integration of Garry Tan's [gstack](https://github.com/garrytan/gstack) skills into the Drink-UX agent environment, as requested in SKI-57.

## 1. Executive Summary

`gstack` is a collection of six opinionated workflow skills designed for **Claude Code**. It transforms a generic AI agent into a "team of specialists" by providing explicit cognitive modes (CEO, Eng Lead, QA, etc.). 

For our environment (**Gemini CLI**), `gstack` provides a high-value blueprint for agent orchestration. While the literal installation script depends on Bun (which is currently unavailable in our environment), the **core logic and prompts** can be easily adapted as native Gemini CLI skills.

## 2. Skill Mapping & Benefits

| gstack Skill | Gemini CLI Equivalent | Primary Beneficiaries | Value Proposition |
| :--- | :--- | :--- | :--- |
| `/plan-ceo-review` | `gstack-ceo-review` | CEO, ResearchAnalyst | Forces "founder-mode" pressure testing of product scope (Expand, Hold, or Reduce). |
| `/plan-eng-review` | `gstack-eng-review` | CTO, BackendEngineer | Locks in technical architecture, state machines, and edge cases via ASCII diagrams. |
| `/review` | `gstack-review` | All Engineers | "Paranoid" code review focusing on structural integrity, SQL safety, and race conditions. |
| `/ship` | `gstack-ship` | All Engineers | Automates the "final mile": sync, test, version bump, push, and PR. |
| `/browse` | `gstack-browse` | ProductDesigner, QA | Provides "eyes" to verify visual/functional state. (Note: Adapt to use existing `mcp_chrome-devtools`). |
| `/retro` | `gstack-retro` | CEO, CTO | Data-driven weekly retrospective based on git history and commit patterns. |

## 3. Implementation Strategy for Gemini CLI

### A. Skill Installation
Gemini CLI supports skills via the `activate_skill` tool. We can "install" `gstack` by creating the following directory structure:

```bash
~/.gemini/skills/
  gstack-ceo-review/SKILL.md
  gstack-eng-review/SKILL.md
  ...
```

### B. Adapting `/browse` (Critical Finding)
The `gstack` `/browse` skill relies on a custom Bun-based Chromium daemon. However, our environment already has the **`mcp_chrome-devtools`** extension installed, which provides superior capabilities (A11y tree snapshots, Lighthouse audits, network inspection).

**Recommendation:** Implement `gstack-browse` as a set of instructions that leverage the `mcp_chrome-devtools` tools instead of the `gstack` custom binary. This avoids the Bun dependency entirely while providing the same "agent eyes" functionality.

### C. Provisioning
Since Bun is not available, the standard `gstack` setup script will fail. We should provision these skills as **Markdown-only extensions**:
1.  Port the prompts from the `gstack` repository to Gemini-compatible `SKILL.md` files.
2.  Include these in the base agent image or as a project-level extension in `.gemini/skills/`.
3.  Instruct agents via `GEMINI.md` to use these skills during specific lifecycle phases.

## 4. Licensing

`gstack` is licensed under the **MIT License**. We are free to use, modify, and redistribute the prompts and logic within our project.

## 5. Recommendation

**PROCEED with a "Native Port" of gstack logic.**

1.  **Do not** attempt to install the literal `gstack` repository due to the Bun dependency.
2.  **Create** a custom `packages/shared/skills/gstack/` directory containing the adapted `SKILL.md` files.
3.  **Prioritize** `gstack-ceo-review` and `gstack-eng-review` for the ResearchAnalyst and JuniorEngineer agents to improve plan quality.
4.  **Rewrite** `gstack-browse` to use the existing `mcp_chrome-devtools` MCP server.

---
*Evaluated by: ResearchAnalyst (Gemini)*
