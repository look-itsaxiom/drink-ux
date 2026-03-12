# Research: LLM-Native Design Workflows

**Date:** 2026-03-12
**Author:** ResearchAnalyst
**Issue:** [SKI-22](https://localhost:3100/api/issues/35e8e458-6388-42fa-9cec-379d3306d53e)

This report investigates the feasibility of using Large Language Models (LLMs) and Image Generation models as autonomous design agents for the Drink-UX project.

---

## 1. LLM-Generated Wireframes (SVG/HTML)

### **Prompting Strategy: The "Decomposition" Approach**
To get high-quality UI code from an LLM, the task should be broken into three stages:
1.  **Feature Extraction:** List components and functional requirements.
2.  **Spatial Mapping:** Describe the layout hierarchy (e.g., "Centered header," "3-column grid").
3.  **Code Generation:** Output the final HTML/Tailwind or SVG.

### **Format Comparison**
*   **HTML + Tailwind CSS:** **Recommended.** LLMs are highly proficient with Tailwind's utility classes, which act as a "constrained vocabulary" preventing arbitrary design mistakes.
*   **SVG:** Best for low-fidelity "box" wireframes and precise technical diagrams. Its XML nature makes it highly compatible with LLM output.

---

## 2. Image Generation for UI Mockups (Flux & SDXL)

### **Flux (Natural Language Strength)**
*   Flux follows complex, descriptive prompts exceptionally well.
*   **Strategy:** Focus on **materiality** (e.g., "glassmorphism," "frosted glass") and **lighting** (e.g., "soft ambient glow").
*   **Example:** "Mobile app UI for a coffee shop, espresso brown and latte gold theme, high-resolution, sleek minimalist design."

### **Illustrious-XL / SDXL (Tag-Based Precision)**
*   Requires structured tags and quality markers (e.g., `masterpiece`, `absurdres`, `(UI design:1.2)`).
*   **LoRAs:** Use specialized UI LoRAs (at 0.6–0.8 strength) with specific trigger words to anchor the visual language.

---

## 3. Agent Frameworks for Design Loops

Three primary frameworks can orchestrate the design process:

| Framework | Pattern | Best For |
| :--- | :--- | :--- |
| **LangGraph** | **State Machine** | Precision control over "Nodes" (Generate -> Critique -> Refine). |
| **CrewAI** | **Role-Based** | Collaboration between a "Designer" and "Creative Director." |
| **AutoGen** | **Conversation** | Multi-agent chat where agents iterate on code/visuals together. |

---

## 4. Proposed Multi-Step Design Agent Workflow

We can build a "Design Engine" that operates as follows:

1.  **Planning Node:** LLM analyzes user personas and information architecture to create a **Design Spec**.
2.  **Generation Node:** 
    *   **Path A (Code):** LLM generates a functional React/Tailwind prototype.
    *   **Path B (Visual):** Image model (Flux) renders a high-fidelity mockup for aesthetic approval.
3.  **Critique Node:** A Vision-capable LLM (Claude 3.5 Sonnet / GPT-4o) audits the output against UX heuristics (Nielsen, a11y, brand consistency).
4.  **Refinement Loop:** The agent iterates based on the critique until a quality threshold is met.

---

## 5. Fine-Tuning and LoRAs

### **Current State**
*   **Illustrious-XL** is the current standard for fine-tuning specific UI aesthetics due to its high resolution and responsiveness to tags.
*   **Generative Engines:** The industry is moving toward "Generative Design Systems" where tokens are generated in real-time based on context rather than being picked from a static library.

### **Recommendation for Drink-UX**
*   **Start with LangGraph:** Use a state-machine approach to build a repeatable design loop.
*   **Leverage Tailwind Primitives:** Have agents generate code using a verified set of components (shadcn/ui style) to ensure "build-readiness."
*   **Use Vision for Quality Control:** Always include a vision-based critique step to catch visual errors that text-based LLMs miss.
