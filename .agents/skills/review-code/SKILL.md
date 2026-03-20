# Review Frontend Code

Audit the frontend codebase against every rule and architectural document, producing a prioritised list of findings.

## Metadata

```yaml
triggers:
  - "review frontend code"
  - "code review frontend"
  - "audit frontend"
  - "review code against rules"
  - "check frontend against rules"
  - "frontend code review"
```

## When to Use

Use this skill after changes to the frontend, or periodically to catch drift between the codebase and the agreed rules and architecture.

## Input / Output

**Input:** No input required. The skill scans `src/` and all files under `.agents/` in the frontend service.
**Output:** A structured report with two sections — **CRITICAL** and **SUGGESTIONS** — collected from one-rule-at-a-time assessments, each finding including a short description and a complexity rating.

## Persona

You are a code auditor for the frontend service. Your job is to find places where the code does not follow the agreed rules and architectural decisions. You do not fix code. You do not rewrite or suggest refactors beyond what a rule explicitly requires. You assess one rule at a time, record findings, then move on.

## Instructions

### Step 1: Read the context documents first.

Read these files in order before assessing any rule. They establish the system boundaries and architectural intent that inform all rule assessments:

1. `/AGENTS.md` (core repo root)
2. `/ARCHITECTURE.md` (core repo root)
3. `.agents/skills/create-pr/SKILL.md`
4. `.agents/skills/review-code/SKILL.md` (this file — confirm you understand the scope)

Note any architectural constraints relevant to the frontend (e.g. "Frontend owns only rendering and session — it must not contain business logic").

### Step 2: Build the rule list.

Collect the full list of rules to assess from `.agents/rules/`:

1. `frontend-feature-architecture.md`
2. `frontend-config.md`
3. `frontend-logging.md`
4. `javascript-code-style.md`
5. `naming.md`
6. `styling.md`

Process every rule in this list. Do not skip any.

### Step 3: For each rule, run a focused assessment.

Repeat this process for every rule in the list before moving on:

**3a. Read the rule file in full.**

**3b. Identify what the rule prescribes.**
Extract the specific, checkable requirements: named patterns, required files, prohibited constructs, mandatory conventions.

**3c. Identify the relevant code scope.**
Determine which files and directories are in scope for this rule (e.g. a naming rule applies to all files; a feature architecture rule applies to `src/server/`; a config rule applies to `src/config/`).

**3d. Read the relevant code.**
Read enough of the codebase to assess whether the rule is followed. For structural rules, read directory listings and representative files from each feature. For style rules, read a sample of files across the codebase. Read at least 3–5 representative files per rule — do not assess from directory listings alone.

**3e. Identify violations.**
Record each violation as a finding. For each finding, note:
- The rule it violates
- The file(s) where it occurs
- What the rule requires vs what the code does
- Whether it is CRITICAL or a SUGGESTION (see Step 4)
- A complexity rating (see Step 5)

**3f. Record findings, then move to the next rule.**
Do not stop to report mid-assessment. Complete all rules first.

### Step 4: Classify each finding.

**CRITICAL** — the code does something the rules prohibit that will cause real problems if left: it actively misleads future contributors, introduces a pattern that will spread, or violates a hard architectural boundary. Examples:
- Business logic in a controller or template that belongs in a view-model
- An LLM call or database query in the frontend (violates service boundary)
- A feature that bypasses the agreed layer chain in a way other code is likely to copy
- Config accessed directly outside `src/config/`

**SUGGESTION** — the code deviates from a rule but the deviation is localised, unlikely to spread, or is a style/naming inconsistency rather than a structural violation. Examples:
- A file or directory name not in kebab-case
- A missing try/catch in a controller that is unlikely to fail in practice
- An exported function name that doesn't follow the agreed convention

### Step 5: Assign a complexity rating to each finding.

Rate each finding on two dimensions:

- **Spot difficulty** — how hard is it to identify exactly what needs changing? (`easy` / `moderate` / `hard`)
- **Change scope** — how many files or locations need to be updated? (`single file` / `a few files` / `wide-reaching`)

Format: `Spot: easy | Scope: single file`

### Step 6: Write the report.

Collect all findings from all rules and output in this structure:

```
## CRITICAL

### [Short title] — [Rule: rule-file-name.md]
**File(s):** `path/to/file.js`
**Finding:** [One or two sentences: what the rule requires and what the code does instead.]
**Complexity:** Spot: [easy/moderate/hard] | Scope: [single file / a few files / wide-reaching]

---

## SUGGESTIONS

### [Short title] — [Rule: rule-file-name.md]
**File(s):** `path/to/file.js`
**Finding:** [One or two sentences.]
**Complexity:** Spot: [easy/moderate/hard] | Scope: [single file / a few files / wide-reaching]
```

Group all CRITICAL findings together, then all SUGGESTIONS. Within each group, order by complexity — easiest and smallest-scope changes first.

If no issues are found in a category, write: `None found.`

Do not include fixes, rewrites, or code in the report.
