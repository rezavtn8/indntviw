

## Sample-Level Treatment Comparison (new analysis mode)

### Problem
Current "Group Comparison" pools every indentation point from every sample in a treatment group, then compares pooled distributions. This inflates n (using thousands of points instead of the true biological/experimental replicates) and violates independence assumptions — pseudoreplication. Reviewers in materials/biomaterials journals routinely flag this.

### What to add
A new analysis tab in the **Cross-Sample** view called **"Sample-Level Comparison"** (alongside the existing pooled "Group Comparison"). Each sample collapses to **one summary value**; treatment groups are then compared on those n=#samples values.

### Sidebar/tab placement
In `CrossSamplePanel.tsx`, add a new tab between `Group Comparison` and `Zone Between Groups`:
- Single Sample / Plots / Tests / Intra-Group / **Group Comparison (pooled)** / **Sample-Level (per-sample)** ← new / Zone Between Groups / Group Zone / Smart Zone / Zone Across

Rename existing "Group Comparison" label to "Group Comparison (pooled)" so the distinction is explicit.

### New component: `SampleLevelGroupComparison.tsx`

**Inputs:** `fileSessions`, `groups` (scoped), `selectedProperty`.

**Per-sample collapse logic:**
1. For each sample in each group, extract property values via `getPropertyValues`.
2. Run `shapiroWilkTest` on the sample's values.
3. Choose summary statistic per sample:
   - **Auto (default):** mean if Shapiro p ≥ 0.05, otherwise median.
   - User can override via a small toggle: `Auto | Mean | Median`.
4. Build per-group arrays of these scalar summaries (length = number of samples in the group).

**Statistics on summaries** (reuse `advancedStatistics.ts`):
- 2 groups → Welch's t-test + Mann–Whitney U + Cohen's d / Hedges' g.
- ≥3 groups → one-way ANOVA + Kruskal–Wallis + Tukey HSD.
- Show n per group prominently (these are tiny ns — usually 3–10).
- Add a guard: if any group has n<3, show a warning badge "Low replicate count — interpret with caution".

**Visualization:**
- Reuse `BoxViolinSvg` / `BoxViolinPlots` with one box per treatment group, jittered points = each sample's summary value (labeled by sample name on hover).
- Reuse `StatsTable` for per-group descriptive stats of the summaries.

### Explanation card (always visible at top of the tab)
A compact, collapsible info card titled **"Why this differs from pooled Group Comparison"**:

> **Pooled (other tab):** Treats every indentation point as an independent observation. n = total points across all samples in the group (often thousands). Detects tiny effects but can be statistically misleading — multiple points from one sample are not independent (pseudoreplication).
>
> **Sample-Level (this tab):** Each sample is collapsed to a single representative value (mean if normally distributed, otherwise median). The treatment group is then n = number of samples. This matches how most journals expect biological/experimental replicates to be analyzed and is more conservative.
>
> **Use pooled** for exploratory within-group spread. **Use sample-level** for between-treatment claims in publications.

Styled with the existing `Card` + muted background, mono small text, an `Info` lucide icon, and a "Learn more" expand toggle.

### Per-sample summary table
Below the plot: a table listing every sample, its group, n_points, Shapiro p, summary stat used (Mean/Median), and the value — so reviewers can audit the collapse.

### Sample-color reuse
Use the same `SAMPLE_COLORS` palette as `GroupComparison.tsx` so a given sample is the same color across both tabs.

### Files touched
- **New:** `src/components/analysis/SampleLevelGroupComparison.tsx`
- **Edit:** `src/components/analysis/CrossSamplePanel.tsx` (add tab, route props, rename existing label)

### Out of scope
- Weighted means by point count, bootstrap CIs on summaries, mixed-effects models — can be a follow-up.
- No changes to existing pooled `GroupComparison` behavior.

### Outcome
Users get a publication-correct between-treatment test (n = samples, not points) sitting next to the existing pooled view, with an in-product explanation of when to use which — addressing pseudoreplication without removing the existing exploratory tool.

