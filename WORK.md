# Current work

Updated: 2026-09-11
Complete: the owner added Postmark's DKIM TXT and Return-Path CNAME manually.
Authoritative DNS and independent public resolvers return the intended records;
the DKIM value matches the supplied payload byte-for-byte (hash below), and the
CNAME points directly to pm.mtasv.net. Owner reports Auto TTL and DNS-only CNAME.
No agent DNS writes occurred. Postmark dashboard verification status is not visible.

Return to `../stillcraft/WORK.md`: the user requests a direct Titus/Neon connection
and is creating the Stillcraft project. Recommend Free for family testing.

## Completed DNS task — connection history

Prepared exact records in ignored
`../stillcraft/.local/secrets/cloudflare/postmark-dns.json` (mode 0600):
- TXT `20260912023849pm._domainkey.kmproto.com`, exact owner-supplied public DKIM
  value, SHA-256 `bf1cc42b02b563314579199ba7c2c02f099e900894eca1cbfb48bb64faa9afc0`.
- CNAME `pm-bounces.kmproto.com` → `pm.mtasv.net`, DNS-only, automatic TTL.

Authoritative DNS returns NXDOMAIN for both names. Existing Wrangler OAuth lacks
general DNS read/edit permissions: record-list API calls return HTTP 403/code
10000. No record writes attempted. The existing email/Workers login is preserved.
Cloudflare's documented `cf` CLI 0.10.0 was prepared in Stillcraft's ignored npm
cache. Its DNS scope catalog supports dns_records:read/edit, but its device-grant
request returned invalid_grant before issuing a code. Do not repeat that grant.
Use the cf browser OAuth flow with only DNS read/edit and account/user/zone reads;
on this remote host, owner must relay the one-time localhost callback URL if the
browser cannot reach the listener. Keep callback URLs and credentials out of notes.

Recovery: the first cf callback listener timed out (the installed authentication
library uses a fixed 120-second wait). The owner's supplied callback arrived after
the process exited; do not retry that code, whose PKCE verifier was process-local.
Prepare a fresh standard PKCE authorization using the same registered cf client,
redirect URI and limited scopes, with verifier/state saved mode 0600 in ignored
`../stillcraft/.local/secrets/cloudflare/pending-dns-oauth.json`. This removes the
local listener timeout; Cloudflare's code expiry and authorization still apply.
On receipt, validate exact callback origin/path, state and local freshness, then
exchange the code directly at Cloudflare's official token endpoint using the
saved verifier/client/redirect. Save the returned credentials in cf's existing
native config location, `cloudflare/config/default.json` under the private XDG
root. Remove pending state after success. Do not print tokens or save callback URLs.
No DNS mutation, paid request or new access grant has occurred in this recovery.

The final saved callback exchange returned HTTP 403 and no credential. Since the
owner completed the records, this extra DNS login is no longer needed: pending
one-time state was removed, and no further authorization is requested. The original
Wrangler email/Workers connection remains available. Do not resume/retry the old
DNS grants or recreate records. This was a provider auth limitation, not an
automatic approval-review rejection. Actual DNS verification passes.

## Domain forwarding — configured

Outcome: configured `kyle@kmproto.com` to forward to the owner's verified Gmail,
providing a domain address for Stillcraft's Postmark setup. No setup spend.

Completed 2026-09-12 02:29 UTC (2026-09-11 local). The owner approved Wrangler
device authorization; its machine connection and private storage are checkpointed
in `../stillcraft/WORK.md`. Authenticated API reads confirm the active kmproto.com
zone. The account's email exactly matches the requested Gmail address and that
destination was already verified on 2026-03-16, resolving the omitted domain suffix.
Keep the private destination and OAuth credentials out of tracked notes.

Before activation, authoritative DNS had no apex MX/TXT records and Cloudflare
reported Email Routing unconfigured. Enabled routing using POST
`/zones/{zone_id}/email/routing/dns`, then created one exact-address forwarding rule:
`dcc5c2f2aaa9421b9c86f969175907d0`. Readback confirms enabled=true, status=ready,
synced=true and the exact intended alias/destination. Existing disabled catch-all
drop rule `fc4769a3df1840d48e02b25f51b657bc` is unchanged. Do not recreate the rule.

Cloudflare's authoritative nameserver now serves all three routing MX records,
SPF and DKIM; both 1.1.1.1 and 8.8.8.8 return the same MX targets/priorities.
No website records, hosting deployments, subscriptions or outbound email service
were changed. Routing is configured and verified; actual inbox delivery has not
been observed. The owner can use Postmark's verification email or a message from a
different email account for that check. No test message was sent by the agent.

Next: confirm receipt in Gmail, then return to `../stillcraft/WORK.md` for Postmark's
Stillcraft Server/sender authentication and the invited-family hosted AI alpha.
This connection is for receiving/forwarding; application sending remains separate.

