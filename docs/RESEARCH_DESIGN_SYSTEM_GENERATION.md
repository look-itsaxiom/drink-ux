# Research: AI-Driven Design System Generation

**Date:** 2026-03-12
**Author:** ResearchAnalyst
**Issue:** [SKI-23](https://localhost:3100/api/issues/ebe553d2-1fd0-4cd6-bb99-86c838ed1cd3)

This report investigates tools and approaches for generating a cohesive design system from brand identity and domain context, specifically for the Drink-UX project.

---

## 1. Automated Design System Generation Tools

### **Looka & Brandmark**
*   **Purpose:** Rapid brand identity generation (logos, palettes, typography).
*   **Workflow:** Takes brand keywords (e.g., "warm," "inviting," "craft coffee") and industry context to generate a visual kit.
*   **Output:** Hex codes, font pairings, and logo assets.
*   **Relevance to Drink-UX:** Good for initial brand seeding.

### **Figma AI (Make Design)**
*   **Purpose:** Generates UI components and layouts within Figma that respect established tokens.
*   **Workflow:** Prompts like "Generate a mobile ordering screen for a coffee shop using our warm-inviting theme."
*   **Output:** Editable Figma frames with auto-layout.

### **Reloom & Framer AI**
*   **Purpose:** AI-driven site mapping and layout generation.
*   **Workflow:** Takes a sitemap or description and generates wireframes/layouts that can be "shuffled" with different brand styles.

---

## 2. Automating the Figma-to-Code Pipeline

To bridge the gap between design and implementation, we can use a **Design Token Architecture**:

### **Tokens Studio for Figma**
*   Allows designers (or agents) to define semantic tokens in Figma (e.g., `brand.primary`, `spacing.medium`).
*   Syncs with GitHub/GitLab as JSON files.

### **Style Dictionary**
*   A build system that takes design token JSONs and transforms them into platform-specific variables (CSS variables, SCSS, TypeScript constants, Android XML, iOS Swift).
*   **Agent Workflow:** An agent can update the JSON tokens based on a prompt, and Style Dictionary automatically regenerates the `theme.json` used by our mobile app.

---

## 3. Architecture of v0.dev and Bolt.new

### **v0.dev (Vercel)**
*   **Strategy:** Uses **shadcn/ui + Tailwind CSS**.
*   **Why:** shadcn/ui provides raw source code (primitives). This allows the LLM to "see" the implementation and modify it semantically.
*   **Design Quality:** Managed through a **Component Registry**. The AI doesn't just "hallucinate" CSS; it composes from a verified set of accessible primitives.

### **Bolt.new (StackBlitz)**
*   **Strategy:** Tight feedback loop via **WebContainers**.
*   **Why:** Allows the AI to run the code, see the result, and self-correct. It uses a "full-stack sandbox" approach where the design is verified by execution.

---

## 4. Proposed Design-System-Generator Agent

We can create a specialized agent with the following workflow:

1.  **Input Analysis:** Takes brand identity (Drink-UX: warm, inviting, fast, mobile-native) and product requirements.
2.  **Token Generation:** Generates or updates `packages/mobile/theme.json` with semantic tokens.
3.  **Pattern Definition:** Outputs visual guidelines (e.g., "Use 24px border-radius for a friendly feel," "Use soft gradients instead of flat colors").
4.  **Implementation Instructions:** Provides specific CSS/Tailwind instructions for other agents to follow.

### **Draft Token Schema for Drink-UX "Warm Coffee" Theme:**
```json
{
  "name": "warm-coffee",
  "colors": {
    "primary": "#6B4226",       // Rich Espresso
    "primaryDark": "#4A2C1A",   // Dark Roast
    "secondary": "#D4A574",     // Latte Gold
    "background": "#FDF8F5",    // Creamy White
    "surface": "#FFFFFF",
    "text": "#2C1810",          // Coffee Bean Black
    "textSecondary": "#8B7E74", // Steamed Milk Grey
    "accent": "#E67E22",        // Caramel Orange
    "success": "#27AE60",
    "warning": "#F1C40F",
    "error": "#E74C3C"
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #6B4226 0%, #8B5A3C 100%)",
    "secondary": "linear-gradient(135deg, #D4A574 0%, #E6BE8A 100%)"
  },
  "typography": {
    "fontFamily": "'Outfit', sans-serif",
    "baseSize": "16px",
    "scale": 1.25
  },
  "spacing": {
    "unit": "4px",
    "containerPadding": "24px"
  }
}
```

---

## 5. Recommendation

1.  **Adopt shadcn/ui (long-term):** For the web/admin portal, adopt shadcn/ui to make it "agent-friendly" like v0.dev.
2.  **Evolve `theme.json`:** Expand our mobile theming system to include more tokens (spacing, typography, border-radius) and use **Style Dictionary** to manage them.
3.  **Create a "Visual Identity Agent":** This agent would be responsible for "theming" the app based on new brand inputs, ensuring consistency across all packages.
