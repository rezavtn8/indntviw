# Contributing to IndentView

Thanks for your interest. This is a small scientific tool, so the bar is
practical rather than bureaucratic: if a change makes the analysis more correct
or the workflow less tedious, it is welcome.

## Before your first pull request: the CLA

IndentView is AGPL-3.0, with commercial licences available separately for
companies that cannot open-source their own products. That dual arrangement
only works if the maintainer holds rights to the whole codebase, so
contributions are covered by a one-line [CLA](CLA.md).

**You keep the copyright to your work.** You are granting a relicensing right,
not giving anything away. Add this to your first pull request description:

```
I have read CLA.md and I agree to its terms for this and future contributions.
```

## Getting set up

```sh
git clone https://github.com/rezavtn8/indntviw.git
cd indntviw
npm install
npm run dev          # http://localhost:8080
```

Node 18 or newer.

## Before opening a pull request

```sh
npx tsc --noEmit -p tsconfig.app.json   # types
npm run verify:stats                    # statistical methods
npm run build                           # production build
npm run lint                            # style (see note below)
```

CI runs the first three on Node 18, 20 and 22. All must pass.

`npm run lint` currently reports pre-existing warnings, mostly `any` types in
older components. Please don't add new ones, but you are not expected to fix
unrelated existing ones in your PR.

## Changes to statistics

This is the part that matters most, and the rule is simple:

**Any change to a statistical method must come with a check in
[`scripts/verify-statistics.ts`](scripts/verify-statistics.ts) that compares
the result against a published reference value** — a textbook table, a
distribution's known critical values, or output from R or scipy.

The reason is not process for its own sake. An earlier version of this project
computed the chi-squared CDF using the t-distribution's formula, which made
every Kruskal–Wallis p-value wrong by factors of 1.5× to 30×, and it went
unnoticed because nothing checked it. Numbers that are merely plausible are the
failure mode here, not numbers that are obviously broken.

If you add a method, document it in [METHODS.md](METHODS.md) as well, including
its limitations. Stating a limitation is not a weakness in a scientific tool —
an unstated one is.

## Adding support for another instrument's export format

Parsing lives in [`src/utils/dataParser.ts`](src/utils/dataParser.ts). If you
add a vendor format:

1. Add the column-name mappings to `HEADER_MAPPINGS`.
2. Add a small anonymised sample file under `public/sample-data/`.
3. Note the format in the README's supported-formats list.

Real exports are messy — mis-encoded micro signs, summary rows above the data,
paired calibration columns. Please contribute the awkward file rather than a
cleaned-up one; the awkward one is what the parser needs to survive.

## Code style

- TypeScript and functional React components.
- Tailwind for styling; shared primitives live in `src/components/ui/`.
- Shared numeric helpers go in `src/utils/numeric.ts`, shared formatters in
  `src/utils/formatStats.ts`. Please use them rather than reimplementing mean,
  standard deviation, percentiles or p-value formatting locally — the project
  previously had three different standard deviations and twelve copies of the
  p-value formatter, and panels disagreed with each other as a result.
- Sample standard deviation (`n-1`) is the project-wide convention.

## Reporting bugs

Please include the instrument and export format, the number of indents, and
what you expected versus what you got. If the data is not sensitive, an
attached file is worth a great deal.

For anything touching a computed number, say which value you believe is wrong
and what you think it should be — ideally with the reference you checked
against.
