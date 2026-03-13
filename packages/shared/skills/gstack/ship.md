---
name: ship
description: |
  Ship workflow: merge main/develop, run tests, review diff, bump version, commit, push, create PR.
---

# Ship: Fully Automated Ship Workflow

This is a **non-interactive, fully automated** workflow. Do NOT ask for confirmation at any step. The user said `/ship` which means DO IT.

## The Shipping Process

### Step 1: Sync & Test
1.  **Pull latest:** `git pull --rebase origin develop` (or `main` if appropriate).
2.  **Run Quality Gates:**
    - `npm test` (in affected package or root).
    - `npm run lint` (if available).
    - `npm run build` (if available).
3.  **Stop if failed:** If any test/lint/build fails, stop and report the error.

### Step 2: Prepare the Commit
1.  **Analyze the diff:** `git diff develop` (or `main`).
2.  **Generate Commit Message:** Write a clear, concise commit message (Follow project conventions).
3.  **Final Diff Review:** Ensure only intended changes are included.

### Step 3: Land the Changes
1.  **Commit:** `git add . && git commit -m "[message]"`
2.  **Push:** `git push origin [current-branch]`
3.  **Open PR (if requested or customary):** If you have the ability to create a Pull Request, do it now.

## Output Format
1. **Ship Status:** (SUCCESS / FAILED).
2. **Summary of Changes:** 2-3 bullet points.
3. **Tests Run:** List of tests that passed.
4. **Link to PR:** (if created).
5. **Next Step:** What should the user or next agent do?
