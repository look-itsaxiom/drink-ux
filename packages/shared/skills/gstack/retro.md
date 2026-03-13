---
name: retro
description: |
  Weekly engineering retrospective. Analyzes commit history, work patterns,
  and code quality metrics with persistent history and trend tracking.
---

# /retro — Weekly Engineering Retrospective

Generates a comprehensive engineering retrospective analyzing commit history, work patterns, and code quality metrics.

## Arguments
- `/retro` — last 7 days (default)
- `/retro 24h` — last 24 hours
- `/retro 14d` — last 14 days
- `/retro compare` — compare this period vs prior period

## Instructions

### Step 1: Gather Raw Data
Fetch the latest changes:
```bash
git fetch origin develop --quiet
```

Run independent git commands in parallel:
1. **Commits in window:** `git log origin/develop --since="<window>" --format="%H|%ai|%s" --shortstat`
2. **LOC breakdown:** `git log origin/develop --since="<window>" --format="COMMIT:%H" --numstat`
3. **Hotspot analysis:** `git log origin/develop --since="<window>" --format="" --name-only | sort | uniq -c | sort -rn`
4. **Issue references:** `git log origin/develop --since="<window>" --format="%s" | grep -oE 'SKI-[0-9]+' | sort | uniq`

### Step 2: Compute Metrics
Present these metrics in a summary table:
* Commits to develop
* Issues resolved (Paperclip)
* Total insertions / deletions / Net LOC
* Test LOC ratio (files in `**/__tests__/**` or `**/*.test.ts`)
* Active days and detected sessions (45-min gap threshold)

### Step 3: Distribution & Patterns
* **Hourly Histogram:** Show when commits happen (Pacific Time).
* **Session Detection:** Identify Deep (>50m), Medium (20-50m), and Micro (<20m) sessions.
* **Commit Type Breakdown:** `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.

### Step 4: Quality & Focus
* **Hotspot Analysis:** Top 10 most-changed files. Flag churn hotspots.
* **Focus Score:** % of commits touching the most-changed top-level directory.
* **Ship of the Week:** Identify the highest-impact change (based on LOC and issue importance).

### Step 5: Trends (if history exists)
Check for prior retros in `docs/retros/*.json`.
If found, show a **Trends vs Last Retro** table (Test ratio, LOC/hour, Fix ratio, etc.).

### Step 6: Save Retro History
Save a JSON snapshot to `docs/retros/YYYY-MM-DD-N.json`.

### Step 7: Narrative
Provide a senior-level interpretation:
1. **Summary Table**
2. **Time & Session Patterns** (Interpretation of productivity)
3. **Shipping Velocity** (Commit mix, PR size)
4. **Code Quality Signals** (Test trends, hotspots)
5. **Top 3 Wins**
6. **3 Things to Improve**
7. **3 Habits for Next Week**

## Tone
- Senior-level, candid, and data-driven.
- Focus on actionable insights, not just numbers.
- Anchored in actual commits and issues.
