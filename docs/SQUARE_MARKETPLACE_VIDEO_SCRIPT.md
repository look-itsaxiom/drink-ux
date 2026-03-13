# Square App Marketplace: QA Video Submission Script

**Status:** Draft
**Last Updated:** 2026-03-12
**Author:** ResearchAnalyst
**Target:** ProductDesigner / CTO

This document provides a structured script and checklist for the required Square App Marketplace QA video. Square uses this video to verify integration functionality, not for marketing.

---

## Video Specifications
*   **Resolution:** 1080p or higher.
*   **Audio:** Voice-over narration required.
*   **Duration:** 2–5 minutes.
*   **Format:** Streaming link (YouTube/Loom/Vimeo).

---

## Script & Sequence

### Phase 1: Introduction & Sign-in (30s)
*   **Visual:** Show the Drink-UX Admin login page.
*   **Narration:** "Hello, this is a demonstration of the Drink-UX integration with Square. We'll start by logging into the Drink-UX admin dashboard as a coffee shop owner."
*   **Action:** Log in to a test account.

### Phase 2: Square OAuth Flow (1m)
*   **Visual:** Navigate to "Settings" -> "Connect Square".
*   **Narration:** "Now, we will connect this account to Square. We click 'Connect Square', which redirects us to the Square OAuth authorization page."
*   **Action:** Click the button, show the Square OAuth screen, and authorize permissions.
*   **Narration:** "Once authorized, we are redirected back to Drink-UX, where we securely store the encrypted access tokens."

### Phase 3: Catalog Sync (1m)
*   **Visual:** Show the "Menu Management" page.
*   **Narration:** "Upon connection, Drink-UX automatically imports the Square catalog. You can see the categories and items imported directly from the Square POS here."
*   **Action:** Scroll through the imported list. Point out a few items.
*   **Narration:** "The owner can then use our guided wizard to categorize these items into our visual builder format."

### Phase 4: Customer Ordering Flow (1.5m)
*   **Visual:** Switch to the Mobile PWA (Customer View).
*   **Narration:** "Now, we'll demonstrate the customer ordering experience. A customer opens the shop's unique URL on their mobile device."
*   **Action:** Pick a drink (e.g., Latte), show the visual customization (Milk, Syrup), add to cart.
*   **Narration:** "The customer builds their drink visually. Every selection is mapped to a specific modifier ID in the Square catalog."
*   **Action:** Proceed to checkout, enter test payment details.
*   **Narration:** "We'll complete the checkout using Square's Web Payments SDK."

### Phase 5: Verification in Square Dashboard (1m)
*   **Visual:** Switch to the Square Sandbox Dashboard (Orders tab).
*   **Narration:** "Finally, we verify that the order has successfully reached the Square POS. Here is the order we just placed, with all line items and modifiers correctly reflected."
*   **Action:** Open the order details in Square Dashboard.
*   **Narration:** "This completes the end-to-end integration demonstration. Thank you."

---

## Critical Checklist for Success
- [ ] **Use Sandbox Data:** Do not show real credit cards or customer emails.
- [ ] **Show the "Redirect":** Square MUST see the actual handoff to their OAuth page and back.
- [ ] **Verify IDs:** Ensure the items in the Square Dashboard match what was selected in the app.
- [ ] **No Dead Air:** Keep the narration consistent throughout the actions.
- [ ] **1080p Clear View:** Ensure all text and IDs are readable in the screen capture.

---

## Reference
[Square App Marketplace Submission Guide](https://developer.squareup.com/docs/app-marketplace/submission-guide)
