# Drink-UX Implementation Roadmap

**Epic:** drink-ux-418 - POS Integration & Source of Truth
**Planning Doc:** [2026-01-10-pos-integration-design.md](../plans/2026-01-10-pos-integration-design.md)
**Status:** In Progress (2 of 16 tasks complete)

---

## Executive Summary

This roadmap breaks down the POS Integration epic into 6 phases with 16 total tasks. Tasks within each phase can be executed **in parallel**, while phases must be completed **sequentially** due to dependencies.

**Goal:** Transform Drink-UX into the source of truth for coffee shop menu management, enabling the inverted drink ordering experience where customers build what they want and discover what it's called.

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ROADMAP                           │
└─────────────────────────────────────────────────────────────────────────┘

Phase 1: Foundation ✅
    └── Database Schema (r5k) ✓

Phase 2: Core Infrastructure (1/3)
    ├── Auth System (5ie)
    ├── POS Adapter (438) ✓
    └── Shared UI Components (8qi)

Phase 3: Admin Core Features (0/6)
    ├── Multi-tenancy (o23)
    ├── Catalog Sync (kbg)
    ├── Menu Builder (9ik)
    ├── Account Mgmt (jyq)
    ├── Ejection Tool (sax)
    └── Onboarding Wizard (wy0)

Phase 4: Customer Experience (0/2)
    ├── Theme Application (6ju)
    └── Mobile API Integration (3ny)

Phase 5: Order & Payment (0/3)
    ├── Order Submission (frd)
    ├── Payment Integration (bd1)
    └── Subscription Gate (58i)

Phase 6: Polish & Launch (0/1)
    └── Error Handling (7ji)

                    🚀 LAUNCH 🚀
```

---

## Progress Summary

| Phase | Status | Tasks | Complete |
|-------|--------|-------|----------|
| 1. Foundation | ✅ Complete | 1 | 1/1 |
| 2. Core Infrastructure | 🔄 In Progress | 3 | 1/3 |
| 3. Admin Core Features | ⏳ Blocked | 6 | 0/6 |
| 4. Customer Experience | ⏳ Blocked | 2 | 0/2 |
| 5. Order & Payment | ⏳ Blocked | 3 | 0/3 |
| 6. Polish & Launch | ⏳ Blocked | 1 | 0/1 |
| **Total** | | **16** | **2/16** |

---

## Phase Documents

Each phase has detailed documentation including task scope, testing requirements, file changes, and completion criteria.

1. **[Phase 1: Foundation](./phase-1-foundation.md)** - Database schema (COMPLETE)
2. **[Phase 2: Core Infrastructure](./phase-2-core-infrastructure.md)** - Auth, POS Adapter, Shared UI
3. **[Phase 3: Admin Core Features](./phase-3-admin-core-features.md)** - Multi-tenancy, Sync, Menu Builder, etc.
4. **[Phase 4: Customer Experience](./phase-4-customer-experience.md)** - Theming, Mobile API
5. **[Phase 5: Order & Payment](./phase-5-order-payment.md)** - Orders, Payment, Subscriptions
6. **[Phase 6: Polish & Launch](./phase-6-polish-launch.md)** - Error handling, edge cases

---

## Dependency Graph

```
                                drink-ux-r5k ✓
                              (Database Schema)
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
        drink-ux-5ie          drink-ux-438 ✓         drink-ux-8qi
        (Auth System)         (POS Adapter)          (Shared UI)
              │                      │                      │
    ┌─────────┴─────────┐    ┌──────┴──────┐              │
    │    │    │    │    │    │             │              │
    ▼    ▼    ▼    ▼    ▼    ▼             ▼              │
  o23  jyq  sax  wy0  58i  kbg            frd ◄──────────┘
   │         │    │         │              │
   │         └────┴────┐    │              │
   ▼                   ▼    ▼              ▼
  6ju                 wy0  3ny ◄──────────frd
   │                        │              │
   └────────────────────────┴──────────────┴──────────────┐
                                                          │
                            ┌─────────────────────────────┘
                            │
                            ▼
                    drink-ux-bd1
                  (Payment Integration)
                            │
                            ▼
                    drink-ux-58i
                  (Subscription Gate)
                            │
                            ▼
                    drink-ux-7ji
                  (Error Handling)
                            │
                            ▼
                    drink-ux-418
                      (EPIC DONE)
