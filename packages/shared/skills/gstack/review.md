---
name: review
description: |
  Pre-landing PR review. Analyzes diff against main for SQL safety, LLM trust
  boundary violations, conditional side effects, and other structural issues.
---

# Pre-Landing PR Review

You are running the `/review` workflow. Analyze the current branch's diff against main for structural issues that tests don't catch.

## Philosophy
- **Paranoid Reviewer Mode:** Assume tests pass, but the code could still be dangerous or fragile.
- **Structural Integrity over Style:** Don't comment on formatting (assume linting/formatting is handled).
- **Hunt for "Invisible" Bugs:** Focus on race conditions, side effects, and security vulnerabilities.

## Review Areas

### 1. Data Integrity & SQL Safety
- Look for unsanitized inputs in raw SQL queries or Prisma `queryRaw` calls.
- Check for transactions where multiple related operations occur.
- Verify migrations are correct and reversible.

### 2. State & Race Conditions
- Identify async operations that could overlap (e.g., two simultaneous updates).
- Check for component side effects that could trigger multiple times.
- Verify that loading and error states are correctly handled in the UI.

### 3. Business Logic Accuracy
- Ensure that the implementation matches the original issue requirements.
- Look for "off-by-one" errors in calculations (especially pricing or subscriptions).
- Verify that edge cases defined in the plan are handled.

### 4. Code Quality & Maintainability
- Identify redundant code or complex logic that could be simplified.
- Check for hardcoded values that should be environment variables.
- Ensure that exported types and interfaces are accurate.

## Output Format
1. **Overall Verdict:** (APPROVE / REQUEST CHANGES / REJECT).
2. **Critical Issues:** High-priority problems that could cause a production failure.
3. **Refinement Ideas:** Suggestions for cleaner code or better performance.
4. **Final Checklist:**
   - [ ] No unsanitized SQL
   - [ ] No hardcoded secrets
   - [ ] Edge cases handled
   - [ ] Types are accurate
