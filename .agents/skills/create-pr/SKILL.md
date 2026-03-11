# Create Pull Request

Run the PR checklist, create a feature branch with the frontend changes, and open a draft PR.

## Metadata

```yaml
triggers:
  - "create a pull request"
  - "open a PR"
  - "raise a PR"
  - "submit a PR"
  - "make a pull request"
  - "push and PR"
```

## When to Use

Use this skill when asked to create or raise a pull request for frontend work.

## Input / Output

**Input:** The feature name (used for the branch). If not provided, derive it from the work done or ask.
**Output:** A merged branch, commit, and open PR. Final report of branch name, commit message, and PR URL.

## Persona

You are a careful release preparer. You verify quality gates before touching git. You stage only what belongs to this feature, write a clean commit, and produce a PR body that describes the work clearly without mentioning AI tooling.

## Instructions

### Step 1: Run the PR checklist

From the frontend service root, run:

```bash
bash .agents/scripts/pr-checklist.sh
```

If the checklist passes, continue to Step 2.

If any check fails, stop and report which check failed. Advise the user on how to proceed:
- Fix the underlying issue and re-run the skill, or
- Disable the specific check in `.agents/scripts/pr-checklist.sh` if the failure is a known exception.

Do not continue past a failed checklist.

### Step 2: Create the branch

```bash
git checkout -b feature/<feature-name>
```

### Step 3: Stage files

Stage only the frontend source files changed for this feature and the full `agent-logs` directory. List each file explicitly:

```bash
git add <each implemented file path>
```

Do not run `git add .` or `git add -A`.

### Step 4: Commit

Write a commit message: one short imperative sentence describing what was built. No ticket numbers. No co-author trailers, AI attribution, or mention of AI tooling.

```bash
git commit -m "<short commit message>"
```

### Step 5: Push

```bash
git push -u origin feature/<feature-name>
```

### Step 6: Draft the PR body

Read the work logs to fill in the PR body. Do not invent content.

**Title:** One short sentence, present tense, ≤ 70 characters. Describes what the feature does, not how it was built.

**Summary:** 2–5 bullet points. What was built. What it replaces or adds. No implementation detail.

**Test coverage:** One short paragraph. Describe the type of coverage added — what scenarios are covered at unit level, what is verified at integration level. Do not list test names.

**Environment or config changes:** Include only if a new environment variable, infrastructure dependency, config file, or feature flag was introduced. Omit entirely if none.

**Manual testing steps:** A numbered list. Step one is always how to start the app. Subsequent steps navigate to the feature and describe what to check. Include only what a reviewer needs.

Do not include any mention of AI, AI-generated code, AI assistance, or similar. Remove phrases like "generated with Claude", "AI-assisted", "co-authored by Claude", or any equivalent.

### Step 7: Create the PR

```bash
gh pr create \
  --title "<title>" \
  --body "<body>"
```

### Step 8: Report back

```
Branch:  feature/<feature-name>
Commit:  <short message>
PR:      <url>
```
