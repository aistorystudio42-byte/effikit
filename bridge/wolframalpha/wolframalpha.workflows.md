<!-- @keywords: wolfram, calculus, linear algebra, statistics, physics simulation, engineering, data science, formula derivation -->
<!-- @domain: WolframAlpha MCP Server — Scientific & Engineering Workflows -->

# WolframAlpha — Scientific & Engineering Workflows

## Mathematics Workflows

### Calculus

```
# Derivatives
"derivative of x^3 * sin(x) with respect to x"
"second derivative of e^(x^2)"
"partial derivative of x^2*y + y^3 with respect to y"

# Integrals
"indefinite integral of ln(x) dx"
"definite integral of sqrt(1-x^2) from -1 to 1"  
"double integral of x*y over region 0<x<1, 0<x<y"

# Series
"Taylor series of sin(x) around x=0 up to x^7"
"Fourier series of f(x) = x on [-pi, pi]"
"sum from n=1 to infinity of 1/n^2"  → π²/6

# Limits
"limit as x→0 of (1 - cos x) / x^2"
"limit as x→infinity of (1 + 1/x)^x"  → e
```

### Linear Algebra

```
# Matrix operations
"inverse of matrix {{2,1},{5,3}}"
"determinant of {{1,2,3},{4,5,6},{7,8,9}}"
"matrix {{1,2},{3,4}} * {{5,6},{7,8}}"

# Eigenvalues / eigenvectors
"eigenvalues and eigenvectors of {{4,1},{2,3}}"

# Solving systems
"solve the system: 2x + 3y = 7, 5x - y = 2"
"solve the system: x+y+z=6, 2x-y+z=3, x+2y-z=2"
```

### Number Theory & Combinatorics

```
"is 982451653 prime?"
"prime factorization of 360"
"GCD and LCM of 84 and 120"
"number of ways to arrange 7 items choosing 3"  → C(7,3) = 35
"Fibonacci sequence up to the 20th term"
"digits of pi to 100 decimal places"
```

---

## Statistics & Probability

### Distributions

```
# Normal distribution
"P(X < 1.96) for standard normal distribution"
"P(-1 < X < 1) for standard normal"  → 68.27%
"inverse normal CDF at 0.975"  → 1.96 (confirms z-score for 95% CI)

# Other distributions
"P(X = 4) for Poisson distribution with lambda = 3"
"P(X <= 8) for binomial n=10, p=0.7"
"Student's t distribution with 10 df, P(|T| > 2.228)"
"F distribution with df1=2, df2=10, 95th percentile"
```

### Regression & Statistical Tests

```
"linear regression for data points (1,2),(2,3),(3,5),(4,4),(5,6)"

"chi-squared test: observed values 40,60 expected values 50,50"

"correlation coefficient for (1,1),(2,3),(3,2),(4,5),(5,4)"
```

### Expected Value Calculations

```
"expected value of rolling two dice and taking the maximum"

"expected number of coin flips until getting 3 heads in a row"

"probability of at least 2 sixes in 10 dice rolls"
```

---

## Physics & Engineering

### Mechanics

```
"projectile motion: initial velocity 50 m/s at 30 degrees, 
find maximum height, range, and time of flight"

"oscillation: mass 2kg on spring with k=50 N/m, 
find period, frequency, and angular frequency"

"work done by force F=5x^2 N along x from 0 to 4 meters"
```

### Thermodynamics

```
"entropy change when 1 mol of ideal gas expands isothermally 
from V1=1L to V2=5L at 300K"

"Carnot efficiency with hot reservoir at 600K and cold at 300K"

"heat transfer through 10cm thick brick wall (k=0.8 W/mK), 
area 10 m^2, temperature difference 20°C"
```

### Electromagnetism

```
"electric field at distance 0.1m from a point charge of 5 microcoulombs"

"capacitance of parallel plate capacitor: area 0.01 m^2, 
separation 1mm, dielectric constant 4"

"inductance needed to resonate with 100pF capacitor at 1MHz"

"skin depth in copper at 60Hz"
```

### Relativity

```
"time dilation: 10 years at 0.9c as experienced by stationary observer"

"length contraction: 100m spaceship moving at 0.8c"

"relativistic kinetic energy of a 1kg mass at 0.5c"
```

---

## Chemistry

### Molecular Properties

```
"molecular weight of glucose C6H12O6"
"boiling point of ethanol"
"density of liquid mercury at 20°C"
"pKa of acetic acid"
```

### Reaction Balancing

```
"balance the equation: H2 + O2 → H2O"
"balance: Fe2O3 + CO → Fe + CO2"
"oxidation state of Mn in KMnO4"
```

### Thermochemistry

```
"standard enthalpy of combustion of methane"
"Gibbs free energy of ATP hydrolysis at pH 7, 37°C"
"equilibrium constant for N2 + 3H2 → 2NH3 at 500°C"
```

---

## Finance & Economics

```
"compound interest: $10,000 at 7% per year for 20 years"

"present value of $50,000 in 10 years at 5% discount rate"

"break-even quantity: fixed cost $10,000, variable cost $15/unit, 
price $40/unit"

"internal rate of return: initial investment -$1000, 
cash flows [200, 300, 400, 500] over 4 years"

"Black-Scholes option price: S=100, K=105, T=1, r=0.05, sigma=0.2"
```

---

## Combining Wolfram + Claude

The most powerful workflow: Wolfram computes, Claude interprets.

```
Use WolframAlpha to find the eigenvalues of this matrix:
{{3, 1, 0}, {1, 3, 1}, {0, 1, 3}}

Then explain what these eigenvalues tell us about the system 
this matrix might represent (e.g., a coupled oscillator system).
```

```
Use WolframAlpha to compute the derivative of f(x) = x^4 - 3x^2 + 2,
find all critical points, and determine which are maxima/minima.
Then describe the shape of the function.
```
