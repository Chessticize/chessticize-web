# Terms of Service – TODOs and Improvements

Use this checklist to bring `app/terms/page.tsx` to production quality. Tick items as they are completed and keep commit links next to each.

## Completed
- [x] Remove duplicated sections (Acceptable Use, Prohibited Activities, Intellectual Property, Privacy, Termination)
- [x] Mark page as a Client Component to allow `onClick` in the TOC

## Legal structure and choices
- [ ] Replace placeholders with real company/legal entity name and contact info (email, registered address)
- [ ] Choose governing law and venue (e.g., State/Province, Country) and update the section text accordingly
- [ ] If using arbitration: specify administrator (AAA/JAMS), rules, location/remote, costs/fees, small‑claims carve‑out, class‑action waiver, 30‑day opt‑out, survival
- [ ] If not using arbitration: specify exclusive courts/venue and jurisdiction clearly

## User content and IP
- [ ] Add “User Content” section: users retain ownership; grant to Chessticize a worldwide, non‑exclusive, royalty‑free license to host, store, display, adapt solely to provide the Service
- [ ] Add prohibited content examples and enforcement actions
- [ ] Add copyright/DMCA takedown process and agent contact

## Payments and subscriptions (if/when monetized)
- [ ] Add subscription terms: billing cycle, auto‑renewal, proration, cancellation, refunds, trials, promotional pricing
- [ ] Taxes and price changes: advance notice and effective date language

## Privacy, data, and retention
- [ ] Cross‑link specific Privacy Policy sections relevant to ToS obligations
- [ ] Add data retention and deletion commitments (e.g., deletion SLA, backup retention windows)
- [ ] Add account deletion process reference and how to request export/deletion

## Third‑party services and links
- [ ] Add explicit disclaimer for Chess.com, Lichess, Google, etc.; not responsible for third‑party services
- [ ] Clarify that connecting external accounts is optional and subject to third‑party terms

## Availability, support, and beta
- [ ] Add Early Access/Beta disclaimer (features may change; potential instability; data loss caveat)
- [ ] Service availability: uptime not guaranteed; maintenance windows; change/deprecation notice policy
- [ ] Support: scope and response-time disclaimer (or link to support policy)

## Security and acceptable use
- [ ] Expand Acceptable Use to include anti‑scraping, rate‑limit abuse, credential sharing, and anti‑cheating/engine assistance
- [ ] Add responsible disclosure channel; prohibit security testing of production without permission

## Compliance
- [ ] Export controls and sanctions compliance representation by users
- [ ] Children’s use: minimum age; parental consent where required; do not allow under‑13 accounts
- [ ] Communications consent: transactional emails allowed; marketing emails opt‑out process

## Feedback and licensing
- [ ] Add “Feedback” clause granting a perpetual, royalty‑free license to use suggestions without obligation

## Boilerplate
- [ ] Add standard clauses: Severability, Assignment, No Waiver, Entire Agreement, Force Majeure, Headings (non‑substantive)
- [ ] Add “Survival” to note which sections survive termination

## Versioning and records
- [ ] Maintain `effectiveDate` and `lastUpdated` fields; update when publishing changes
- [ ] Add change‑log link or archive of prior versions (optional)
- [ ] Store user acceptance timestamp and ToS version at registration/login (backend + UI checkbox)

## UX and accessibility
- [ ] Keep the Table of Contents in sync with section anchors after edits
- [ ] Add a brief, non‑binding plain‑language summary at the top for readability
- [ ] Ensure mobile readability and keyboard navigation for TOC links

## Implementation notes
- File: `app/terms/page.tsx`
- Ensure unique `id` attributes for all sections
- When adding new sections, also update the TOC array at the top of the file