# Spec: Multitenant Foundation

**Status:** Accepted — all decisions settled
**Date:** 2026-07-23
**Scope:** Phase 1 of `docs/agentic/backend-foundation-prompt.md`
**Blocks:** Phases 2–8 of that prompt

This spec records the decisions that must be settled before any schema is written. It decides nothing about the conditional-logic runtime or the public renderer — those belong to a later prompt.

Every recommendation below is now backed by evidence from the reference implementation's PRD and design docs rather than by inference. Sources are cited inline.

---

## Context

SurveyFlow is a TanStack Start rewrite of `/Users/eric/Developer/survey-application`, a shipped MERN survey platform. The survey domain is already solved there and is being ported. Tenancy is the one area where SurveyFlow deliberately diverges.

Current SurveyFlow state: UI-only. No server functions, no `src/server/`, no database, no auth. All pages render mock data from `src/constants/*.ts`.

**Key evidence:** the reference PRD (`docs/Product Requireme.md`) is a 3-day MVP scoping document. Several of its "out of scope" items were built anyway — notably the conditional-logic engine. Treat the PRD as *intent*, and the code as *truth*, where they disagree.

**SurveyFlow is a new, cleaner application, not a transcription.** The reference is evidence of what the domain requires, gathered the expensive way — adopt its hard-won lessons, but not its accretion (see Decision 7). Divergence from the reference is allowed and often correct; *silent* divergence is not.

---

## Decision 1 — Multi-workspace membership

**Decided (confirmed by product owner): implement `Membership`.**

Evidence that the reference's single-workspace model was a deliberate MVP cut, not a design position:

> **KISS:** "Single workspace per company (no multi-org in MVP)"
> **Out of Scope for MVP:** "Multi-tenant architecture"
> — reference PRD §2

Multi-tenancy was always the intended destination; it was deferred for a 3-day build. Building it now is a continuation of the original plan, not a deviation from it.

### Schema

```
Membership {
  userId     ObjectId → User      (required, indexed)
  companyId  ObjectId → Company   (required, indexed)
  role       enum                 (required — see Decision 2)
  invitedBy  ObjectId → User
  createdAt / updatedAt
}
unique index: (userId, companyId)
```

`User` loses `companyId` and `role`. `type.d.ts` updates accordingly.

### Cost accepted

- Every tenant-scoped read gains a membership verification step.
- Invitation, role-change, last-owner, and privilege-escalation surface must be built — none exists in the reference.
- `User` becomes non-tenant-owned, which the isolation boundary (Phase 3) must special-case.

### Migration note

If reference data is imported, each `User.companyId` becomes one `Membership` with `role: owner` — a mechanical, one-way migration. Deferring `Membership` and retrofitting later would instead require rewriting every query's scoping assumption. That asymmetry is why we pay now.

---

## Decision 2 — Role vocabulary and permissions

Three conflicting vocabularies exist:

| Source | Values |
|---|---|
| Reference app (shipped) | `admin \| viewer` |
| `type.d.ts` | `owner \| admin \| member` |
| Mock UI | `Owner \| Admin \| Analyst` |

**Recommendation: `owner | admin | editor | viewer`.**

The reference's two roles are correct for single-workspace ownership but have nobody who can delete or transfer a shared workspace. `type.d.ts`'s `member` conflates two different people: someone who *builds* surveys and someone who only *reads results*. The mock UI's "Analyst" is plainly the read-only case, and read-only access to a client workspace is precisely the scenario multi-workspace exists to serve.

The UI label "Analyst" maps to stored value `viewer`.

### Permission matrix

| Capability | owner | admin | editor | viewer |
|---|:--:|:--:|:--:|:--:|
| Create / edit surveys | ✅ | ✅ | ✅ | ❌ |
| Publish survey | ✅ | ✅ | ✅ | ❌ |
| Delete survey | ✅ | ✅ | ✅ | ❌ |
| View responses | ✅ | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ✅ | ✅ |
| Manage recipients | ✅ | ✅ | ✅ | ❌ |
| Invite users | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Promote to owner / transfer | ✅ | ❌ | ❌ | ❌ |
| Edit workspace branding | ✅ | ✅ | ❌ | ❌ |
| Read audit logs | ✅ | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |

### Invariants

- A workspace always has **at least one owner**. The last owner cannot be demoted or removed.
- No member may change **their own** role.
- An `admin` cannot create another `owner` — only an existing owner can.

**Decided:** `editor` **can** delete surveys. An editor who can create and publish but not remove their own work creates busywork for admins. The audit log records deletions, and soft-delete (Decision 7) makes them recoverable — that is the safety net, not a permission wall.

`editor` still cannot invite users, change roles, edit workspace branding, or read audit logs. The line is drawn at *workspace* administration, not *survey* lifecycle.

---

## Decision 3 — Authentication provider

**Recommendation: self-hosted JWT, ported from the reference.**

Evidence:

