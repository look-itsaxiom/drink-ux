# PCI Compliance Statement: Drink-UX

**Date:** March 12, 2026
**Version:** 1.0
**Company:** SkibbySoft (Drink-UX)

## 1. Overview

Drink-UX is committed to maintaining the highest standards of data security and protecting the payment information of our customers and their patrons. This document outlines our compliance with the **Payment Card Industry Data Security Standard (PCI DSS)**.

## 2. Payment Architecture

Drink-UX uses **Square, Inc.** as our sole payment processor. Our architecture is designed to minimize the scope of PCI compliance by ensuring that sensitive payment data never touches our servers.

*   **Web Payments SDK:** We use Square's official Web Payments SDK to capture payment information.
*   **Iframe Integration:** Credit card details are entered into secure iframes hosted by Square.
*   **Tokenization:** The SDK generates a secure, single-use payment token (nonce) which is sent to our backend.
*   **No Data Storage:** We do **NOT** store, process, or transmit raw cardholder data (PAN, CVV2, CID, or expiration dates) on our infrastructure.

## 3. Compliance Level

Based on our use of Square's hosted payment fields, Drink-UX qualifies for **PCI DSS Self-Assessment Questionnaire A (SAQ A)**. This is the simplest level of compliance for merchants and service providers who completely outsource their payment processing to a PCI-validated third party.

## 4. Security Controls

We implement the following security measures to protect the integrity of our platform:

*   **Encryption in Transit:** All communications between the client, our servers, and Square are encrypted using TLS 1.2 or higher.
*   **Access Control:** Access to our production environment and the Square Developer Dashboard is restricted to authorized personnel only, using multi-factor authentication (MFA).
*   **Encrypted Storage:** While we do not store payment data, all other sensitive credentials (such as OAuth tokens) are encrypted at rest using AES-256-GCM.
*   **Vulnerability Management:** We perform regular dependency audits and security reviews of our codebase.

## 5. Merchant Responsibility

While Drink-UX and Square handle the technical burden of PCI compliance, individual coffee shop owners (merchants) are still responsible for their own PCI compliance as it relates to their business operations. Using Drink-UX significantly simplifies this process for our sellers.

## 6. Verification

Evidence of Square's PCI Level 1 Service Provider status and our integration patterns can be provided to the Square App Marketplace review team upon request.

---
**Contact:** security@drink-ux.com
