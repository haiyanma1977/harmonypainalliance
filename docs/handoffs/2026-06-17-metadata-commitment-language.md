# Handoff — residual "commitment / training" language in metadata

**Date:** 2026-06-17
**Status:** ✅ RESOLVED — fixed, committed, and pushed (2026-06-17). Platform value confirmed = connecting patients with the right clinics & practitioners.
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

### 2. Organization JSON-LD `description` (the `"@type": "Organization"` block, line 57, identical English string in all three files)
- "A platform connecting North American patients with acupuncture clinics **committed to advanced training in next-generation needling**..."

### 3. Service JSON-LD — Stroke & Neurological Rehabilitation entry `description` (line 281, identical English string in all three files)
- "Acupuncture protocols for stroke recovery, neurological injury... Practitioners across the HPA network **maintain ongoing advanced training at leading clinical centers in China**."
- Added 2026-06-17 (second pass). This is the *only* one of the 4 MedicalProcedure entries in that block with the training-in-China line; the other three (Advanced Pain Management L295, Sleep & Emotional Health L309, Women's Pelvic Floor L322) are clean.

## Why it matters
- Not visible body copy, but it's machine-readable and used in social-share previews + structured data.
- Conflicts with §3.3: it asserts a clinic-level "commitment" HPA can't actually verify — the same reason the visible `#standards` block was removed.
- The ZH twitter card is the sharpest case ("承诺持续在中国进修").

## Recommended fix (if approved)
Rewrite all three fields (twitter:description L44, Organization JSON-LD L57, Service
JSON-LD neuro entry L281), trilingual + in-language, to trust-oriented framing consistent
with the meta/og descriptions already shipped, e.g.:
- twitter:description → mirror the cleaned `meta description` (vetted network of trusted clinics; focus areas; Winter Garden, FL).
- Organization JSON-LD description → "A platform connecting North American patients with a vetted network of trusted acupuncture clinics — focused on stroke recovery, neurological rehabilitation, advanced pain, sleep & emotional health, and women's pelvic floor recovery. Bringing China's advanced acupuncture systems to North America."

Then: validate JSON-LD with `json.loads`, hand files to Haiyan (no git from Cowork),
push via GitHub Desktop, purge Cloudflare cache, verify live.

For L281 specifically: the "maintain ongoing advanced training at leading clinical
centers in China" sentence is the unverifiable-commitment part — drop that sentence,
keep the clinical-condition description.

## Decision — RESOLVED
- [x] **Fixed all three** (twitter:description L44 + Organization JSON-LD L57 + Service JSON-LD neuro L281), trilingual. Committed + pushed 2026-06-17.
- [ ] ~~Leave as-is for now.~~

### Implemented wording

**twitter:description (L44, each file in its own language):**
- en → "Harmony Pain Alliance connects North American patients with trusted acupuncture and traditional Chinese medicine clinics — helping you find the right practitioner for stroke recovery, neurological rehabilitation, complex pain, and more."
- es → "Harmony Pain Alliance conecta a pacientes norteamericanos con clínicas de acupuntura y medicina tradicional china de confianza — ayudándole a encontrar el profesional adecuado para recuperación post-ACV, rehabilitación neurológica, dolor complejo y más."
- zh → "和衡疼痛联盟帮助北美患者匹配到值得信赖的针灸与中医诊所 —— 为中风康复、神经康复、复杂疼痛等方向找到合适的医生。"

**Organization JSON-LD description (L57, identical English in all three files):**
- → "Harmony Pain Alliance is a platform that connects North American patients with trusted acupuncture and traditional Chinese medicine clinics, helping patients find the right practitioner for their condition. Bringing acupuncture systems rooted in Chinese medicine to North America."

**Service JSON-LD neuro description (L281, identical English in all three files):**
- → "Acupuncture protocols for stroke recovery, neurological injury, and other conditions where conventional rehabilitation has plateaued." (second sentence dropped; serviceType/procedureType/indication/condition list untouched)

### Verification
- `json.loads` passed: 8/8 JSON-LD blocks valid in each of en/es/zh, 0 errors.
- Residual grep clean: no "committed to advanced training / 承诺持续 / comprometidas con formación avanzada / maintain ongoing advanced training" in any site file.
- Local SEO preserved: Lei's full NAP (`209 E Bay St, Winter Garden, FL 34787`) + GeoCoordinates remain in the `MedicalBusiness` JSON-LD (en/es/zh L123), plus Organization address (L84–88) and head geo meta tags — so dropping "Winter Garden, FL" from twitter:description costs no local-SEO signal.
- Files changed: `en/index.html` · `es/index.html` · `zh/index.html`.

## Out of scope / intentionally NOT flagged (true statements, keep)
- Lei Dong's own "ongoing advanced training in China" (visible bio + credential item) — true personal fact, backed by his AP license.
- FAQ "Founding Partner Clinic… access to advanced training and technology resources" — describes what HPA offers clinics, not a clinic-to-patient promise.
- "HPA's commitment to every technology partner" (tech-partnership block) — B2B partner language, not clinic standards.
- Form "我们承诺在5个工作日内回复" — response-time promise, unrelated.
