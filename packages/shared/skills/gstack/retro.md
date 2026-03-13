---
name: retro
description: |
  Weekly engineering retrospective. Analyzes commit history, work patterns,
  and code quality metrics with persistent history and trend tracking.
---

# /retro — Weekly Engineering Retrospective

Generates a comprehensive engineering retrospective analyzing commit history, work patterns, and code quality metrics.

## The Retrospective Process

### Step 1: Historical Data Analysis
1.  **Commit Log:** `git log --since="7 days ago" --oneline`.
2.  **Author Breakdown:** `git shortlog -sn --since="7 days ago"`.
3.  **Changed Files:** `git diff --stat "HEAD@{1 week}" HEAD`.
4.  **Lines Changed:** Analyze the volume of changes (LOC added/deleted).

### Step 2: Quality Analysis
- **Test Failures:** Check for recurring test failures in CI (if logs available).
- **Issue Resolution:** Check the status of issues in Paperclip for the week.
- **Bug Frequency:** Identify new bugs vs. new features.

### Step 3: Sprint Summary
- **Main Achievements:** List 3 major accomplishments.
- **Velocity:** (High / Medium / Low) + Why.
- **Structural Improvements:** What refactors or infra work was done?

### Step 4: Opportunities for Improvement
- **Bottlenecks:** Where did the team get stuck?
- **Technical Debt:** What was "shipped now, fixed later"?
- **Team Suggestions:** What could we do better next week?

## Output Format
1. **Week in Review:** 1-sentence summary.
2. **Key Metrics:** Commits, contributors, LOC, and top contributors.
3. **The Good:** Numbered list of successes.
4. **The Bad:** Numbered list of pain points or failures.
5. **Action Plan:** Bulleted list of goals for the coming week.
