/**
 * @keywords    weighted decision, priority, AHP, analytic hierarchy process, multi-criteria, pairwise comparison
 * @domain      Decision Weight
 * @use-when    Ranking or selecting among alternatives using weighted criteria and priority scoring
 * @not-when    You need binary yes/no branching logic — use decision.tree.ts instead
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Criterion {
  id: string;
  label: string;
  weight: number;   // Relative importance (will be auto-normalized)
  direction: "maximize" | "minimize"; // Higher or lower value is better
}

export interface Alternative {
  id: string;
  label: string;
  values: Record<string, number>; // criterionId → raw value
}

export interface WeightedScore {
  alternativeId: string;
  label: string;
  rawValues: Record<string, number>;
  normalizedValues: Record<string, number>;
  weightedValues: Record<string, number>;
  totalScore: number;
  rank: number;
}

// ─── AHP Pairwise Comparison ──────────────────────────────────────────────────
// Saaty's 1–9 scale: 1=equal, 3=moderate, 5=strong, 7=very strong, 9=extreme importance

export type SaatyScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface PairwiseMatrix {
  criteria: string[];            // criterion IDs
  matrix: number[][];            // n×n pairwise comparison matrix
}

// Saaty's Random Index table for consistency ratio
const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

export function ahpWeights(pm: PairwiseMatrix): {
  weights: Record<string, number>;
  consistencyRatio: number;
  isConsistent: boolean;
} {
  const n = pm.criteria.length;
  const matrix = pm.matrix;

  // Step 1: Compute column sums
  const colSums = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row) => s + row[j], 0)
  );

  // Step 2: Normalize matrix (each cell / column sum)
  const normalized = matrix.map((row, i) => row.map((val, j) => val / colSums[j]));

  // Step 3: Priority vector (row averages of normalized matrix)
  const priorities = normalized.map((row) => row.reduce((s, v) => s + v, 0) / n);

  // Step 4: Consistency check (λ_max → CI → CR)
  const weightedSums = matrix.map((row, i) =>
    row.reduce((s, val, j) => s + val * priorities[j], 0)
  );
  const lambdaMax = weightedSums.reduce((s, ws, i) => s + (priorities[i] === 0 ? 0 : ws / priorities[i]), 0) / n;
  const CI = (lambdaMax - n) / (n - 1);
  const RI = RANDOM_INDEX[n] ?? 1.49;
  const consistencyRatio = RI === 0 ? 0 : CI / RI;

  const weights: Record<string, number> = {};
  pm.criteria.forEach((id, i) => { weights[id] = priorities[i]; });

  return {
    weights,
    consistencyRatio,
    isConsistent: consistencyRatio < 0.1, // Saaty's acceptable threshold
  };
}

// ─── TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) ─

export function topsis(
  alternatives: Alternative[],
  criteria: Criterion[]
): WeightedScore[] {
  if (alternatives.length === 0 || criteria.length === 0) return [];

  // Normalize weights
  const totalWeight = criteria.reduce((s, c) => s + Math.abs(c.weight), 0);
  const normWeights = criteria.map((c) => c.weight / totalWeight);

  // Step 1: Normalize decision matrix using vector normalization
  const normalizedMatrix: number[][] = alternatives.map(() => new Array(criteria.length).fill(0));
  for (let j = 0; j < criteria.length; j++) {
    const colVec = alternatives.map((alt) => alt.values[criteria[j].id] ?? 0);
    const magnitude = Math.sqrt(colVec.reduce((s, v) => s + v * v, 0));
    for (let i = 0; i < alternatives.length; i++) {
      normalizedMatrix[i][j] = magnitude === 0 ? 0 : colVec[i] / magnitude;
    }
  }

  // Step 2: Weighted normalized matrix
  const weighted: number[][] = normalizedMatrix.map((row) =>
    row.map((val, j) => val * normWeights[j])
  );

  // Step 3: Ideal best and worst solutions
  const idealBest = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.direction === "maximize" ? Math.max(...col) : Math.min(...col);
  });

  const idealWorst = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.direction === "maximize" ? Math.min(...col) : Math.max(...col);
  });

  // Step 4: Euclidean distance to ideal best/worst
  const distBest  = weighted.map((row) => Math.sqrt(row.reduce((s, v, j) => s + (v - idealBest[j])  ** 2, 0)));
  const distWorst = weighted.map((row) => Math.sqrt(row.reduce((s, v, j) => s + (v - idealWorst[j]) ** 2, 0)));

  // Step 5: Relative closeness to ideal solution
  const scores = alternatives.map((alt, i) => {
    const totalDist = distBest[i] + distWorst[i];
    const totalScore = totalDist === 0 ? 0 : distWorst[i] / totalDist;

    const normalizedValues: Record<string, number> = {};
    const weightedValues: Record<string, number> = {};
    criteria.forEach((c, j) => {
      normalizedValues[c.id] = normalizedMatrix[i][j];
      weightedValues[c.id]   = weighted[i][j];
    });

    return {
      alternativeId: alt.id,
      label: alt.label,
      rawValues: alt.values,
      normalizedValues,
      weightedValues,
      totalScore,
      rank: 0,
    } satisfies WeightedScore;
  });

  // Rank by descending closeness score
  scores.sort((a, b) => b.totalScore - a.totalScore);
  scores.forEach((s, i) => { s.rank = i + 1; });

  return scores;
}

// ─── Simple Weighted Sum (for when TOPSIS is overkill) ────────────────────────

export function weightedSum(
  alternatives: Alternative[],
  criteria: Criterion[]
): WeightedScore[] {
  const totalWeight = criteria.reduce((s, c) => s + Math.abs(c.weight), 0);

  // Min-max normalize each criterion column
  const colRanges = criteria.map((c) => {
    const vals = alternatives.map((a) => a.values[c.id] ?? 0);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  });

  const scores: WeightedScore[] = alternatives.map((alt) => {
    const normalizedValues: Record<string, number> = {};
    const weightedValues: Record<string, number> = {};
    let total = 0;

    criteria.forEach((c, j) => {
      const raw = alt.values[c.id] ?? 0;
      const { min, max } = colRanges[j];
      const range = max - min || 1;
      const normalized = c.direction === "maximize"
        ? (raw - min) / range
        : (max - raw) / range;

      const w = c.weight / totalWeight;
      normalizedValues[c.id] = normalized;
      weightedValues[c.id]   = normalized * w;
      total += normalized * w;
    });

    return { alternativeId: alt.id, label: alt.label, rawValues: alt.values, normalizedValues, weightedValues, totalScore: total, rank: 0 };
  });

  scores.sort((a, b) => b.totalScore - a.totalScore);
  scores.forEach((s, i) => { s.rank = i + 1; });
  return scores;
}

/*
 * Usage Example:
 *
 * const criteria: Criterion[] = [
 *   { id: "cost",     label: "Cost",        weight: 0.4, direction: "minimize" },
 *   { id: "quality",  label: "Quality",     weight: 0.35, direction: "maximize" },
 *   { id: "delivery", label: "Delivery",    weight: 0.25, direction: "minimize" },
 * ];
 *
 * const alternatives: Alternative[] = [
 *   { id: "vendor-a", label: "Vendor A", values: { cost: 100, quality: 8, delivery: 5 } },
 *   { id: "vendor-b", label: "Vendor B", values: { cost: 80,  quality: 6, delivery: 3 } },
 *   { id: "vendor-c", label: "Vendor C", values: { cost: 120, quality: 9, delivery: 7 } },
 * ];
 *
 * const ranking = topsis(alternatives, criteria);
 * // ranking[0] = best vendor by TOPSIS closeness score
 *
 * // AHP to derive weights from pairwise comparisons:
 * const { weights, isConsistent } = ahpWeights({
 *   criteria: ["cost", "quality", "delivery"],
 *   matrix: [
 *     [1,   2,   3],
 *     [1/2, 1,   2],
 *     [1/3, 1/2, 1],
 *   ],
 * });
 */
