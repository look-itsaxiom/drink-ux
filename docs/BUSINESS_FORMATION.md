# Business Formation Requirements: Drink-UX SaaS

This document outlines the requirements, options, and tradeoffs for establishing a legal business entity for Drink-UX. 

## 1. Entity Type: LLC vs. S-Corp vs. C-Corp

For a US-based solo SaaS founder, the choice depends on long-term funding goals.

| Entity Type | Best For | Tax Treatment | Complexity |
| :--- | :--- | :--- | :--- |
| **LLC** | Bootstrapping, solo-run businesses | Pass-through (Self-employment tax on all profit) | Low |
| **S-Corp** | Profit > $80k–$100k | Pass-through (Tax savings via salary/distribution split) | Medium |
| **C-Corp** | Venture Capital (VC) track | Double Taxation (Tax-free exit potential via QSBS) | High |

### Recommendations:
- **Bootstrapper Track:** Start as a **Wyoming LLC**. If net profit exceeds $80k, elect **S-Corp status** to save on self-employment taxes.
- **Venture Track:** Form a **Delaware C-Corp** immediately to satisfy investor requirements and start the 5-year clock for **QSBS** (capital gains tax exclusion).

## 2. State of Incorporation: Delaware vs. Wyoming

| Consideration | Delaware | Wyoming |
| :--- | :--- | :--- |
| **Primary Use** | Raising Venture Capital | Bootstrapping & Solo Founders |
| **Annual Fees** | High ($225+ min) | Low ($60 min) |
| **State Income Tax** | 0% (if no local revenue) | 0% |
| **Privacy** | Public record of officers | High (Anonymous ownership possible) |
| **Legal System** | Advanced Court of Chancery | Basic |

**Recommendation:** 
- Choose **Delaware** ONLY if planning to raise VC funds in the next 12–18 months. 
- Choose **Wyoming** for all other solo SaaS scenarios due to lower costs and higher privacy.

## 3. Square App Marketplace Requirements

To publish on the Square App Marketplace, the following are required:

- **Employer Identification Number (EIN):** Required for tax reporting.
- **Identity Verification:** Square requires a government-issued ID and a "selfie" for identity verification of the business owner.
- **Active User Threshold:** **Crucial Requirement:** You must have at least **5 active Square sellers** already using your integrated app before you can apply for a formal partnership listing.
- **Revenue Share:** Square takes a **20% share** of all marketplace sales.
- **Compliance:** Must adhere to PCI DSS (Data Security Standards).

## 4. Business Banking Options

| Bank | Best For | Key Features |
| :--- | :--- | :--- |
| **Mercury** | Solo & early-stage tech | $0 fees, no minimums, excellent UI/API, free wires. |
| **Brex** | VC-backed / High-revenue | Advanced expense management, high credit limits. |
| **Traditional (Chase/etc.)** | Local needs | Branch access, but high fees and poor tech integration. |

**Recommendation:** **Mercury** is the industry standard for solo SaaS startups due to zero costs and superior tech integration.

## 5. Key Costs (Estimated)

| Item | Wyoming (LLC) | Delaware (C-Corp) |
| :--- | :--- | :--- |
| **Formation Fee** | ~$100 | ~$90–$100 |
| **Registered Agent** | $50–$150 / year | $50–$300 / year |
| **Annual Report/Tax** | $60 / year | $225 / year (min) |
| **Total Year 1 Cost** | **~$250** | **~$500+** |

## 6. Formation Timeline

1. **Entity Formation:** 1–3 business days (Delaware/Wyoming online filing).
2. **EIN Acquisition:** Immediate online (once entity is formed).
3. **Bank Account (Mercury):** 1–3 business days after receiving Articles and EIN.
4. **Square Marketplace Submission:** Can begin immediately, but listing won't be approved until the **5-active-user** threshold is met.

**Total time to "Legal Foundation": 1–2 weeks.**
