/**
 * @keywords    genetic algorithm, simulated annealing, gradient descent, optimization, metaheuristic, evolution
 * @domain      Optimization Algorithm
 * @use-when    Solving combinatorial or continuous optimization problems without closed-form solutions
 * @not-when    The problem has a known closed-form solution or can be solved with simple sorting
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Chromosome = number[];

export interface GAConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;      // 0–1
  crossoverRate: number;     // 0–1
  elitismRatio: number;      // Fraction of top individuals preserved unchanged
  tournamentSize: number;    // For tournament selection
}

export interface SAConfig {
  initialTemp: number;
  finalTemp: number;
  coolingRate: number;       // Multiplicative cooling: T *= coolingRate each step
  stepsPerTemp: number;      // Iterations at each temperature level
}

export interface GDConfig {
  learningRate: number;
  maxIterations: number;
  convergenceThreshold: number; // Stop when gradient norm < this
  momentum: number;             // 0 = no momentum, 0.9 = heavy momentum
}

// ─── Genetic Algorithm ────────────────────────────────────────────────────────

export class GeneticAlgorithm {
  private config: GAConfig;
  private fitnessCache = new Map<string, number>();

  constructor(config: Partial<GAConfig> = {}) {
    this.config = {
      populationSize: config.populationSize ?? 100,
      generations:    config.generations    ?? 200,
      mutationRate:   config.mutationRate   ?? 0.02,
      crossoverRate:  config.crossoverRate  ?? 0.8,
      elitismRatio:   config.elitismRatio   ?? 0.1,
      tournamentSize: config.tournamentSize ?? 5,
    };
  }

  evolve(
    initialPopulation: Chromosome[],
    fitness: (c: Chromosome) => number,
    mutate: (c: Chromosome) => Chromosome,
    crossover: (a: Chromosome, b: Chromosome) => [Chromosome, Chromosome]
  ): { best: Chromosome; bestFitness: number; generationBests: number[] } {
    let population = [...initialPopulation];
    const generationBests: number[] = [];
    let overallBest = population[0];
    let overallBestFitness = -Infinity;

    const MAX_CACHE_SIZE = 10000;
    const getFitness = (c: Chromosome): number => {
      const key = c.join(",");
      if (!this.fitnessCache.has(key)) {
        if (this.fitnessCache.size >= MAX_CACHE_SIZE) {
          this.fitnessCache.delete(this.fitnessCache.keys().next().value!);
        }
        this.fitnessCache.set(key, fitness(c));
      }
      return this.fitnessCache.get(key)!;
    };

    for (let gen = 0; gen < this.config.generations; gen++) {
      const scored = population.map((c) => ({ c, f: getFitness(c) })).sort((a, b) => b.f - a.f);

      const genBest = scored[0];
      generationBests.push(genBest.f);
      if (genBest.f > overallBestFitness) {
        overallBest = genBest.c;
        overallBestFitness = genBest.f;
      }

      // Elitism: carry top N directly
      const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRatio);
      const nextGen: Chromosome[] = scored.slice(0, eliteCount).map((s) => [...s.c]);

      // Fill rest via tournament selection + crossover + mutation
      while (nextGen.length < this.config.populationSize) {
        const parentA = this.tournamentSelect(scored);
        const parentB = this.tournamentSelect(scored);

        let [childA, childB] =
          Math.random() < this.config.crossoverRate
            ? crossover(parentA, parentB)
            : [[...parentA], [...parentB]];

        if (Math.random() < this.config.mutationRate) childA = mutate(childA);
        if (Math.random() < this.config.mutationRate) childB = mutate(childB);

        nextGen.push(childA);
        if (nextGen.length < this.config.populationSize) nextGen.push(childB);
      }

      population = nextGen;
    }

    return { best: overallBest, bestFitness: overallBestFitness, generationBests };
  }

  private tournamentSelect(scored: Array<{ c: Chromosome; f: number }>): Chromosome {
    let best = scored[Math.floor(Math.random() * scored.length)];
    for (let i = 1; i < this.config.tournamentSize; i++) {
      const candidate = scored[Math.floor(Math.random() * scored.length)];
      if (candidate.f > best.f) best = candidate;
    }
    return [...best.c];
  }
}

// ─── Simulated Annealing ──────────────────────────────────────────────────────

export class SimulatedAnnealing {
  private config: SAConfig;

  constructor(config: Partial<SAConfig> = {}) {
    this.config = {
      initialTemp: config.initialTemp ?? 1000,
      finalTemp:   config.finalTemp   ?? 1,
      coolingRate: config.coolingRate ?? 0.95,
      stepsPerTemp: config.stepsPerTemp ?? 100,
    };
  }

  optimize<S>(
    initial: S,
    energy: (s: S) => number,         // Lower = better
    neighbor: (s: S) => S
  ): { best: S; bestEnergy: number; acceptanceHistory: number[] } {
    let current = initial;
    let currentEnergy = energy(current);
    let best = current;
    let bestEnergy = currentEnergy;
    let temp = this.config.initialTemp;
    const acceptanceHistory: number[] = [];

    let outerSteps = 0;
    const maxOuterSteps = 10000;

    while (temp > this.config.finalTemp && outerSteps < maxOuterSteps) {
      outerSteps++;
      let accepted = 0;

      for (let step = 0; step < this.config.stepsPerTemp; step++) {
        const candidate = neighbor(current);
        const candidateEnergy = energy(candidate);
        const delta = candidateEnergy - currentEnergy;

        // Always accept improvements; accept degradations with Boltzmann probability
        if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
          current = candidate;
          currentEnergy = candidateEnergy;
          accepted++;

          if (currentEnergy < bestEnergy) {
            best = current;
            bestEnergy = currentEnergy;
          }
        }
      }

      acceptanceHistory.push(accepted / this.config.stepsPerTemp);
      temp *= this.config.coolingRate;
    }

    return { best, bestEnergy, acceptanceHistory };
  }
}

// ─── Gradient Descent ──────────────────────────────────────────────────────────

export class GradientDescent {
  private config: GDConfig;

  constructor(config: Partial<GDConfig> = {}) {
    this.config = {
      learningRate: config.learningRate ?? 0.01,
      maxIterations: config.maxIterations ?? 1000,
      convergenceThreshold: config.convergenceThreshold ?? 1e-6,
      momentum: config.momentum ?? 0.9,
    };
  }

  minimize(
    initialParams: number[],
    // Numerical gradient via central differences
    loss: (params: number[]) => number,
    epsilon = 1e-5
  ): { params: number[]; lossHistory: number[]; converged: boolean } {
    let params = [...initialParams];
    let velocity = new Array(params.length).fill(0);
    const lossHistory: number[] = [];
    let converged = false;

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      const currentLoss = loss(params);
      lossHistory.push(currentLoss);

      // Compute gradient via central differences
      const gradient = params.map((_, i) => {
        const plus  = [...params]; plus[i]  += epsilon;
        const minus = [...params]; minus[i] -= epsilon;
        return (loss(plus) - loss(minus)) / (2 * epsilon);
      });

      // Gradient norm for convergence check
      const gradNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));
      if (gradNorm < this.config.convergenceThreshold) { converged = true; break; }

      // Momentum update
      velocity = velocity.map((v, i) =>
        this.config.momentum * v - this.config.learningRate * gradient[i]
      );
      params = params.map((p, i) => p + velocity[i]);
    }

    return { params, lossHistory, converged };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createGA  = (config?: Partial<GAConfig>)  => new GeneticAlgorithm(config);
export const createSA  = (config?: Partial<SAConfig>)  => new SimulatedAnnealing(config);
export const createGD  = (config?: Partial<GDConfig>)  => new GradientDescent(config);

/*
 * Usage Example — Genetic Algorithm (Travelling Salesman):
 *
 * const ga = createGA({ populationSize: 200, generations: 500, mutationRate: 0.01 });
 * const { best } = ga.evolve(
 *   initialPopulation,
 *   (route) => 1 / totalDistance(route), // maximize inverse distance
 *   (route) => swapTwoGenes(route),
 *   (a, b) => orderedCrossover(a, b)
 * );
 *
 * // Gradient Descent (minimize MSE):
 * const gd = createGD({ learningRate: 0.001, maxIterations: 5000 });
 * const { params, converged } = gd.minimize([0, 0], ([w, b]) => mse(X, y, w, b));
 */
