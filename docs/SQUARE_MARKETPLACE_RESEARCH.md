# Square App Marketplace Research

**Status:** Draft
**Last Updated:** 2026-03-12
**Author:** ResearchAnalyst

This document outlines the requirements and process for listing Drink-UX on the Square App Marketplace.

---

## 1. Eligibility Requirements

Before we can submit for a listing, we must meet these criteria:

*   **Active User Base:** We must have at least **five active Square sellers** currently using our app integration. (Linked to SKI-14)
*   **App Partnership Approval:** We must apply and be approved as a **Square App Partner**. This is a one-time approval ensuring our app provides value to Square sellers.
*   **Legal Agreement:** Must accept the **Partner Integrated Marketplace Agreement (PIMA)**.
*   **OAuth Integration:** Already implemented. Sellers must be able to securely connect their Square accounts via OAuth.

---

## 2. Technical Requirements

Square provides interactive checklists based on the APIs used (Catalog, Orders, Payments).

### General Compliance:
*   **Error Handling:** Graceful handling of HTTP 4XX and 5XX errors with user-friendly messages.
*   **Rate Limiting:** Implementation of exponential backoff for rate-limit errors.
*   **Pagination:** Correct use of the `cursor` field for paginating results.
*   **Security:** HTTPS only, no token exposure. Tokens must be encrypted at rest (already implemented with AES-256-GCM).
*   **Webhook Verification:** Square requires webhook verification (CTO task: SKI-8).

### Use Case Specifics:
*   **Orders API:** Correct itemization, handling of taxes/fees via Square Order object.
*   **Web Payments SDK:** Must use Square's hosted card form for PCI compliance.
*   **Catalog API:** Efficient syncing and mapping of modifiers to visual assets.

---

## 3. Review Process

| Stage | Duration | Action |
|-------|----------|--------|
| **Initial Review** | ~14 business days | Square reviews the partner application and basic app info. |
| **QA Testing** | Varies | Square's Partner Quality team performs functional and usability testing. |
| **Video Submission** | Required | Must provide a 1080p+ screen capture of the onboarding and key integration flows. |
| **Feedback/Iteration** | Varies | Address bugs or UX issues identified by Square. |
| **Content Approval** | Simultaneous | Marketplace team reviews marketing content and listing details. |
| **Publication** | A few days | App goes live on the marketplace. |

**Total estimated time: 4-8 weeks from submission.**

---

## 4. Fees & Revenue Sharing

*   **App Marketplace Fee:** **20% revenue share** to Square for apps sold through the marketplace.
*   **Referral Revenue:** Potential **10% referral revenue share** from Square for bringing new sellers to the platform.

---

## 5. Required Listing Materials (Marketing)

*   **App Icon:** Square-specific template required.
*   **Media Gallery:** High-quality screenshots and videos showing the app in action.
*   **App Name:** Unique, max 32 characters.
*   **Tagline:** One-sentence summary, max 80 characters.
*   **Key Features:** Exactly **three** key features required.
*   **Technical Requirements:** Up to four (e.g., "Square POS required").
*   **Support:** Dedicated support email/URL required (SKI-15).

---

## Next Steps for Drink-UX

1.  **Draft Listing Content:** Prepare the 32-char name, 80-char tagline, and 3 key features (See `docs/MARKETPLACE_LISTING_DRAFTS.md`).
2.  **Verify GTM Progress:** Monitor SKI-14 to ensure we hit the 5-seller requirement.
3.  **Prepare QA Video:** Once the E2E flow (SKI-5) is stable, record the required onboarding and ordering walkthroughs.
4.  **Implement Webhooks:** Coordinate with CTO on SKI-8 to ensure webhook verification is ready.
