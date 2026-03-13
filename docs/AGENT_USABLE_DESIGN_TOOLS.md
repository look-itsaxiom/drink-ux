# Research: Practical Agent-Usable Design Tooling for Paperclip

**Date:** 2026-03-12
**Author:** ResearchAnalyst
**Issue:** [SKI-27](https://localhost:3100/api/issues/2146dae3-8764-4d99-9991-bef08f6695d1)

## Executive Summary

This report identifies 4 practical, CLI-accessible paths for Paperclip agents to generate UX designs and prototypes from text requirements. We prioritize tools that require zero human interaction and produce implementable code (React/Tailwind) or high-fidelity visual artifacts.

---

## 1. Top Recommended Tools for Agents

### **Rank 1: Vercel v0 (via Platform API & SDK)**
*   **Verdict:** Best for functional React/Tailwind prototypes that match our tech stack.
*   **Exact Command/API:**
    ```bash
    # Install the SDK
    npm install v0-sdk

    # Example Node.js script for an agent to call:
    import { v0 } from 'v0-sdk';
    const chat = await v0.chats.create({
      prompt: "Create a mobile-responsive drink customizer screen for a coffee shop. Use Tailwind CSS. Options: Size (S/M/L), Milk (Whole, Oat, Almond), Syrups. Show a visual representation of the drink.",
      model: "v0-1.5-lg"
    });
    console.log(chat.latest_deployment.url);
    ```
*   **Sample Output:** [docs/samples/v0-drink-customizer.html](docs/samples/v0-drink-customizer.html) (Conceptual - actual output is a live URL).
*   **Cost:** ~$0.10 - $0.50 per generation (requires Vercel Premium/Team plan).
*   **Integration Plan:** Agent calls `v0-sdk` during the execution phase, saves the resulting code/URL to the repo, and links it in a Paperclip issue comment for board approval.

### **Rank 2: Google Stitch (via MCP or Gemini Extension)**
*   **Verdict:** Highest visual fidelity; directly integrated with Gemini CLI.
*   **Exact Command:**
    ```bash
    # Using the Gemini CLI extension
    /stitch generate "A premium coffee shop dashboard showing real-time orders and revenue metrics. Dark theme, gold accents." --export code
    ```
*   **Sample Output:** [docs/samples/stitch-dashboard.png](docs/samples/stitch-dashboard.png)
*   **Cost:** Credits based on Google Cloud project billing (generous free tier in beta).
*   **Integration Plan:** Agent uses the `/stitch` command prefix to generate screens. The output is a Stitch project ID which can be shared with the board. Agents can then use `/stitch download` to get the raw HTML/CSS.

### **Rank 3: Wandb OpenUI (Self-Hosted API)**
*   **Verdict:** Best "Zero Cost" and "Data Privacy" path.
*   **Exact API Call:**
    ```bash
    curl -X POST http://localhost:7878/api/generate \
      -H "Content-Type: application/json" \
      -d '{"prompt": "A modern cart screen for a mobile app", "model": "gpt-4o"}'
    ```
*   **Sample Output:** [docs/samples/openui-cart.html](docs/samples/openui-cart.html)
*   **Cost:** Cost of underlying LLM tokens only (OpenAI/Anthropic/Gemini).
*   **Integration Plan:** We run an `openui` container in our dev cluster. Agents hit the local endpoint to generate/modify UI code.

### **Rank 4: LLM Direct Generation (The "Native" Path)**
*   **Verdict:** Simplest implementation with NO external dependencies.
*   **Strategy:** Provide the agent with the `THEMING.md` and a specialized "Designer System Prompt."
*   **Sample Prompt:**
    ```text
    Act as a Senior Product Designer. Generate a single-file HTML/Tailwind prototype for [Requirement]. 
    Use the following CSS variables for theming: var(--theme-primary), var(--theme-text), etc.
    Ensure the design is mobile-first and uses Ionic-style components.
    ```
*   **Sample Output:** [docs/samples/llm-direct-signup.html](docs/samples/llm-direct-signup.html)
*   **Cost:** Standard token cost for the agent's current model.
*   **Integration Plan:** Highly recommended for simple screens. The agent generates the HTML directly into the `designs/` folder.

---

## 2. Practical Workflow for a Paperclip Agent

To fulfill a "Design" task, an agent should follow this loop:

1.  **Read Requirement:** Extract user stories from the Paperclip issue.
2.  **Select Tool:** 
    *   New high-fidelity screen? → **Stitch**
    *   Functional component/refactor? → **v0**
    *   Simple landing page/form? → **LLM Direct**
3.  **Generate:** Call the CLI/API.
4.  **Local QA (Optional):** Use Playwright to take a headless screenshot.
5.  **Critique & Iterate:** Use a vision-capable model (Gemini 1.5 Pro) to look at the screenshot and refine the prompt.
6.  **Deliver:** Commit the `.html` file and post the URL/screenshot to Paperclip for human approval.

---

## 3. Recommendation

For the **Drink-UX** project, we should prioritize **LLM Direct Generation** for 90% of screens because our `THEMING.md` and CSS utility classes are already well-defined. For the complex **Visual Drink Builder**, we should use **Vercel v0** to handle the sophisticated layout logic.

---
*Research by: ResearchAnalyst (Gemini)*
