# LLM evaluation suite

Automated quality tests for the language model behind [GrammaBG](https://grammabg.com),
a Bulgarian grammar correction service for Word and PDF documents.

Unit tests cannot tell you whether a model still corrects Bulgarian grammar well.
A prompt change, a model version bump or a provider-side update can quietly
degrade output quality while every HTTP request still returns `200 OK`.
This suite turns correction quality into something that can be measured on every
run and gated in CI.

---

## What is tested

The production correction prompt is run against a fixed dataset of **49 Bulgarian
test cases**, each a sentence paired with the exact text the model is expected to
return.

| Category | Cases | What it checks |
|---|---|---|
| Spelling | 6 | Wrong or missing letters, e.g. `Вьв` → `Във` |
| Spacing | 7 | Missing space before `г.`, after `гр.`, after a colon or comma |
| Punctuation | 6 | Missing commas: salutation, vocative, `че`, relative clauses |
| Definite article | 5 | `пълен` vs `кратък член` — `Договорът е…` vs `Подписахме договора` |
| Agreement | 5 | Gender and number: `Фактурата е издадена`, `Данните попадат` |
| Capitalization | 3 | Sentence start, city and country names |
| Word split / join | 3 | `докумен ти` → `документи` (typical of text extracted from `.docx`) |
| **No-op** | 11 | Already correct text that **must come back unchanged** |
| Multi-error | 3 | Several errors in one sentence, graded by a second model |

The **no-op** group is the most important one. For this product, over-correction is
worse than under-correction: a user who uploads a contract expects the three real
mistakes to be fixed and nothing else touched. These cases fail if the model
"improves" text that was already correct — rewording a sentence, adding a comma
that Bulgarian does not require, or reformatting a legal reference such as
`чл. 10, ал. 2`.

## How it is graded

Three layers of assertions run on every case:

**1. Output sanity** (JavaScript assertion, all cases)
Rejects empty output, markdown code fences, added commentary (`Here is the
corrected text: …`), and any response whose length differs from the input by more
than 40% — a reliable signal that the model rewrote the text instead of
correcting it.

**2. Exact match** (JavaScript assertion, 46 cases)
The corrected text must equal the expected string character for character.
Deliberately strict: for single, unambiguous fixes there is exactly one right
answer, and a fuzzy check would hide drift.

**3. LLM-as-a-judge** (`llm-rubric`, 3 cases)
Sentences with several independent errors have more than one acceptable
correction, so exact matching would produce false failures. A second model grades
these against explicit criteria — each specific error fixed, meaning and wording
otherwise preserved, nothing added or removed.

## Running it locally

Requires Node.js 18+ and an OpenAI API key.

```bash
cd evals

# PowerShell
$env:OPENAI_API_KEY="sk-..."

# bash / zsh
export OPENAI_API_KEY="sk-..."

npx --yes promptfoo@latest eval -c promptfooconfig.yaml
```

Open the interactive report:

```bash
npx --yes promptfoo@latest view
```

The key is never committed; see `.env.example`. In CI it is a secret pipeline
variable.

**Cost:** 49 completions plus 3 judge calls per run on `gpt-4o-mini` — a few
cents. Local runs are cached by promptfoo, so re-running an unchanged suite is
free. CI runs with `--no-cache`, because the point of a nightly run is to detect
drift in the model's behaviour.

## Reading the results

The terminal prints a pass/fail table; `promptfoo view` opens the same data as a
web report where each row shows the input, the expected text and what the model
actually returned.

A failing exact-match case prints the difference directly:

```
Expected: Във връзка с договора, който подписахме на 15.01.2026 г.
Got:      Във връзка с договора, който подписахме на 15.01.2026г.
```

When reviewing a failure, decide which of three things it is:

- **A model regression** — it used to pass, the dataset did not change. Investigate the prompt or the model version.
- **A prompt bug** — the rule is missing or badly worded in the prompt. Fix the prompt.
- **A bad test** — the expected answer is wrong, or the sentence is genuinely ambiguous in Bulgarian. Fix or remove the case.

The third one matters: a dataset nobody corrects slowly becomes noise.

## Example of a bug this suite catches

An early version of the production prompt instructed the model to insert a comma
"between a greeting and the name that follows it". In Bulgarian that rule is
correct for `Здравей, Иване` but wrong for a formal salutation, where the title
and surname form a single address phrase and the comma belongs at the end:

```
Input:     Уважаеми господин Петров
Wrong:     Уважаеми господин, Петров      ← what the model produced
Correct:   Уважаеми господин Петров,
```

This reached production and was found by hand while reviewing a corrected
document. It is now case
`punctuation — missing comma after salutation`, and the rule it broke is covered
from the other direction by the no-op case
`no-op — correct salutation with vocative comma`, which fails if the model ever
starts splitting the title from the name again.

## CI

`azure-pipelines-evals.yml` runs the suite nightly on an Azure DevOps pipeline:

1. Run the suite with `--no-cache`, writing `results.json` and `results.html`.
2. `scripts/check-threshold.mjs` reads the JSON and fails the build when the pass
   rate falls below the threshold.
3. The HTML report is published as a build artifact.

The eval step itself is marked `continueOnError`, because `promptfoo` exits
non-zero on the first failing assertion. The threshold script is the actual gate,
so one flaky case does not turn the pipeline red while a real regression does.

Set the threshold from a measured baseline, not from a guess: run the suite, note
the pass rate, then set the threshold a few points below it.

## Known limitation

The prompt in `prompts/correct-bg.txt` mirrors the prompt in the production edge
function (`supabase/functions/fix-text/index.ts`) but is a separate copy, so the
suite can call the model directly — the live endpoint enforces per-user daily
limits and authentication that make it unusable as a test target.

**Changing the production prompt means updating this file in the same commit.**
The alternative, extracting the prompt into a module shared by both, is the right
long-term fix and is not done yet.

## Layout

```
evals/
  promptfooconfig.yaml      provider, shared assertions, dataset reference
  prompts/correct-bg.txt    the prompt under test
  tests/cases.yaml          49 test cases
  scripts/check-threshold.mjs   CI quality gate
  .env.example
```
