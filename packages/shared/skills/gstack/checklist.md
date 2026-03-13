# gstack Pre-Landing Review Checklist

Use this checklist for the two-pass review process. Be **terse** and **opinionated**.

## PASS 1: CRITICAL (Blocks /ship)

### SQL & Data Safety
- **SQL Injection:** No unsanitized strings in `queryRaw` or similar.
- **N+1 Queries:** Use Prisma `include` or `select` to avoid N+1.
- **Data Integrity:** No skipping validations on create/update.
- **Transactions:** Multi-step mutations must be wrapped in `$transaction`.

### Race Conditions & Concurrency
- **Uniqueness:** Check for race conditions in "find or create" patterns.
- **Atomic Updates:** Use atomic increments (`increment`) for counters.
- **XSS:** No unsanitized HTML in views (unless explicitly trusted).

### LLM Output Trust Boundary
- **Format Validation:** Any data from an LLM must be validated (e.g., Zod) before use.
- **Type Checking:** Ensure the LLM output matches the expected TypeScript type.
- **Empty States:** Handle cases where the LLM returns nothing or a refusal.

---

## PASS 2: INFORMATIONAL (Non-blocking)

### Logic & Consistency
- **Side Effects:** No side effects in conditionals (e.g., updating DB inside an `if` condition).
- **Magic Numbers:** Extract magic numbers/strings to constants or env vars.
- **Dead Code:** Remove unused variables, imports, or methods.
- **String Coupling:** Use enums/types for statuses instead of raw strings.

### LLM Specifics
- **Prompt Engineering:** Avoid 0-indexed lists in prompts.
- **Tool Mismatches:** Ensure tool definitions in prompts match actual implementation.
- **Instruction Conflicts:** Check for contradicting instructions in prompts.

### Quality & Security
- **Test Gaps:** New logic should have at least one test.
- **Weak Entropy:** Use secure random generators for tokens/secrets.
- **Time Window Mismatches:** Ensure consistent timezone handling.
- **Frontend Performance:** Avoid expensive computations in React render cycles.

---

## DO NOT FLAG
- Harmless redundancies.
- Threshold tuning.
- Logic already addressed in the diff.
- Minor style/formatting (handled by lint/prettier).
