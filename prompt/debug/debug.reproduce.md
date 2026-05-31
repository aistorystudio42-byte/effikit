<!-- @keywords: reproduce bug, minimal reproduction, isolate, test case, repro steps, edge case isolation -->
<!-- @domain: Bug Reproduction & Isolation Prompts -->

# Bug Reproduction & Isolation Prompts

## Build a Minimal Reproduction

```
Help me create a minimal reproduction of this bug.

**Original context:**
- Full app: [Next.js app / Express server / React component]
- Bug: [describe what goes wrong]
- Original code: [paste the relevant parts]

**Goal:** Smallest possible standalone example that still shows the bug.

**Steps:**
1. Strip dependencies: remove everything not needed to trigger the bug
2. Strip data: replace real data with the simplest fake data that reproduces it
3. Strip UI: remove all styling, unrelated components
4. Strip network: replace API calls with hardcoded responses if possible
5. Result: a single file or CodeSandbox-able snippet

**Output:**
A self-contained code snippet that:
- Runs without installing anything beyond React/Node
- Shows the bug when run
- Has a comment marking exactly where the bug manifests
```

---

## Isolate a Flaky Test

```
This test fails sometimes. Help me make it deterministic.

**Test code:**
[paste the test]

**Failure pattern:**
- Fails: [1 in 10 runs / always on CI / never locally / only in parallel]
- Error when it fails: [paste error message]

**Suspects:**
- [ ] Depends on test execution order
- [ ] Time-dependent (Date.now(), setTimeout, setInterval)
- [ ] Random values (Math.random())
- [ ] Shared mutable state between tests
- [ ] Network/IO that isn't fully mocked
- [ ] Async timing (resolved before/after assertion)
- [check all that might apply]

**Analysis I need:**
1. Exact cause of non-determinism
2. How to mock/control the unstable element
3. Fixed test code
4. How to verify the fix made it deterministic (run N times)
```

---

## Trace a Data Corruption Bug

```
My data is being corrupted somewhere. Help me trace the source.

**Symptom:**
[describe the corrupt data — wrong values, missing fields, duplicates, wrong type]

**Data flow:**
Source → [step] → [step] → [step] → Storage → [step] → UI

**Where corruption is first observed:**
[at which step the data looks wrong]

**Code for each step:**
[paste transformation/processing code for each step]

**What I need:**
1. Add console.log/assert statements at each step to trace the value
2. Identify which transformation introduces the corruption
3. Why: type coercion? mutation? wrong reference? incorrect formula?
4. Fix the specific transformation
5. Add a validation step that would catch this corruption class going forward
```

---

## Environment-Specific Bug

```
A bug only appears in [dev/staging/production]. Help me find the difference.

**Bug:** [describe behavior]
**Works in:** [dev / staging / prod]
**Fails in:** [dev / staging / prod]

**Environment differences:**
| Aspect | Works | Fails |
|--------|-------|-------|
| Node version | | |
| Database | | |
| ENV variables | | |
| Data volume | | |
| Network | | |
| Auth | | |

**Relevant code:**
[paste the code that behaves differently]

**Analysis:**
1. Which environmental difference most plausibly causes this?
2. How to test that hypothesis without full production access
3. If it's an ENV variable: which one and what value mismatch
4. If it's data volume: what threshold triggers the bug
5. Fix that works across all environments
```

---

## Third-Party Library Bug Hunt

```
I think a library is misbehaving. Help me confirm and work around it.

**Library:** [name + version]
**Installed via:** npm/yarn/pnpm

**Behavior I expect (from docs):**
[describe]

**Behavior I observe:**
[describe]

**My code:**
[paste how I'm using the library]

**Analysis:**
1. Is this a documented behavior or genuine bug?
2. Does it match any known open issues? (search for terms I can use)
3. Minimal reproduction that isolates the library (not my code)
4. Workaround that doesn't require upgrading/replacing the library
5. If upgrade is needed: is the fixed version documented? Breaking changes?

**After analysis:**
If it's a library bug: provide a temporary wrapper/patch that fixes 
behavior until the upstream fix is available.
```
