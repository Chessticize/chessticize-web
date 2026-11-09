# Privacy Policy – TODOs and Improvements

Use this checklist to bring `app/privacy/page.tsx` to production quality.

## Content accuracy and completeness
- [ ] Replace placeholder mailing address under Contact with your real legal address.
- [ ] Confirm contact emails exist and are monitored: `privacy@chessticize.com`, `support@chessticize.com`, `dpo@chessticize.com`.
- [ ] Add a Data Processing Addendum (DPA) reference if you process EU personal data as a processor.
- [ ] Clarify roles: are you Controller or Processor for each data category (esp. connected chess platforms, analytics)?
- [ ] Add lawful bases mapping table (EEA) for each data type/purpose.
- [ ] Specify analytics/provider names if used (e.g., Plausible, PostHog, GA) and link their policies.
- [ ] Expand cookie section with categories, lifetimes, and opt‑out instructions (or link a Cookie Policy).
- [ ] Describe retention logic for backups and logs; define deletion SLA and scope (primary vs. backups).
- [ ] Add children’s age thresholds for non‑US regions (e.g., 16 in some EU countries) or reference regional differences.
- [ ] Add international transfer mechanisms actually used (e.g., SCCs module, UK IDTA addendum).
- [ ] Add user request workflow: authentication, response timelines, and appeal process where applicable.

## Data subject rights
- [ ] Add regional rights variants (CCPA/CPRA for California, GDPR, UK GDPR) and how to exercise each.
- [ ] Provide opt‑out of “sale/share” (CPRA) if any cross‑context behavioral advertising is used; otherwise, explicitly state “no sale or sharing.”

## Security details
- [ ] Replace generic security bullets with concrete controls in use (e.g., TLS 1.2+, at‑rest encryption, least privilege, audit logging, regular pentests, vulnerability management cadence).
- [ ] Add incident response commitment and user notification expectations.

## Third‑party services
- [ ] List actual subprocessors (hosting, email, analytics) and maintain a change log or link to a live list.
- [ ] Clarify that Chess.com/Lichess data access occurs only after explicit user consent and can be revoked.

## UX and implementation
- [ ] Ensure TOC anchors match section IDs; verify keyboard accessibility.
- [ ] Keep `effectiveDate` and static `lastUpdated` fields in sync with ToS.
- [ ] Add a brief non‑binding summary at the top for readability.

## Records and compliance
- [ ] Maintain version history and archive of prior policies.
- [ ] Document internal records of processing activities (RoPA) if required.
- [ ] Add supervisory authority contact info for EU users (optional but helpful).