---
name: ship
description: |
  Ship workflow: merge develop, run tests, review diff, bump version, commit, push, create PR.
---

# Ship: Fully Automated Ship Workflow

This is a **non-interactive, fully automated** workflow. Do NOT ask for confirmation at any step. The user said `/ship` which means DO IT.

**Only stop for:**
- On `develop` or `main` branch (abort).
- Merge conflicts that can't be auto-resolved.
- Test failures (stop, show failures).
- Pre-landing review finds **CRITICAL** issues.

---

## Step 1: Pre-flight
1. Check the current branch. If on `develop` or `main`, **abort**: "Ship from a feature branch."
2. Run `git status`. Uncommitted changes are included.
3. Run `git diff develop --stat` and `git log develop..HEAD --oneline`.

## Step 2: Merge develop (BEFORE tests)
Fetch and merge `develop` into the feature branch:
```bash
git fetch origin develop && git merge origin/develop --no-edit
```
**If conflicts occur:** Stop and show them.

## Step 3: Run Quality Gates
Run tests for affected packages:
```bash
# Example for a monorepo
npm test
```
**If any test fails:** Show failures and **STOP**.

## Step 3.5: Pre-Landing Review
Run the `/review` workflow (Pass 1 & Pass 2).
- **If CRITICAL issues found:** Use `ask_user` for EACH issue. If the user chooses "Fix it now", apply fixes and **STOP** (user must run `/ship` again).
- **If only INFORMATIONAL or no issues:** Continue.

## Step 4: Version Bump
1. Read the current version from `package.json` (or `VERSION` file if exists).
2. **Auto-decide bump level:**
   - **PATCH:** Bug fixes, small tweaks.
   - **MINOR:** New features (ASK user via `ask_user`).
   - **MAJOR:** Breaking changes (ASK user via `ask_user`).

## Step 5: CHANGELOG
Update `CHANGELOG.md` (if it exists) or create a summary of changes from `git log develop..HEAD`.

## Step 6: Commit (Bisectable chunks)
Group changes into logical commits:
- Infrastructure / Migrations
- Services / Models (with tests)
- UI / Components (with tests)
- Version / Changelog (final commit)

Each commit message format: `<type>(<issue-id>): <summary>`

## Step 7: Push
```bash
git push -u origin <branch-name>
```

## Step 8: Create PR
If `gh` CLI is available, create a PR. Otherwise, provide the link to create one manually.
Summary should include:
- Key changes
- Review findings
- Test results

**Output the PR URL at the end.**
