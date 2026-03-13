# Research: Square Order Webhooks for Status Tracking

**Date:** 2026-03-12
**Author:** ResearchAnalyst
**Target:** CTO / BackendEngineer

This document details the research for implementing Square `order.updated` webhooks to keep Drink-UX order statuses in sync with the Square POS.

---

## 1. Webhook Event: `order.updated`

Square triggers the `order.updated` event whenever an `Order` object is modified (states, line items, fulfillments).

### Payload Envelope (Example)
The `data.object.order` contains the updated order details.

```json
{
  "merchant_id": "5S9MXCS9Y99KK",
  "type": "order.updated",
  "event_id": "b3adf364-4937-436e-a833-49c72b4baee8",
  "created_at": "2020-04-16T23:16:30.789Z",
  "data": {
    "type": "order",
    "id": "eA3vssLHKJrv9H0IdJCM3gNqfdcZY",
    "object": {
      "order": {
        "id": "eA3vssLHKJrv9H0IdJCM3gNqfdcZY",
        "location_id": "FPYCBCHYMXFK1",
        "state": "OPEN",
        "version": 6,
        "updated_at": "2020-04-16T23:16:30.789Z",
        "fulfillments": [
          {
            "uid": "f1",
            "type": "PICKUP",
            "state": "PREPARED",
            "pickup_details": { ... }
          }
        ]
      }
    }
  }
}
```

---

## 2. Status Mapping Strategy

We need to map Square's `OrderState` and `FulfillmentState` to our internal `OrderStatus`.

### Mapping Table

| Square State | Fulfillment State | Drink-UX Status | Description |
| :--- | :--- | :--- | :--- |
| `OPEN` | `PROPOSED` | `PENDING` | Order received but not yet acknowledged by staff. |
| `OPEN` | `RESERVED` | `CONFIRMED` | Staff has acknowledged the order. |
| `OPEN` | `PREPARED` | `READY` | Order is ready for pickup. |
| `COMPLETED` | `COMPLETED` | `DONE` | Customer has picked up the order. |
| `CANCELED` | `CANCELED` | `CANCELLED` | Order was voided or canceled. |

---

## 3. Implementation Requirements

### A. Webhook Verification
Square requires signature verification using HMAC-SHA256. This is already implemented in `WebhookService.verifySquareSignature()`.

### B. Idempotency & Versioning
*   **Version Tracking:** Always compare the `version` field in the webhook payload with the stored version. Ignore updates with a version lower than or equal to the current state to prevent race conditions or stale updates.
*   **Event ID Tracking:** Store the `event_id` to ensure each webhook is processed only once.

### C. Logic for `OrderService`
1.  Receive `order.updated` webhook.
2.  Extract `posOrderId` (`data.id`) and the `order` object.
3.  Find the internal `Order` by `posOrderId`.
4.  Check if `payload.version > order.lastVersion`.
5.  Determine new `status` based on the mapping table (look at `fulfillments[0].state` first).
6.  Update `Order` record in DB.
7.  Notify client via WebSocket (if implemented) or update polling state.

---

## 4. Square Marketplace Compliance Note

Square App Marketplace requires apps to handle order status updates correctly to ensure the merchant's POS remains the source of truth for fulfillment.

**Reference:** [Square Webhooks Overview](https://developer.squareup.com/docs/webhooks/overview)