> **KISS:** "One authentication method (email + password with JWT)"
> — reference PRD §2

### The decisive technical argument

Phase 3 enforces tenant isolation by filtering Mongo queries on `companyId`. That check must consult data Mongo owns and can trust.

With Clerk Organizations, membership lives in Clerk and must be mirrored into Mongo by webhook — placing an **eventually-consistent projection underneath a security boundary**. A missed, delayed, or out-of-order webhook becomes cross-tenant exposure. That is the wrong place to accept eventual consistency.

### Supporting reasons

1. **Most of it is already written.** The reference ships bcrypt + JWT with `passwordHash` (`select: false`) plus reset and email-verification token fields. This is a port, not a build.
2. `.env.example` already commits to it (`JWT_SECRET`, `JWT_EXPIRES_IN`, `AUTH_COOKIE_NAME`).
3. No vendor constraint on the role model — Decision 2 defines four roles with a custom matrix; Clerk's default org roles are `admin`/`member`, with custom roles gated behind paid tiers.

### What we accept

Building and maintaining session revocation, email verification, password reset, invitation tokens, and eventually MFA. The reference covers the first three.

### Requirements

- Session cookie: `httpOnly`, `Secure`, `SameSite=Lax`, signed. Never `localStorage` (`.codex/rules/auth-ui.md`).
- The session establishes **who the user is**, never **which workspace they are in** — that comes from the URL slug plus a membership check (Phase 2).
- Membership is checked **per request against Mongo**, never baked into the JWT, so revocation takes effect on the next request rather than at token expiry.

---

## Decision 4 — Data sensitivity

**Recommendation: "regulated-ready, not yet regulated."**

The healthcare framing in SurveyFlow's mock data is **demo copy, not a target market**. The reference PRD is explicit:

> **HIPAA/PII Handling:** "Avoid collecting sensitive health data in MVP. If needed: Encrypt responses at rest. Use AES-256 encryption. Secure key management (AWS KMS, etc.)"
> **GDPR Considerations:** data minimization; right to access (export CSV); right to erasure (*future*); configurable data retention
> — reference PRD §9.4

So the original team deliberately steered away from health data while naming the escalation path. We inherit that stance.

**Do now (free, and irreversible if skipped):**
- Keep response answer values **out of indexes**, so field-level encryption stays possible later without an index rebuild.
- Never write answer values into `AuditLog` payloads — log the event and identifiers only.
- Keep `Response.respondentIdentifier` **hashed**, as the reference already does.
- Treat anonymity as a schema property, not a flag: an anonymous survey's `Response` must have **no** `recipientId`, not an ignored one. A boolean cannot be retrofitted onto rows that already stored the foreign key.

**Explicitly deferred** (record in `AGENTS.md` §21): AES-256 encryption at rest for answers, right-to-erasure workflow, configurable retention policy, per-response access logging, BAA and data residency.

**Escalate** if a real health customer appears — the deferred list stops being optional.

---

## Decision 5 — Recipient addressing

**Corrected from the previous draft.** The reference's whitelist model was **deliberate and specced**, not expedient — `docs/WHITELIST_WORKFLOW.md` documents it as an access-control feature with a `validateAccess(survey, identifier)` routine, and it has dedicated testing and verification docs. My earlier recommendation to replace it was wrong.

**The error was conflating two orthogonal concerns:**

| Concern | Question it answers | Reference mechanism |
|---|---|---|
| **Authorization** | May this person answer? | `isWhitelistEnabled` + identifier match against `Recipient` |
| **Addressing / delivery** | How does this person reach the survey? | `Survey.publicId` + manual identifier entry |

The reference uses identity *as* authorization, which is coherent. But a token is not an alternative to a whitelist — it is an alternative *delivery mechanism*, and the two compose.

**Recommendation: keep whitelist authorization; add `Recipient.token` as the delivery mechanism for targeted sends.**

- A token resolves directly to one `Recipient`, satisfying the whitelist check implicitly — the respondent never re-enters PII, which also removes identifiers from the URL.
- Manual identifier entry stays as the **fallback** when a link is lost or forwarded. This is why the reference's `validateAccess` logic must be ported, not discarded.
- Keep `Survey.publicId` for open surveys.

Cost: secure token generation, expiry policy, and a resend path. Twilio is already a dependency for SMS delivery.

---

## Decision 6 — Survey access modes

**Decided: two modes. Passcode is dropped.**

The reference has a boolean `isWhitelistEnabled` — two modes. SurveyFlow's mock UI declared three, adding `"Passcode"`, and there is **no passcode concept anywhere in the reference** (I grepped models and controllers). It was invented by the mock, not by a requirement.

Dropping it is the right call. A passcode is a **shared secret**: one leak opens the survey to everyone, it cannot attribute responses, and it would have sat awkwardly beside per-recipient tokens (Decision 5), which are strictly better for every targeted case. It added a third security model to maintain for no capability the other two lack.

