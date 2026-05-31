<!-- @keywords: network, CORS, HTTP, request, response, API call, 401, 403, timeout, fetch error, websocket -->
<!-- @domain: Network & API Debug Prompts -->

# Network & API Debug Prompts

## CORS Error

```
Help me fix this CORS error.

**Error message:**
[paste full browser console CORS error]

**Request details:**
- Origin (browser): [http://localhost:3000 or https://myapp.com]
- Target URL: [https://api.example.com/endpoint]
- Method: [GET / POST / PUT / DELETE]
- Custom headers sent: [Authorization, Content-Type, etc.]
- Credentials: [yes (cookies) / no]

**Server config:**
[paste current CORS configuration — Express cors(), Next.js headers, nginx config, etc.]

**Preflight behavior:**
- Is there an OPTIONS preflight request? [yes / no / unknown]
- What does the preflight response return?

**Fix I need:**
1. Exact server-side CORS headers required for this request
2. Code to set them in [my server framework]
3. If credentials=true: special requirements (exact origin, not wildcard)
4. How to test that CORS is correctly configured
```

---

## Authentication / Token Error

```
My API calls are failing with auth errors. Help me debug.

**Error:** [401 Unauthorized / 403 Forbidden / token expired / invalid signature]

**Auth type:** [JWT Bearer / Cookie session / API key / OAuth2]

**Request:**
[paste the request headers — redact the actual token value]

**Server validation code:**
[paste the auth middleware / token validation logic]

**Client-side token handling:**
[paste how the token is stored and attached to requests]

**Questions:**
1. Is the token malformed, expired, or correct but rejected?
2. Is the token being sent in the right format? (Bearer prefix, cookie name, header name)
3. Is there a token refresh flow? Is it working?
4. Is the signing secret/key the same on both ends?
5. Is clock skew a factor? (iat/exp vs server time)

Fix: exact change to client code, server code, or both.
```

---

## Slow / Hanging Request

```
This API request is slow or hangs indefinitely. Help me diagnose.

**Request:** [method] [URL]
**Expected response time:** [X ms]
**Actual response time:** [Y ms / times out after Z seconds]
**Frequency:** [always / sometimes / only under load]

**Server-side code:**
[paste the handler / resolver / controller]

**Database queries in this path:**
[paste queries or ORM calls]

**External service calls:**
[list any third-party APIs, services called]

**Diagnosis checklist:**
- [ ] Is the slow part the DB query? (add query timing logs)
- [ ] Is the slow part an external HTTP call? (add request timing)
- [ ] Is there an N+1 query pattern?
- [ ] Is there a missing await causing silent hanging?
- [ ] Is there no timeout on external calls?
- [ ] Is a database connection being waited for (pool exhausted)?

For each confirmed bottleneck: show the fix and expected improvement.
```

---

## WebSocket Debugging

```
My WebSocket connection has problems. Help me diagnose.

**Problem:**
- [ ] Can't connect (connection refused / handshake fails)
- [ ] Connects but disconnects immediately
- [ ] Messages not received
- [ ] Messages delivered out of order
- [ ] Memory leak (connections not cleaned up)
- [ ] Reconnect loop

**Client code:**
[paste WebSocket client / socket.io client code]

**Server code:**
[paste WebSocket server / socket.io server handler]

**Error / log output:**
[paste connection errors, disconnect reasons, console output]

**Analysis:**
1. Connection phase: is the HTTP→WS upgrade succeeding?
2. Authentication: is the auth check in the handshake correct?
3. Message routing: are messages going to the right room/channel?
4. Cleanup: are connections properly closed and removed from memory on disconnect?
5. Reconnect strategy: is exponential backoff implemented?

Fix all issues found. Show both client and server changes.
```

---

## API Response Shape Mismatch

```
The API returns data in an unexpected shape. Help me trace why.

**Expected response:**
[paste expected JSON structure]

**Actual response:**
[paste actual JSON received]

**Differences:**
- Missing fields: [list]
- Wrong types: [field: expected type → actual type]
- Extra fields: [list]
- Nested differently: [describe]

**Server code (serialization):**
[paste the code that creates the response]

**Client code (parsing):**
[paste the code that consumes the response]

**Root cause analysis:**
1. Is the server not returning what the docs say? (bug in serializer)
2. Is the client parsing it incorrectly? (wrong field names, missing nullish handling)
3. Is there a version mismatch between client and server expectations?
4. Is the response shape correct but a Zod/type validation is too strict?

Fix: exact change to align server output with client expectation (or vice versa).
Add runtime validation (Zod parse) to catch this class of mismatch in future.
```
