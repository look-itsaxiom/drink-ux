# Strategy: Establishing the Drink-UX Design Department

**Date:** 2026-03-12
**Status:** Proposal
**Author:** ResearchAnalyst (Gemini)
**Issue:** [SKI-20](https://localhost:3100/api/issues/a9ef8a24-001f-41e8-a926-3440ad834710)

## 1. The Challenge: Bridging the "Design Gap"

Currently, our `FrontendEngineer` agents can implement UI code, but they lack "design sense"—the ability to translate business requirements into a cohesive, high-quality user experience. Traditional design-to-code tools (Figma Dev Mode, Locofy) fail because they assume designs already exist.

**The Mission:** Establish an autonomous "Design Department" capability that generates polished, sellable UX directly from **understanding** (business requirements, user personas, and information architecture).

---

## 2. The AI-Driven Design Stack

Based on extensive research ([SKI-21](./RESEARCH_AI_DESIGN_TOOLS.md), [SKI-22](./RESEARCH_LLM_NATIVE_DESIGN.md), [SKI-27](./RESEARCH_AGENT_DESIGN_TOOLS_PRACTICAL.md)), we propose a three-tier toolset for agents:

### **Tier 1: Ideation & Flow (Excalidraw MCP)**
*   **Purpose:** Aligning with the Board on user flows and layout logic before high-fidelity work.
*   **Interaction:** Agents use MCP tool calls to build "sketchy" wireframes.
*   **Deliverable:** `designs/wireframes/*.json` (editable) or SVG exports.

### **Tier 2: High-Fidelity Prototyping (Vercel v0 + Direct LLM)**
*   **Purpose:** Producing polished, themed UI components and screen mockups.
*   **Interaction:** 
    *   **Vercel v0:** For production-grade React/Tailwind components via the `v0-sdk`.
    *   **Direct LLM:** For rapid iteration using the "Ultimate Agent Designer" prompt and local design tokens (`packages/mobile/theme.json`).
*   **Deliverable:** `designs/prototypes/*.html` (interactive previews).

### **Tier 3: The Critique Loop (Playwright + Vision)**
*   **Purpose:** Quality control and autonomous self-correction.
*   **Interaction:** Headless browser screenshots analyzed by a Vision-capable LMM (Gemini 1.5 Pro or Claude 3.5 Sonnet).
*   **Workflow:** Generate -> Screenshot -> Audit (Heuristics + Brand) -> Refine.

---

## 3. The Autonomous Design Workflow

Every new feature or screen follows this repeatable "Design Heartbeat" cycle:

1.  **Requirement Synthesis:** The `ProductDesigner` agent analyzes the Paperclip issue and writes a **Design Spec** (IA, user stories, component list).
2.  **Visual Prototyping:** The agent generates an interactive HTML/Tailwind prototype using the "Ultimate Designer Prompt."
3.  **Self-Critique:** The agent runs the `critique-loop.ts` script to identify visual flaws (contrast, hierarchy, spacing).
4.  **Board Review:** The agent posts a screenshot and a hosted preview URL to the Paperclip issue for human approval.
5.  **Implementation Handoff:** Once approved, the `FrontendEngineer` agent uses the prototype as the "source of truth" implementation spec.

---

## 4. Integration with the "Mapping Layer" Pivot

The [Mapping Layer Pivot](./plans/2026-02-10-mapping-layer-pivot.md) shifts Drink-UX from menu management to a "smart bridge." The Design Department will prioritize these key flows:

*   **The "Zero-to-One" Onboarding:** A delightful "Discovery" flow where we fetch a shop's Square catalog and use AI to suggest the initial categorization (Bases vs. Modifiers).
*   **The Visual Drink Builder:** A dynamic interface that renders customization options (Milk, Syrups, Toppings) fetched live from Square, while maintaining the "Warm & Craft" Drink-UX aesthetic.
*   **The "New Item" Notification:** A subtle UI for shop owners to categorize newly detected Square items without friction.

---

## 5. Implementation Roadmap

### **Phase 1: Infrastructure (Week 1)**
*   [ ] Provision `V0_API_KEY` for agents.
*   [ ] Ensure Playwright binaries are in CI/CD and agent environments.
*   [ ] Standardize `designs/scripts/design-prompt.md` as a global agent skill.

### **Phase 2: Component Registry (Week 2)**
*   [ ] Build a library of "Approved Primitives" based on Ionic and Tailwind.
*   [ ] Update `packages/mobile/theme.json` with semantic tokens (Brand, Surface, Text).

### **Phase 3: The Design Agent Persona (Week 3)**
*   [ ] Create a dedicated `ProductDesigner` agent role with high vision-critique capabilities.
*   [ ] Automate the "Screenshot -> Critique -> Issue" loop for all major screens.

---

## 6. Success Metrics
*   **Time to Approval:** 80% of design prototypes approved by the Board on the first iteration.
*   **Implementation Fidelity:** 100% match between the approved prototype and the final code.
*   **User Sentiment:** "Drink-UX looks like a bespoke craft app, not a generic POS template."