```
access: "open" | "whitelist"    (default "open")
```

**Keeping an enum rather than reverting to the reference's boolean**, for three reasons: it reads better at call sites than a negated boolean, the UI already renders a per-mode label so it maps directly, and if a third mode ever returns it is an additive change rather than a schema migration. Migrating reference data stays trivial: `false → "open"`, `true → "whitelist"`.

### UI touchpoints that must drop `"Passcode"`

These are mock-data changes, executed in Phase 4 alongside the `SurveyStatus` reconciliation:

| File | Line | Change |
|---|---|---|
| `src/constants/surveys.ts` | 12 | `SurveyAccess` union drops `"Passcode"` |
| `src/constants/surveys.ts` | 88 | mock row using `access: "Passcode"` moves to another mode |
| `src/constants/surveys.ts` | 153 | filter option removed |
| `src/features/surveys/surveys-table.tsx` | 52 | `accessIcon` map entry removed |

The union values are display labels (`"Open Link"`, `"Whitelist Only"`); the stored values are `"open"` and `"whitelist"`. Keep the mapping in one place.

---

## Decision 7 — What we deliberately improve on

The reference was built in a 3-day sprint and grew organically. These are inherited-by-default problems that a clean rewrite should not carry.

| Artifact | Problem | Decision |
|---|---|---|
| `logic.visibleIf` (line 347) coexisting with `visibilityRules[]` (line 388) | **Two generations of conditional logic in one schema.** The per-question `visibleIf` is superseded by `visibilityRuleSchema`, which also targets sections, carries `show`/`hide`, and has `priority`. Nothing documents which wins on conflict | Port `visibilityRules[]` **only**. Drop `logic`/`visibleIf` |
| Branding split across `Company` and `Survey` | `logo` and `thankYouMessage` on both; `themeColor` (Survey) vs `primaryColor`/`secondaryColor` (Company); `defaultFont` only on Company. Inconsistent names, undocumented fallback | One vocabulary at both levels; explicit precedence — survey value overrides company default, null means inherit |
| `Response.answers` as `Map` of `Mixed` | No server-side validation possible; any value passes for any question type | Keep the `Map` (correct shape), but validate each answer against its question's `type` and `validation` on write |
| `navigationRule.when` as `Mixed` + custom validator | The validator is a workaround for an absent type | Typed condition schema; Zod at the boundary |
| Denormalized `recipientName/Phone/Email` on `Response` | Duplicated PII; makes right-to-erasure a multi-collection sweep — conflicts with Decision 4 | Justify per field or drop. If kept for search, document as an erasure target |
| `Survey.isUpdated` | UI concern in the schema; undocumented meaning | Derive from `currentVersion !== publishedVersion` |
| No soft delete anywhere in the reference | Deleting a survey destroys its versions and orphans its responses irrecoverably — unacceptable now that `editor` can delete (Decision 2) | Add `deletedAt` to `Survey` and `Recipient`. The Phase 3 isolation boundary must filter `deletedAt: null` by default, so deleted rows are invisible without an explicit opt-in. Responses are never hard-deleted by a survey deletion |

---

## Consequences

Approving this spec commits to:

- `/app/:workspaceSlug/*` routing — every `/app/*` route file moves and `src/constants/data.ts` becomes slug-aware.
- `requireWorkspace()` as the sole source of `companyId`, with a per-request membership check against Mongo.
- `User` losing `companyId` and `role`; `type.d.ts` changing.
- `SurveyStatus` collapsing to the reference's `draft | published | closed` across all three current definitions.
- Four roles rather than the mock UI's three.
- `Survey.access` as a two-value enum (`open | whitelist`) replacing `isWhitelistEnabled`; `"Passcode"` removed from the UI in four places.
- `Recipient.token` for targeted delivery, alongside the ported `validateAccess` whitelist fallback.
- Soft delete (`deletedAt`) on `Survey` and `Recipient`, filtered by default in the isolation boundary.

## Resolved questions

| Question | Answer | Source |
|---|---|---|
| Was single-workspace a design position? | No — an explicit 3-day MVP cut; multi-tenancy was always planned | PRD §2 |
| Was the whitelist considered or expedient? | **Considered and specced** — my replace-it recommendation was wrong and is corrected in Decision 5 | `WHITELIST_WORKFLOW.md` |
| Is healthcare the target market? | No — demo copy. PRD steers away from health data while naming the escalation path | PRD §9.4 |
| Is there a standing auth preference? | JWT — stated under KISS, and reinforced by the isolation-boundary argument | PRD §2 |

## Approver decisions

| Question | Decision | Recorded in |
|---|---|---|
| Is "Passcode" a real requirement? | **No — drop it. Two modes only.** | Decision 6 |
| Is `editor` unable to delete surveys too restrictive? | **Yes — editors may delete.** Soft delete plus audit log is the safety net | Decision 2, Decision 7 |

No open questions remain. This spec is ready to implement.
