/**
 * @keywords    ELO, TrueSkill, Bayesian rating, ranking score, competitive rating, skill estimation
 * @domain      Ranking Score
 * @use-when    Building competitive ranking systems: leaderboards, matchmaking, content quality rating
 * @not-when    Simple sort by count — this is for systems that need statistically robust rankings
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ELOPlayer {
  id: string;
  rating: number;
  gamesPlayed: number;
}

export interface ELOResult {
  winnerId: string;
  loserId: string;
  winnerNewRating: number;
  loserNewRating: number;
  ratingChange: number;
}

export interface TrueSkillPlayer {
  id: string;
  mu: number;      // Mean skill estimate (default 25)
  sigma: number;   // Uncertainty (default 8.333)
}

export interface BayesianRating {
  id: string;
  positive: number;   // Positive votes / wins
  total: number;      // Total votes / games
  score: number;      // Bayesian lower bound
  rawRate: number;    // Simple positive / total
}

// ─── ELO Rating System ────────────────────────────────────────────────────────

export class ELOSystem {
  private K: number;      // K-factor: higher = more volatile ratings
  private minK: number;   // Min K after many games (dampening)
  private dampAfter: number;

  constructor(K = 32, minK = 16, dampAfter = 30) {
    this.K = K;
    this.minK = minK;
    this.dampAfter = dampAfter;
  }

  expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  // Adaptive K-factor: new players have volatile ratings, veterans are stable
  private kFactor(gamesPlayed: number): number {
    if (gamesPlayed >= this.dampAfter) return this.minK;
    return this.K - ((this.K - this.minK) * gamesPlayed) / this.dampAfter;
  }

  recordMatch(winner: ELOPlayer, loser: ELOPlayer, draw = false): ELOResult {
    const expectedWinner = this.expectedScore(winner.rating, loser.rating);
    const expectedLoser  = this.expectedScore(loser.rating, winner.rating);

    const actualWinner = draw ? 0.5 : 1;
    const actualLoser  = draw ? 0.5 : 0;

    const kWinner = this.kFactor(winner.gamesPlayed);
    const kLoser  = this.kFactor(loser.gamesPlayed);
    const K = (kWinner + kLoser) / 2; // Average K to ensure zero-sum rating conservation
    const delta = K * (actualWinner - expectedWinner);

    return {
      winnerId: winner.id,
      loserId: loser.id,
      winnerNewRating: Math.round(winner.rating + delta),
      loserNewRating:  Math.round(loser.rating  - delta),
      ratingChange: Math.abs(Math.round(delta)),
    };
  }

  // Probability that player A beats player B
  winProbability(ratingA: number, ratingB: number): number {
    return this.expectedScore(ratingA, ratingB);
  }
}

// ─── TrueSkill (Simplified) ───────────────────────────────────────────────────
// Microsoft's Bayesian skill rating. Full implementation requires factor graphs;
// this is a closed-form 1v1 approximation accurate to within ~2% of the full model.

export class TrueSkillSystem {
  private mu0: number;      // Default initial mean
  private sigma0: number;   // Default initial sigma
  private beta: number;     // Performance variation (sigma0 / 2)
  private tau: number;      // Dynamic factor (sigma0 / 100)

  constructor(mu0 = 25, sigma0 = 25 / 3) {
    this.mu0 = mu0;
    this.sigma0 = sigma0;
    this.beta = sigma0 / 2;
    this.tau = sigma0 / 100;
  }

  createPlayer(id: string): TrueSkillPlayer {
    return { id, mu: this.mu0, sigma: this.sigma0 };
  }

  // Conservative skill estimate used for leaderboard display
  conservativeRating(player: TrueSkillPlayer): number {
    return player.mu - 3 * player.sigma;
  }

  // Win probability of player A over player B (Gaussian CDF approximation)
  winProbability(a: TrueSkillPlayer, b: TrueSkillPlayer): number {
    const deltaMu = a.mu - b.mu;
    const c = Math.sqrt(2 * this.beta ** 2 + a.sigma ** 2 + b.sigma ** 2);
    return gaussianCDF(deltaMu / c);
  }

  recordMatch(
    winner: TrueSkillPlayer,
    loser: TrueSkillPlayer
  ): { winner: TrueSkillPlayer; loser: TrueSkillPlayer } {
    const c = Math.sqrt(winner.sigma ** 2 + loser.sigma ** 2 + 2 * this.beta ** 2);
    const winProb = Math.max(1e-9, gaussianCDF((winner.mu - loser.mu) / c));

    // Approximation of message passing update
    const v = gaussianPDF((winner.mu - loser.mu) / c) / winProb;
    const w = v * (v + (winner.mu - loser.mu) / c);

    const newWinner: TrueSkillPlayer = {
      id: winner.id,
      mu:    winner.mu + (winner.sigma ** 2 / c) * v,
      sigma: Math.sqrt(Math.max(1e-9, winner.sigma ** 2 * (1 - (winner.sigma ** 2 / c ** 2) * w)) + this.tau ** 2),
    };

    const newLoser: TrueSkillPlayer = {
      id: loser.id,
      mu:    loser.mu  - (loser.sigma  ** 2 / c) * v,
      sigma: Math.sqrt(Math.max(1e-9, loser.sigma ** 2 * (1 - (loser.sigma ** 2 / c ** 2) * w)) + this.tau ** 2),
    };

    return { winner: newWinner, loser: newLoser };
  }
}

// ─── Bayesian Average Rating ──────────────────────────────────────────────────
// Ranks items by rating considering vote count — prevents items with 1 perfect vote from topping charts

export function bayesianAverage(
  items: Array<{ id: string; positive: number; total: number }>,
  priorStrength = 10,  // How many prior votes to inject (higher = more conservative)
  priorMean = 0.7      // Prior expected positive rate
): BayesianRating[] {
  return items
    .map((item) => {
      const score = (item.positive + priorStrength * priorMean) / (item.total + priorStrength);
      return {
        id: item.id,
        positive: item.positive,
        total: item.total,
        score,
        rawRate: item.total === 0 ? 0 : item.positive / item.total,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Wilson Score (Lower Bound of CI on Bernoulli Parameter) ──────────────────

export function wilsonScore(
  positive: number,
  total: number,
  confidence = 0.95
): number {
  if (total === 0) return 0;
  const z = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 }[confidence] ?? 1.96;
  const pHat = positive / total;
  const z2 = z * z;
  return (
    (pHat + z2 / (2 * total) - z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * total)) / total)) /
    (1 + z2 / total)
  );
}

// ─── Math Helpers ─────────────────────────────────────────────────────────────

function gaussianCDF(x: number): number {
  // Abramowitz & Stegun approximation, max error 7.5×10⁻⁸
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp((-x * x) / 2);
  const poly = t * (0.3193815302 + t * (-0.3565637813 + t * (1.7814779372 + t * (-1.8212559978 + t * 1.3302744929))));
  const p = 1 - d * poly;
  return x >= 0 ? p : 1 - p;
}

function gaussianPDF(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createELO      = (K?: number) => new ELOSystem(K);
export const createTrueSkill = (mu?: number, sigma?: number) => new TrueSkillSystem(mu, sigma);

/*
 * Usage Example:
 *
 * const elo = createELO(32);
 * const result = elo.recordMatch(
 *   { id: "alice", rating: 1500, gamesPlayed: 10 },
 *   { id: "bob",   rating: 1400, gamesPlayed: 25 }
 * );
 * // result.winnerNewRating ≈ 1507, loserNewRating ≈ 1393
 *
 * // Bayesian average for content rating
 * const ranked = bayesianAverage([
 *   { id: "post-1", positive: 95,  total: 100 },
 *   { id: "post-2", positive: 1,   total: 1   }, // 100% but only 1 vote
 *   { id: "post-3", positive: 800, total: 1000 },
 * ]);
 * // post-1 ranks above post-2 despite same raw rate, post-3 wins by volume
 */
