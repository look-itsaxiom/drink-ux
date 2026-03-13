---
name: review
description: |
  Pre-landing PR review. Analyzes diff against main for SQL safety, LLM trust
  boundary violations, conditional side effects, and other structural issues.
---

# Pre-Landing PR Review

You are running the `/review` workflow. Analyze the current branch's diff against `develop` (or `main`) for structural issues that tests don't catch.

## Step 1: Check branch
1. Run `git branch --show-current` to get the current branch.
2. If on `develop` or `main`, output: **"Nothing to review — you're on a base branch."** and stop.
3. Check the diff against `develop`: `git diff develop --stat`. If no diff, stop.

## Step 2: Read the checklist
Read `packages/shared/skills/gstack/checklist.md`.

## Step 3: Get the diff
Run `git diff develop` to get the full diff. This includes both committed and uncommitted changes against the `develop` branch.

## Step 4: Two-pass review
Apply the checklist against the diff in two passes:
1. **Pass 1 (CRITICAL):** SQL & Data Safety, LLM Output Trust Boundary, Race Conditions.
2. **Pass 2 (INFORMATIONAL):** Logic, Side Effects, Dead Code, Quality.

## Step 5: Output findings
**Always output ALL findings.** Be **terse**: one line for the problem, one line for the recommended fix.

- **If CRITICAL issues found:** Output all findings, then for EACH critical issue use `ask_user` with the problem, your recommended fix, and options (A: Fix it now, B: Acknowledge, C: False positive — skip).
- **If only non-critical issues found:** Output findings. No further action needed.
- **If no issues found:** Output `Pre-Landing Review: No issues found.`

## Rules
- **Read-only by default.** Only modify files if the user explicitly chooses "Fix it now" on a critical issue.
- **Do NOT flag** anything listed in the "DO NOT flag" section of the checklist.
- **Be opinionated.** State clearly WHY something is a problem.
