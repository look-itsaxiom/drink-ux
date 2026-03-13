# Research: Practical Agent-Usable Design Tooling for Paperclip

**Date:** 2026-03-12
**Author:** ResearchAnalyst (Gemini)
**Issue:** [SKI-27](https://localhost:3100/api/issues/2146dae3-8764-4d99-9991-bef08f6695d1)

## Executive Summary

The previous research surveyed the general landscape, but this report focuses strictly on **headless, programmatic design tools** that Paperclip agents (CLI processes) can use to generate, refine, and deliver UX designs for board approval.

---

## 1. Ranked Practical Tools for Agents

### **#1. Vercel v0 (Platform API)**
*   **Best For:** High-fidelity React/Tailwind components.
*   **Agent Interaction:** Fully callable via the `v0-sdk` (NPM) or direct HTTP requests.
*   **Working Example:** See `designs/scripts/v0-example.ts`.
*   **Output:** Functional React code + hosted preview URL for the board.
*   **Cost:** Token-based pricing (~$1.00 per 1M tokens for Mini model). Requires a $20/mo subscription for the Platform API.
*   **Verdict:** Most professional and "design-aware" tool for production-ready components.

### **#2. Direct LLM Generation (The "Autonomous Designer")**
*   **Best For:** Rapid prototyping, wireframes, and cost-efficiency.
*   **Agent Interaction:** Use a specialized system prompt (see `designs/scripts/design-prompt.md`) with local brand context (`docs/mobile/THEMING.md`).
*   **Working Example:** Generated `designs/prototypes/drink-customizer-v1.html` locally using this approach.
*   **Output:** Standalone HTML/Tailwind mockup files.
*   **Cost:** $0 (included in the agent's LLM budget).
*   **Verdict:** Highly effective when paired with a "Critique Loop" to ensure visual quality.

### **#3. Excalidraw MCP Server**
*   **Best For:** Low-fidelity "sketchy" wireframes and user flow diagramming.
*   **Agent Interaction:** MCP tool calls (`create_diagram`, `update_elements`).
*   **Output:** JSON-based editable diagrams or exported PNG/SVG.
*   **Cost:** Free (open source).
*   **Verdict:** Excellent for the ideation phase to align with the board on flows before high-fidelity work.

### **#4. Playwright + Vision Critique (The Feedback Loop)**
*   **Best For:** Quality assurance and self-correction.
*   **Agent Interaction:** Playwright CLI (headless) + LMM Vision API (Gemini/GPT).
*   **Working Example:** See `designs/scripts/critique-loop.ts`.
*   **Workflow:** Generate -> Screenshot -> Analyze -> Refine.
*   **Verdict:** Essential for agents to "see" their own designs and fix contrast/hierarchy issues autonomously.

---

## 2. Competitive Analysis: Agent Accessibility

| Feature | Vercel v0 | Direct LLM | Excalidraw MCP | Galileo AI |
| :--- | :--- | :--- | :--- | :--- |
| **CLI/API Call** | `v0-sdk` | Native | `mcp-call` | REST (Eval only) |
| **Aesthetic Sense** | High | Medium (Prompt) | Low (Sketchy) | High |
| **Automation** | 100% | 100% | 100% | 50% (Web-first) |
| **Output Type** | Code | Code/HTML | Diagram | Figma/Code |
| **Cost** | Paid ($) | Free | Free | Paid ($) |

---

## 3. Integration Plan: The "Design heartbeat"

To empower agents to design autonomously, we recommend the following workflow:

1.  **Step 1: Ideation (Excalidraw MCP)**
    - Agent generates a sketchy wireframe of the user flow.
    - Board approves the functional flow.
2.  **Step 2: Prototyping (Direct LLM or v0)**
    - Agent uses the "Ultimate Designer Prompt" to generate an HTML/Tailwind mockup.
    - Agent commits the file to `designs/prototypes/`.
3.  **Step 3: Self-Critique (Playwright Loop)**
    - Agent runs a headless browser to capture a screenshot.
    - Agent uses its Vision capability to audit against brand tokens.
4.  **Step 4: Board Review**
    - Agent posts a Paperclip comment with the screenshot/URL.
    - Status moved to `in_review`.
5.  **Step 5: Implementation**
    - Once approved, the `FrontendEngineer` agent uses the generated HTML as the source of truth for implementation.

---

## 4. Immediate Recommendations

1.  **Setup v0 Platform API:** If the budget allows, generate a `V0_API_KEY` for agents to use for complex UI tasks.
2.  **Adopt the "Designer Prompt":** Standardize all agents to use the prompt in `designs/scripts/design-prompt.md` for consistent UX.
3.  **Install Playwright in CI:** Ensure browser binaries are available for agents to run self-critique loops.