Sources checked 2026-09-11:
- [Cloudflare routing setup](https://developers.cloudflare.com/email-service/get-started/route-emails/)
- [Cloudflare free forwarding](https://developers.cloudflare.com/dns/manage-dns-records/how-to/email-records/)
- [Postmark Servers FAQ](https://postmarkapp.com/support/article/1137-servers-faq): a
  separate Server per project can reuse the owner's existing Postmark account.

No application code changed; repository diff and Berean content checks pass for
the handoff documentation. The authenticated configuration readback and public DNS
queries above qualify the actual external change.

## Stillcraft hub listing — completed 2026-09-08/09

Outcome: list Stillcraft’s usable early photo-editor preview on the public KM Proto
hub, under the user’s standing “Publish at will” authority for this app and listing.

Current follow-up: Stillcraft is now on Vercel at **https://stillcraft.kmproto.com**.
The user added its DNS record; Google and Cloudflare public resolvers agree on the
Vercel CNAME. HTTPS and the full desktop/phone-layout app workflow pass using that
public IP with certificate verification enabled; the development host's resolver
still has the earlier NXDOMAIN cached. Only Stillcraft's card destination changes.
The other five cards and derived count remain intact.

The temporary Vercel alias release `88ff3ed` deployed successfully (`6341829079`)
and its six-card listing was observed live, but the alias subsequently returned 404
during the custom-domain transition. The final link below replaces it. The app's
export-preview correction is published as `c8a2d6a`; exact app checks and deployment
IDs remain in `../stillcraft/WORK.md`. Hub production build, lint, TypeScript and
diff checks pass. Main release `106f2e25b1932af64114dcd8ff2c66a2252a0384`
deployed successfully through Vercel production `6341925335` at 2026-09-09 03:32:23 UTC.
The public hub shows six cards, retains the exact Verseform link and 06 count, and
its Stillcraft card opens the custom-domain editor with its photo picker enabled.
No page errors occurred. This check used the publicly resolved Stillcraft IP because
the host's ordinary resolver still returned NXDOMAIN; HTTPS verification stayed on.
The ignored live-check script initially sampled readiness before the worker had
started; waiting for the existing enabled picker condition completed the check.

Outcome complete: custom-domain link published and public hub-to-editor journey
verified. No further hub work is needed for this slice. The following commit records
only this release evidence; the built application remains identical.

## Earlier hub listing — historical evidence

Implemented on `codex/stillcraft-preview`: Stillcraft is the first of six cards, with
an original composition illustration and plain early-preview copy. It links to the
verified public app at `https://stillcraft.kyleaddison98.chatgpt.site` while
`stillcraft.kmproto.com` awaits Cloudflare DNS. The count derives from the collection.
A fetch found the newer Verseform work on remote main (`ca59638`); it was merged and
preserved, including its position before Shep Study and Milk Yeller. The only conflict
was the old fixed project count, resolved to the derived count. No reset or force-push.

Checks: Vercel production build, lint, TypeScript and diff checks pass. The card was
checked at 1440/390/320px for exact destinations, count, horizontal overflow, page
errors and automated WCAG A/AA checks. All three widths pass with six cards after merging
Verseform; zero overflow, page errors or automated accessibility violations. Final
screenshots were visually inspected. Live publication verification follows.

An existing ignored `outputs/verify-page.cjs` made repository lint fail on its CommonJS
imports. Added `outputs/**` to ESLint’s generated-output ignores; tracked app code is
still checked. Added generated `*.tsbuildinfo` to Git ignores. No runtime dependency
or deployment workflow changed. Local checks use the prepared Stillcraft Node/browser
toolchain; preview must use `--config vite.vercel.config.ts` to match the public build.
The default Vinext/Cloudflare preview requires a different build and is not this target.

Publication complete: `a415afaa52d842758e193e630ef7afe43653a5a2` was pushed to the
review branch and fast-forwarded to main. The existing Vercel Git integration’s
production deployment `6337854724` reports success. Live
`https://www.kmproto.com` verification found six cards, the exact Verseform destination,
the derived 06 count, and a Stillcraft card that opens the usable public editor with
no page errors. The source implementation is `02365ec` plus merge `c97afc5`, preserving
remote Verseform work through `ca59638`. The final follow-up only records this result.
The old GitHub Actions deploy workflow remains redundant and unconfigured; it is
not the active production path.

The `.openai/hosting.json` Sites project
`appgprj_6a8b5731a4c48191901cb5e31a749036` was inspected with Sites. It is an older
owner-private publication at `kmproto-hub.kyleaddison98.chatgpt.site`, with no custom
domains. Its audience and deployed version were not changed. This task does not
migrate the public hub between hosts.

App-side deployment IDs and exact DNS records live in
`../stillcraft/docs/HOSTING.md`; the owning app checkpoint is `../stillcraft/WORK.md`.
No app photo uploads or paid inference are involved.
