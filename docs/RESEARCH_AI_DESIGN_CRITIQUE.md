# Research: Agent-Compatible Design Review and Critique Tools

**Date:** 2026-03-12
**Author:** ResearchAnalyst
**Issue:** [SKI-24](https://localhost:3100/api/issues/fc36469c-acf6-409f-9ddc-3502f84fec93)

This report investigates tools and techniques for automated design critique and UX evaluation, specifically for agents to use without a human designer.

---

## 1. Vision-Model Based Critique

### **LMM-Powered UX Audits (Claude 3.5 Sonnet / GPT-4o / Gemini 1.5 Pro)**
*   **Approach:** Capture screenshots of the app (using Playwright or Puppeteer) and feed them to an LMM with a specific heuristic audit prompt.
*   **Effectiveness:** Recent benchmarks show 95% accuracy in matching human expert evaluations for heuristic audits (Nielsen, etc.).
*   **Actionable Feedback:** Can identify issues with layout hierarchy, spacing, accessibility (visual), and call-to-action prominence.

### **Baymard UX-Ray**
*   **Purpose:** Automated UX audits for e-commerce and QSR.
*   **Capability:** Uses research-backed heuristics to analyze sites and provide scores and specific recommendations.
*   **Relevance:** High. Since we are in the ordering (QSR) space, Baymard’s research is directly applicable.

---

## 2. Automated Visual Consistency and a11y

### **Applitools & Percy**
*   **Purpose:** Visual AI for regression testing.
*   **Capability:** Identifies visual differences between versions or across devices that are semantically meaningful (ignores noise).
*   **Agent Use:** A QA agent can use Percy to verify that a styling change in a component didn't break other screens.

### **axe-core (Deque)**
*   **Purpose:** Automated accessibility (a11y) testing.
*   **Agent Use:** Can be integrated into CI/CD or run by an agent via Playwright to ensure 100% code-level a11y compliance.

---

## 3. Synthetic User Testing

### **Uxia & Synthetic Users**
*   **Approach:** AI personas navigate the app and provide feedback based on demographic and behavioral profiles.
*   **Use Case:** Test the "checkout flow" or "drink customization" with a "fussy" or "hurried" persona to find friction points.
*   **Benefit:** Provides a "second opinion" on UX flows before real human testing.

### **Attention Insight**
*   **Purpose:** AI heatmaps.
*   **Use Case:** Predict where a user’s eye will land on the ordering screen.
*   **Goal:** Ensure the "Add to Cart" button is the most salient element.

---

## 4. Proposed "Design-Review Agent" Workflow

To close the feedback loop for the `FrontendEngineer`, we can implement a **Critique Loop**:

1.  **Capture Stage:** An agent runs Playwright to screenshot all main screens (Dashboard, Catalog, Customizer, Checkout).
2.  **Audit Stage:** Screenshots are sent to a "Critique Agent" (LMM Vision).
    -   **Prompt:** "Analyze these screens for Drink-UX. Heuristics: Accessibility, Consistency, Visual Balance, Clarity. Brand: Warm, inviting, craft coffee."
3.  **Synthesis Stage:** Critique Agent outputs a structured JSON report.
4.  **Issue Generation Stage:** A "Review Orchestrator" agent parses the JSON and files sub-issues for the `FrontendEngineer` via Paperclip.

### **Draft Critique Prompt Structure:**
```markdown
# Role
You are a Senior UX Researcher specializing in mobile-first QSR (Quick Service Restaurant) ordering.

# Task
Audit the attached screenshots for the Drink-UX app.

# Context
Drink-UX is a visual drink builder for coffee shops. It must feel "premium" and "craft."

# Heuristics to Check
1. **Consistency:** Do buttons and colors match the established design tokens?
2. **Visual Hierarchy:** Is the most important action (Add to Cart) obvious?
3. **Accessibility:** Are tap targets large enough? Is text readable over backgrounds?
4. **Information Density:** Is the screen too crowded for a busy coffee shop customer?

# Output Format
Markdown list of issues with severity (Critical, Major, Minor) and actionable fix suggestions.
```

---

## 5. Summary Recommendation

1.  **Integrate Playwright Screenshots:** Start by automating the capture of all UI states in CI/CD.
2.  **Deploy a "Heuristic Auditor" Agent:** Create a tool for agents to "ask for a critique" on any UI change.
3.  **Use Synthetic Users for Flow Validation:** Run a "digital pilot" for the ordering flow to identify non-visual friction points.
