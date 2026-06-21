# Handoff — residual "commitment / training" language in metadata

**Date:** 2026-06-17
**Status:** ⏳ Parked — awaiting Haiyan's decision (not yet changed)
**Owner:** Haiyan
**Related red-line:** site skill §3.2 (no promo) & §3.3 (don't state standards/commitments HPA can't verify)

## Context

On 2026-06-17 the HPA site had a full trilingual cleanup: removed all discount/promo
language, unified Lei Dong's credential to **AP**, and deleted the `#standards`
"three commitments every partner clinic holds to" section (HPA has no mechanism to
verify those commitments). All shipped, committed, and verified live on all 6 pages.

While verifying the live site, two pieces of **metadata** were found to still carry the
same kind of unverifiable "commitment / ongoing China training" framing that was
deleted from the visible `#standards` block. These were **not** in scope for the
cleanup rounds (we only touched `meta description` + `og:description`), so they were
left untouched pending a decision.

## The residual strings (all three languages)

### 1. Twitter card description (`<meta name="twitter:description">`)
- **en/index.html** — "...acupuncture clinics **committed to advanced training** in next-generation needling..."
- **es/index.html** — "...clínicas de acupuntura **comprometidas con formación avanzada** en punción de nueva generación..."
- **zh/index.html** — "连接北美患者与**承诺持续在中国进修**的精选针灸诊所..." (most explicit — literally "clinics that commit to ongoing training in China")

### 2. Organization JSON-LD `description` (the `"@type": "Organization"` block, ~line 57, identical English string in all three files)
- "A platform connecting North American patients with acupuncture clinics **committed to advanced training in next-generation needling**..."

## Why it matters
- Not visible body copy, but it's machine-readable and used in social-share previews + structured data.
- Conflicts with §3.3: it asserts a clinic-level "commitment" HPA can't actually verify — the same reason the visible `#standards` block was removed.
- The ZH twitter card is the sharpest case ("承诺持续在中国进修").

## Recommended fix (if approved)
Rewrite both fields, trilingual + in-language, to trust-oriented framing consistent
with the meta/og descriptions already shipped, e.g.:
- twitter:description → mirror the cleaned `meta description` (vetted network of trusted clinics; focus areas; Winter Garden, FL).
- Organization JSON-LD description → "A platform connecting North American patients with a vetted network of trusted acupuncture clinics — focused on stroke recovery, neurological rehabilitation, advanced pain, sleep & emotional health, and women's pelvic floor recovery. Bringing China's advanced acupuncture systems to North America."

Then: validate JSON-LD with `json.loads`, hand files to Haiyan (no git from Cowork),
push via GitHub Desktop, purge Cloudflare cache, verify live.

## Decision needed from Haiyan
- [ ] Fix both (twitter:description + Organization JSON-LD), trilingual — **or** —
- [ ] Leave as-is for now.
