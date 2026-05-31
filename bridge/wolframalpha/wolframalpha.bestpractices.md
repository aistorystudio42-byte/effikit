<!-- @keywords: wolfram, query optimization, natural language, API limits, error handling, precision, units, verification -->
<!-- @domain: WolframAlpha MCP Server — Best Practices & Query Optimization -->

# WolframAlpha — Best Practices & Query Optimization

## Writing Effective Queries

### Be Explicit About What You Want

WolframAlpha often returns multiple "pods" (result sections). Guide it toward the specific output you need:

```
# Vague — returns everything about this integral
"integral of sin^2(x)"

# Better — specifies what you want
"indefinite integral of sin^2(x), show step-by-step solution"

# Best — specifies output format  
"integral of sin^2(x) dx — show antiderivative, simplified form, and numerical value at x=pi/4"
```

### Include Units Explicitly

```
# Ambiguous
"velocity after 5 seconds at 10 acceleration"

# Clear
"final velocity in m/s: initial velocity 0 m/s, acceleration 10 m/s^2, time 5s"

# For conversions — both directions
"convert 72 kg to pounds"
"convert 180 lb to kg"
```

### Avoid Ambiguous Variable Names

```
# WolframAlpha might interpret "e" as Euler's number
"e^x derivative"  → might give d/dx(e^x) = e^x (correct but unexpected)

# Be explicit
"derivative of exp(x) with respect to x"

# For specific values
"evaluate sin(x) at x = pi/6"  → 0.5
```

---

## Query Categories and Syntax

### Mathematics — Precise Notation

```
# Powers
x^2        → x squared
x^(1/2)    → square root of x  
sqrt(x)    → also works

# Functions
ln(x)      → natural log (not log — log is base 10)
log(x)     → base 10 logarithm
log_2(x)   → base 2 logarithm
abs(x)     → absolute value
floor(x), ceiling(x), round(x)

# Constants  
pi         → π (3.14159...)
e          → Euler's number (2.71828...)
i          → imaginary unit
inf        → infinity
```

### Physics — Unit Notation

```
# SI units
m, kg, s, A, K, mol, cd
N (newton), J (joule), W (watt), Pa (pascal), Hz, V, Ohm

# Common combinations
"m/s^2"    → meters per second squared
"kg*m/s"   → kg meters per second (momentum units)
"N*m"      → newton-meters (torque/energy)
```

---

## Precision and Numerical Results

WolframAlpha returns exact results by default. To get decimal approximations:

```
# For symbolic results you want as decimals
"pi^3 to 20 significant figures"
"e^10 as decimal"
"sqrt(2) to 50 decimal places"
```

**For engineering calculations, always verify units are consistent.** A common mistake:

```
# Wrong — mixed units
"force = 5 lbf * 10 m/s^2"  → WolframAlpha will flag or convert

# Right — keep units consistent
"force = 5 kg * 10 m/s^2"   → 50 N
```

---

## Knowing Wolfram's Limits

### What it does well
- Exact symbolic computation (integrals, derivatives, limits)
- Numerical answers to arbitrary precision
- Physics problems with substituted values
- Standard statistical distributions
- Unit conversions (any unit system)
- Mathematical constants to any precision

### What it doesn't do
- Code debugging or code generation
- Understanding your specific business problem context
- Qualitative reasoning about results
- Graphing code (it provides the graph as an image, not React code)
- Problems requiring knowledge of your specific data

### What to do when Wolfram can't compute

Some queries return "Wolfram|Alpha does not understand your query":

1. **Simplify the query** — break compound questions into parts
2. **Rephrase mathematically** — use symbols instead of words
3. **Use Wolfram syntax** — `x^2` not `x squared`
4. **Check for typos in formulas** — one wrong character breaks parsing

```
# If this fails:
"moment of inertia of non-uniform rod with density rho(x) = x^2"

# Break it into parts:
"integrate x^2 * x^2 from 0 to L with respect to x"
→ then: "simplify L^5/5 * rho_0 where rho_0 is density coefficient"
```

---

## API Rate Limit Management

**Free tier: 2,000 calls/month ≈ 67 calls/day**

**Expensive operations (avoid repeating):**
- Repeated reformulations of the same problem
- Queries with very large numbers (more processing)
- Step-by-step solutions (uses more compute)

**Strategies to reduce calls:**
```
# Ask for everything in one query instead of multiple
"for the function f(x) = x^3 - 3x + 2: 
find all roots, critical points, inflection points, 
and domain where f is increasing"

# vs. 4 separate queries for each ← wastes API calls
```

---

## Combining With Claude's Analysis

The correct mental model: **Wolfram computes, Claude reasons.**

```
# Full workflow example

Step 1 — Wolfram computes
"Use WolframAlpha: solve x^4 - 5x^2 + 4 = 0"

Step 2 — Claude interprets
"The solutions are x = ±1 and x = ±2. 
These roots represent the zeros of the function.
Between them, the function is [positive/negative].
This is useful for [specific application]."

Step 3 — Wolfram verifies the interpretation
"Use WolframAlpha: plot x^4 - 5x^2 + 4 from x=-3 to x=3 
to visually confirm the roots"
```

---

## Verification Workflow

When implementing a mathematical formula in code, always verify with Wolfram:

```
1. Derive or look up the formula
2. Use WolframAlpha to compute a known-answer test case
3. Implement in code
4. Run your implementation against the same test case
5. If they match → formula is correctly implemented

Example:
"WolframAlpha: normal distribution PDF with mean=0, std=1 at x=0"
→ 0.3989422804...

Then your code:
Math.exp(-0.5 * (0/1)**2) / (1 * Math.sqrt(2 * Math.PI))
→ should match to many decimal places
```
