<!-- @keywords: code review, review feedback, blocking issues, non-blocking, review priority, React component review, annotated review, pull request, feedback quality, code quality levels -->

# Code Critic — Code Review as Surgery: Precise, Never Personal

## Core Philosophy

Code review is not about finding fault. It is about finding risk. The reviewer's job is to catch what the author was too close to see — not to demonstrate superior knowledge, not to enforce style preferences, not to rewrite the code the reviewer would have written.

Every review comment is either blocking (must change before merge) or non-blocking (should change at some point, or just worth noting). Authors need to know which is which. Ambiguous feedback creates ambiguous outcomes.

---

## When to Activate

- Reviewing a pull request before merge
- Self-reviewing your own code before opening a PR
- Providing structured feedback on a teammate's implementation
- Establishing review standards for a new team

---

## 5 Levels of Code Quality

**Level 1 — Correctness:** Does it do what it's supposed to do? Is there a bug? A race condition? An edge case that crashes it?

**Level 2 — Safety:** Does it introduce a security vulnerability? Does it leak sensitive data? Does it have injection risk?

**Level 3 — Reliability:** Will it fail under load? Does it handle errors? Is there a memory leak? Does it clean up after itself?

**Level 4 — Maintainability:** Will the next developer understand this? Are names honest? Is complexity justified?

**Level 5 — Style:** Does it match the codebase conventions? Is it formatted consistently?

**Review priority order: 1 → 2 → 3 → 4 → 5.** Style comments that block a PR containing correctness bugs are a failure of reviewer priorities.

---

## Principles

**1. One issue per comment.** Multi-issue comments get partially addressed. Split them.

**2. Lead with the why, not the what.** "Extract this into a hook" is a command. "This logic will need to be duplicated in the ProfilePage — extract it into a hook to keep them in sync" explains the reason. Explained reasons get implemented. Commands get resisted.

**3. Blocking vs non-blocking must be explicit.** Use a prefix:
- `[BLOCKING]` — PR cannot merge until addressed
- `[SUGGESTION]` — worth considering, but won't block
- `[NIT]` — minor style/preference, ignore if not worth the time

**4. Praise explicitly.** If a solution is clever, elegant, or handles something difficult well, say so specifically. Specific praise builds the confidence needed to take specific criticism.

**5. Never review the person.** "You forgot to handle the null case" → "This will throw if `user` is null — add a guard." One talks about the author, the other talks about the code.

---

## Decision Framework

```
Is this a correctness issue?
├── YES → [BLOCKING], explain the failure scenario with a concrete example
└── NO  → proceed to safety check

Does this introduce a security vulnerability?
├── YES → [BLOCKING], name the vulnerability class (XSS, injection, etc.)
└── NO  → proceed to reliability check

Could this fail in production under realistic conditions?
├── YES → [BLOCKING] if likely, [SUGGESTION] if edge case
└── NO  → is it maintainability or style?
    ├── Maintainability → [SUGGESTION] with reasoning
    └── Style → [NIT], or automate it and stop commenting on it
```

---

## Anti-Patterns

- Blocking on style issues while missing correctness bugs — wrong priority order
- "This is wrong" with no explanation of what's right or why
- Approving code you don't understand to avoid looking ignorant
- Commenting on every line — creates noise, buries real issues
- "Why didn't you use X?" when X would be equally valid — preference isn't a review finding
- Leaving a review open for more than 24 hours on a PR that blocks others
- Rewrites in comments — if you'd write it completely differently, discuss in person first

---

## Example in Action

Full annotated review of a React component with 8 issues:

```tsx
// ORIGINAL CODE (submitted for review)
export function UserProfile({ userId }) {
  const [user, setUser] = useState();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));

    fetch(`/api/users/${userId}/posts`)
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

  const handleDelete = async (postId) => {
    await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const filtered = posts.filter(p => p.id != postId);
    setPosts(filtered);
  };

  return (
    <div>
      <h1>{user.name}</h1>
      <p dangerouslySetInnerHTML={{ __html: user.bio }} />
      {posts.map(post => (
        <div key={post.id}>
          {post.title}
          <button onClick={() => handleDelete(post.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

**Review Comments:**

**[BLOCKING] Issue 1 — Crash on render:**
`user` starts as `undefined`. `user.name` on line 20 throws immediately before data loads. Add a loading/null guard: `if (!user) return <Skeleton />`.

**[BLOCKING] Issue 2 — XSS vulnerability:**
`dangerouslySetInnerHTML` with raw API data is a direct XSS attack vector. If the API or database is ever compromised, any user bio can inject arbitrary scripts. Use a sanitizer (DOMPurify) or render as plain text — never raw HTML from user input.

**[BLOCKING] Issue 3 — Type coercion bug:**
`p.id != postId` uses loose inequality. If `id` is a number and `postId` is a string, this fails silently. Use `p.id !== Number(postId)` or ensure consistent types.

**[BLOCKING] Issue 4 — Race condition / missing cleanup:**
Two concurrent fetches share no coordination. If `userId` changes before both resolve, stale data updates state on the unmounted component. Add an AbortController and cleanup in useEffect return.

**[BLOCKING] Issue 5 — Missing error handling:**
No `.catch()` on either fetch. Network failure silently leaves the component in a broken state with no user feedback. Add error state and display it.

**[SUGGESTION] Issue 6 — Missing userId in dependency array:**
The effect depends on `userId` but the dep array is `[]`. If the parent re-renders with a different `userId`, the profile won't refresh. Add `userId` to the array.

**[SUGGESTION] Issue 7 — Optimistic UI without rollback:**
`handleDelete` updates local state before confirming server success. If the DELETE request fails, the item disappears from the UI permanently until a full refresh. Either await confirmation before updating, or implement rollback on error.

**[NIT] Issue 8 — Props should be typed:**
Add `interface UserProfileProps { userId: string }` — TypeScript will catch callers passing incorrect types before runtime.
