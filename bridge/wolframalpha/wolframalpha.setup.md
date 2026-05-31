<!-- @keywords: wolfram, wolframalpha, math, equation, physics, chemistry, calculus, computation, science, formula -->
<!-- @domain: WolframAlpha MCP Server — Setup & Query Guide -->

# WolframAlpha MCP Server — Setup & Query Guide

## What This Is

The WolframAlpha MCP server gives Claude access to Wolfram's computational knowledge engine — the most powerful math, science, and data computation system available in any AI assistant integration. It answers questions that require real calculation, not approximation.

---

## Installation

### Prerequisites
- A WolframAlpha API key (AppID)

### Step 1 — Get API Key

1. Go to: https://developer.wolframalpha.com/portal/myapps/
2. Sign up or log in
3. Click "Get an AppID"
4. Fill in app name: `claude-mcp`, type: `Personal`
5. Copy your AppID (format: `XXXXX-XXXXXXXXXX`)

**Free tier:** 2,000 API calls/month — sufficient for development.

### Step 2 — Add to claude_desktop_config.json

```json
{
  "mcpServers": {
    "wolframalpha": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-wolframalpha"],
      "env": {
        "WOLFRAM_APP_ID": "XXXXX-XXXXXXXXXX"
      }
    }
  }
}
```

### Step 3 — Verify

Restart Claude Desktop. Ask:
> "What is the integral of x^2 from 0 to 10?"

If you get a precise numerical answer (333.333...) rather than a rounded estimate, the server is active.

---

## Why Use WolframAlpha vs Claude's Own Math

| Situation | Use Claude | Use WolframAlpha |
|-----------|-----------|-----------------|
| Conceptual explanation of a formula | ✅ | |
| Precise numerical computation | | ✅ |
| Step-by-step derivation | | ✅ |
| Unit conversion with precision | | ✅ |
| Historical data / world facts | | ✅ |
| Symbolic algebra / simplification | | ✅ |
| Statistical distributions | | ✅ |
| Physical constants (exact values) | | ✅ |

Claude's arithmetic can drift on large or complex calculations. WolframAlpha is exact.

---

## What WolframAlpha Can Compute

### Mathematics
- Arithmetic, algebra, linear algebra, calculus, differential equations
- Number theory, combinatorics, statistics, probability
- Symbolic manipulation, simplification, factoring, solving

### Physics
- Mechanics, thermodynamics, electromagnetism, quantum mechanics
- Unit conversions (all unit systems including SI, CGS, Imperial)
- Physical constants to full precision
- Formulas with substituted values

### Chemistry
- Molecular formulas, weights, structure
- Chemical reactions, balancing
- Thermodynamic data, boiling/melting points
- Periodic table data

### Data and Facts
- Population statistics, economic data
- Astronomical data (star distances, planet positions)
- Geographic data
- Historical dates and data

---

## Query Syntax

WolframAlpha understands natural language but responds better to structured queries:

```
# Mathematics — be explicit
"integrate x^2*sin(x) from x=0 to x=pi"
"solve x^3 - 2x + 1 = 0"
"eigenvalues of matrix {{1,2},{3,4}}"
"limit as x approaches 0 of (sin x)/x"

# Physics — include units
"velocity of a 5kg object after 3s with force 10N"
"gravitational force between Earth and Moon"
"wavelength of 500nm light in glass with n=1.5"

# Unit conversions
"120 mph in m/s"
"37 Celsius in Fahrenheit"
"1 parsec in light years"
"1 atm in pascals"

# Statistics
"normal distribution with mean 100 standard deviation 15 at x=130"
"binomial distribution n=20 p=0.3 P(X >= 10)"
"95th percentile of chi-squared distribution with 5 degrees of freedom"
```

---

## Common Prompt Examples

```
Use WolframAlpha to compute the exact value of: 
integral from 0 to infinity of e^(-x^2) dx
```

```
Calculate the monthly payment for a mortgage of $400,000 
at 6.5% annual interest rate for 30 years
```

```
What is the gravitational potential energy of a 70kg person 
standing on top of Mount Everest (8849m)?
```

```
Solve the differential equation: y'' + 2y' + y = 0 with y(0)=1, y'(0)=0
```

```
Find all prime factors of 123456789
```

```
What is the distance from Earth to Alpha Centauri in light years and kilometers?
```

```
Convert 0.5 mol of NaCl — what is the mass in grams?
```

```
Calculate the 99% confidence interval for a sample mean of 150, 
standard deviation 20, sample size 50
```