```

---

## Task Reference

| ID | Task | Phase | Status | Blocks |
|----|------|-------|--------|--------|
| r5k | Database Schema | 1 | ✅ Done | 5ie, 438, 8qi, o23, 6ju, 9ik, kbg, 3ny |
| 5ie | Auth System | 2 | Open | o23, 9ik, jyq, sax, wy0, 58i |
| 438 | POS Adapter | 2 | ✅ Done | kbg, frd, bd1, sax, wy0 |
| 8qi | Shared UI Components | 2 | Open | 9ik |
| o23 | Multi-tenancy | 3 | Open | 3ny, 6ju |
| kbg | Catalog Sync Service | 3 | Open | 3ny, 7ji |
| 9ik | Admin Menu Builder | 3 | Open | - |
| jyq | Admin Account Management | 3 | Open | - |
| sax | Admin Ejection Tool | 3 | Open | - |
| wy0 | Admin Onboarding Wizard | 3 | Open | - |
| 6ju | Theme Application | 4 | Open | - |
| 3ny | Mobile API Integration | 4 | Open | frd, 7ji |
| frd | Order Submission Flow | 5 | Open | bd1, 7ji |
| bd1 | Payment Integration | 5 | Open | 58i |
| 58i | Subscription Gate | 5 | Open | - |
| 7ji | Error Handling | 6 | Open | - |

---

## Quick Start: What to Work On Now

### Ready to Start (No Blockers)
- **drink-ux-5ie** (Auth System) - Unblocks 7 tasks
- **drink-ux-8qi** (Shared UI Components) - Unblocks Menu Builder
- **drink-ux-kbg** (Catalog Sync Service) - POS Adapter is done, can start!

### Highest Impact
Starting **drink-ux-5ie (Auth System)** unblocks the most downstream work. This should be the primary focus.

---

## Parallel Execution Strategy

**Phase 2 (Current):**
- Developer A: Auth System (5ie)
- Developer B: Shared UI Components (8qi)
- Developer C: Catalog Sync Service (kbg) ← Can start now!

**Phase 3 (After Auth):**
All 6 tasks can run in parallel with enough developers.

**Phase 5:**
Sequential - must complete in order (frd → bd1 → 58i).

---

## Beads Commands

```bash
# View ready tasks (no blockers)
bd ready

# Start working on a task
bd update drink-ux-5ie --status=in_progress

# View task details
bd show drink-ux-5ie

# Mark complete
bd close drink-ux-5ie

# Check progress
bd stats

# Sync at end of session
bd sync
```

---

## Alignment with Planning Doc

This roadmap directly implements the **Implementation Sequence** from the planning document:

| Planning Doc Step | Roadmap Phase | Tasks |
|-------------------|---------------|-------|
| 1. Database schema | Phase 1 | r5k ✓ |
| 2. Auth system | Phase 2 | 5ie |
| 3. POS adapter | Phase 2 | 438 ✓ |
| 4. Admin onboarding | Phase 3 | wy0 |
| 5. Admin menu builder | Phase 3 | 8qi, 9ik |
| 6. Sync service | Phase 3 | kbg |
| 7. Mobile API integration | Phase 4 | 3ny, 6ju |
| 8. Payment handoff | Phase 5 | bd1 |
| 9. Subscription gate | Phase 5 | 58i |
| 10. Polish | Phase 6 | 7ji |

Additional admin tasks (o23, jyq, sax) round out the full business management experience.

---

## Core Principles Verification

Each phase maintains the non-negotiable principles:

1. **Onboarding is easy** → Phase 3 (Onboarding Wizard)
2. **Ordering is fun** → Phase 4 (Mobile API), Phase 2 (Shared UI)
3. **Non-destructive** → Phase 3 (Catalog Sync), Phase 5 (Order Flow)
4. **Psychological safety** → Phase 3 (Ejection Tool)

---

*Last Updated: 2026-01-16*
*Related: [POS Integration Design](../plans/2026-01-10-pos-integration-design.md) | [POS Adapter Design](../plans/2026-01-13-pos-adapter-design.md)*
