# HPA — Lei 认证口径核查 + 统一 + 上轮收尾

**日期:** 2026-08-23
**仓库:** `~/Documents/Harmony-Painalliance-Comms/website`
**git:** 未运行任何写操作;仅 `git diff --stat` 只读查看;`.git/*.lock` 已确认为空
**结果:** 注册表**明确查到**,走"统一"分支 → 改动 **16 个文件**

---

## A. 官方注册表核查 — 查到了,证据确凿 ✅

### A-1. 目标记录(NCBAHM 官方 Find a Practitioner 明细页)

**URL:**
`https://directory.ncbahm.org/FAP/PractitionerDetail?AgencyClientId=v2.m8q3116MoLa81ugQv9sqXh28na9XANh9gz60TkXpt-snsQ==`

**页面原文(逐字):**

```
Lei Dong

Dipl. O.M. (NCCAOM)® | Male

NA
407-670-4620
www.leisacupuncture.com    Visit
209 E Bay Street 209 E Bay Street, Winter Garden, FL 34787, USA

OM Certification

Practitioner Locations
Location 1
209 E Bay Street 209 E Bay Street, Winter Garden, FL 34787, USA

Digital Badges Information
Dipl. Digital Badge For Ncbahm Certification In Acupuncture And Herbal Medicine

Education
Florida College of Integrative Medicine
Master's Degree program - Oriental Medicine
```

**身份可确认无疑:** 电话 407-670-4620、网址 www.leisacupuncture.com、地址 209 E Bay Street, Winter Garden, FL 34787 —— 三项与 HPA 诊所页现有 NAP 完全一致。学历 "Florida College of Integrative Medicine / Master's Degree program - Oriental Medicine" 也与站上"Master's, Florida College of Integrative Medicine"吻合。

### A-2. 搜索路径与中间证据

**入口:** `https://directory.ncbahm.org`(能打开,没换 nccaom 域名)
**方式:** 站内 **Search By Practitioner Name**(Last Name 页签**没有 State 字段**,只有 First/Last Name),Last Name = `Dong`
**结果页 URL:**
`https://directory.ncbahm.org/FAP/SearchResultWithoutMap?Radius=0&CountryCode=USA&SearchType=3&LastName=Dong&...`

**结果页原文(9 条,只摘目标条):**

```
9 Practitioners found for Last Name : Dong
...
Lei Dong
Certified Diplomate | Male
407-670-4620
www.leisacupuncture.com  Visit
209 E Bay Street 209 E Bay Street, Winter Garden, FL, USA
OM Certification
```

其余 8 位 Dong 的认证标签分别是 `AC Certification` / `CH Certification` / `OM Certification` / `AHM Certification` —— **说明这套目录里 AC / CH / OM / AHM 是并列的不同证书种类**,Lei 名下只挂了 **OM**,没有 AC、没有 AHM。

### A-3. 关于机构名 NCBAHM vs NCCAOM

**首页目录说明原文:**

> The NCBAHM Find a Practitioner Directory is a voluntary directory designed to be used by the public to assist individuals in finding an NCBAHM practitioner: **Dipl. Ac. NCBAHM™, Dipl. C.H. NCBAHM™, Dipl. O.M. NCBAHM™, or Dipl. ABT NCBAHM™.** Please note that since this directory is voluntary, not all certified Diplomates will be listed.

**About 页原文(`https://www.ncbahm.org/about-us/`):**

> **Established in 1982**, NCBAHM is the only national organization that validates entry-level competency in the practice of acupuncture and herbal medicine (AHM) through professional certification. NCBAHM certification … documents competency for licensure as an acupuncturist by 46 states plus the District of Columbia … All NCBAHM certification programs are currently accredited by the National Commission for Certification Agencies (NCCA).

你给的背景**成立**:1982 年成立、46 州 + DC 认可、NCCA 认证 —— 全是 NCCAOM 的原始履历,只是把缩写换成了 NCBAHM。**NCBAHM 就是 NCCAOM 改名后的同一家机构,两者不冲突。**

**但有一个关键细节:** 机构改了名,**证书标记本身在明细页仍然逐字印作 `Dipl. O.M. (NCCAOM)®`**(见 A-1 原文和截图)。也就是说:

| | 当前写法 |
|---|---|
| 机构名(组织实体) | National Certification Board for Acupuncture and Herbal Medicine (**NCBAHM**),ncbahm.org |
| Lei 的证书标记(注册商标形式) | **`Dipl. O.M. (NCCAOM)®`** |

**📌 我对你指令的一处偏离,请你复核:** 你写的格式模板是 `Dipl. AHM (NCBAHM)`,"机构名用新名"。我照做了**机构名**那半——JSON-LD 的 `recognizedBy` 全部改成 NCBAHM + ncbahm.org。但**证书标记我按注册表逐字用了 `(NCCAOM)`,没有写成 `Dipl. O.M. (NCBAHM)`**,理由:`Dipl. O.M. (NCBAHM)` 这个组合发证机构自己**任何地方都没有印过**,是我们造出来的;而站上刚清理掉的就是这类"看起来合理但没出处"的写法。如果你更想要形式统一,一句话我就全站换成 `Dipl. O.M. (NCBAHM)`,6 个文件 12 处,一分钟的事。

### A-4. 结论:三个口径,谁对谁错

| 出处 | 原来写的 | 对不对 |
|---|---|---|
| HPA **首页** JSON-LD ×3 | Diplomate of Oriental Medicine + NCCAOM | **证书种类对了**,机构名是旧名 |
| HPA **诊所页** ×3(可见 + JSON-LD) | Dipl. AHM (NCBAHM) | **❌ 证书种类错了** —— Lei 是 OM,不是 AHM |
| leisacupuncture.com | NCCAOM Dipl. Ac. | **❌ 证书种类错了** —— 是 O.M.,不是 Ac. |

也就是说你原来担心的"诊所页 vs leisacupuncture.com 谁对",答案是 **两个都不对**,反而是 HPA 首页那条最接近。你上一版关于"旁证指向 O.M./AHM"的判断方向是对的 —— 落到具体证书上是 **O.M.**。

**leisacupuncture.com 的 `NCCAOM Dipl. Ac.` 属另一仓库,本次未动**,但按注册表它同样是错的(Dipl. Ac. → Dipl. O.M.),建议下一轮在 leisacupuncture 仓库一并修。

**证据截图:** `/tmp/claude-chrome-screenshots-bd6Kdf/screenshot-1787447916053-0.jpg`(NCBAHM 明细页,含 `Dipl. O.M. (NCCAOM)®` 与 `OM Certification` 徽标)

---

## B. 认证口径统一 — 已改,12 处 + 6 处模板注释

统一后的标准写法:

- **证书全称/标记:** `Diplomate of Oriental Medicine — Dipl. O.M. (NCCAOM)`
- **可见简写:** `Dipl. O.M. (NCCAOM)`
- **发证机构:** `National Certification Board for Acupuncture and Herbal Medicine (NCBAHM)`,url `https://www.ncbahm.org/`

### B-1. 三个首页 JSON-LD(`{en,es,zh}/index.html` L233–239)

**before**
```json
"name": "Diplomate of Oriental Medicine",
"recognizedBy": {
  "@type": "Organization",
  "name": "National Certification Commission for Acupuncture and Oriental Medicine (NCCAOM)",
  "url": "https://www.nccaom.org/"
}
```
**after**
```json
"name": "Diplomate of Oriental Medicine — Dipl. O.M. (NCCAOM)",
"recognizedBy": {
  "@type": "Organization",
  "name": "National Certification Board for Acupuncture and Herbal Medicine (NCBAHM)",
  "url": "https://www.ncbahm.org/"
}
```

### B-2. 三个诊所页 JSON-LD(`{en,es,zh}/clinics/leis-acupuncture/index.html` L224)

- before: `"name": "Diplomate in Acupuncture & Herbal Medicine — Dipl. AHM (NCBAHM)"`
- after: `"name": "Diplomate of Oriental Medicine — Dipl. O.M. (NCCAOM)"`

(`recognizedBy` 本来就是 NCBAHM + ncbahm.org,未动)

### B-3. 三个诊所页可见行(L461)

| | before | after |
|---|---|---|
| EN | `Nationally Board-Certified · Dipl. AHM (NCBAHM)` | `Nationally Board-Certified · Dipl. O.M. (NCCAOM)` |
| ES | `Certificación nacional · Dipl. AHM (NCBAHM)` | `Certificación nacional · Dipl. O.M. (NCCAOM)` |
| ZH | `全国专业委员会认证 · Dipl. AHM (NCBAHM)` | `全国专业委员会认证 · Dipl. O.M. (NCCAOM)` |

### B-4. 三个诊所页的模板 spec 注释(L93 / L113 / L208 / L438–440)

这些注释会随页面发到浏览器,而且是下次改动时的"规则来源",留着旧写法迟早被照抄回去,所以一并更新:

| 行 | before | after |
|---|---|---|
| L93 | `(AP suffix only §3.1; Diplomate -> Dipl. AHM (NCBAHM))` | `(AP suffix only §3.1; Diplomate -> Dipl. O.M. (NCCAOM); verified in NCBAHM registry 2026-08-23)` |
| L113 | `⚠ ZH: do NOT translate "NCBAHM" — Chinese official name unresolved (locked).` | `⚠ ZH: do NOT translate "Dipl. O.M. (NCCAOM)" or "NCBAHM" — Chinese official names unresolved (locked).` |
| L208 | `… Diplomate = Dipl. AHM (NCBAHM). -->` | `… Diplomate = Dipl. O.M. (NCCAOM), issued by NCBAHM. -->` |
| L438–440 | `Diplomate = Dipl. AHM (NCBAHM); …` | `Diplomate = Dipl. O.M. (NCCAOM), issued by NCBAHM; …` |

### B-5. 校验

- **JSON-LD:** 全站 26 个 html 的所有 `application/ld+json` 块 `json.loads` → **0 失败**
- **旧写法残留 grep:** `Dipl. AHM` / `Dipl. Ac.` / `nccaom.org` / `National Certification Commission` → **全部 0 命中**
- `AP`(Florida Board of Acupuncture)那条 license 三处未受影响,写法不变

---

## C. 上轮追加的三件 — 全部完成

### C-1. 删除 `Wed off-site (FCIM)` HTML 注释 ✅

三个诊所页 L99:

- before: `hours ............ Mon,Tue,Thu,Fri 9:00–17:00 · Sat 10:00–17:00 · Sun 10:00–16:00 · Wed off-site (FCIM)`
- after: `hours ............ Mon,Tue,Thu,Fri 9:00–17:00 · Sat 10:00–17:00 · Sun 10:00–16:00 · Wed closed`

(没有整行删掉,是把 `Wed off-site (FCIM)` 换成 `Wed closed` —— 模板 spec 还需要一行完整营业时间,留个准确的比留个空的强。)

**残留 grep:** `Wed off-site` / `FCIM teaching` / `clínica docente FCIM` / `FCIM 教学诊所` → **全站 0 命中**。FCIM 现在只作为学历出现(Florida College of Integrative Medicine),那是事实,保留。

### C-2. 补 og:locale:alternate — **是 9 个页面,不是 8 个** ✅

我上一份报告写"8 个",复核后是 **9 个**(en 三个落地页 + join 三语 + tech-partnership 三语 = 3+3+3),我上次算错了,这里更正。

| 文件 | before | after |
|---|---|---|
| `en/stroke-recovery-acupuncture/` | `en_US`,0 alt | + `es_ES` `zh_CN` |
| `en/migraine-acupuncture/` | `en_US`,0 alt | + `es_ES` `zh_CN` |
| `en/facial-paralysis-acupuncture/` | `en_US`,0 alt | + `es_ES` `zh_CN` |
| `en/join/` | `en_US`,0 alt | + `es_ES` `zh_CN` |
| `es/join/` | `es_ES`,0 alt | + `en_US` `zh_CN` |
| `zh/join/` | `zh_CN`,0 alt | + `en_US` `es_ES` |
| `en/tech-partnership/` | `en_US`,0 alt | + `es_ES` `zh_CN` |
| `es/tech-partnership/` | `es_ES`,0 alt | + `en_US` `zh_CN` |
| `zh/tech-partnership/` | `zh_CN`,0 alt | + `en_US` `es_ES` |

**复核:24 个语言页面现在 100% 是 `locale=1 / alternate=2`,零缺口。** (privacy/terms 无语言版本,保持 0,同 hreflang 的处理一致。)

### C-3. sitemap.xml lastmod → 2026-08-23 ✅

按 skill 红线,**没有做全局查找替换**:脚本逐个解析 `<url>` 块,只在 `<loc>` 命中"今天确有改动"的 15 条时改 `<lastmod>`,并断言命中数 == 15 才写盘。改后 XML 解析通过。

| URL | before → after |
|---|---|
| `/en/` `/es/` `/zh/` | 2026-08-22 → **2026-08-23** |
| `/en/clinics/leis-acupuncture/` `/es/…` `/zh/…` | 2026-08-22 → **2026-08-23** |
| `/en/stroke-recovery-acupuncture/` | 2026-08-21 → **2026-08-23** |
| `/en/migraine-acupuncture/` | 2026-08-21 → **2026-08-23** |
| `/en/facial-paralysis-acupuncture/` | 2026-08-21 → **2026-08-23** |
| `/en/join/` `/es/join/` `/zh/join/` | 2026-08-21 → **2026-08-23** |
| `/en/tech-partnership/` `/es/…` `/zh/…` | 2026-08-21 → **2026-08-23** |

**未改(今天没动内容):** `/learn/` 三语、`/es//zh/` 的 stroke / migraine / facial 六页(这次只有 en 版加了 meta)、`/privacy`、`/terms` —— 全部保持原 lastmod。

---

## 改动文件清单(16 个文件,84 增 60 删)

```
 en/clinics/leis-acupuncture/index.html     | 22 ++++++++++---------- 认证 ×5 + Wed 注释
 es/clinics/leis-acupuncture/index.html     | 22 ++++++++++---------- 同上
 zh/clinics/leis-acupuncture/index.html     | 22 ++++++++++---------- 同上
 en/index.html                              | 10 +++++-----          认证 JSON-LD
 es/index.html                              | 10 +++++-----          认证 JSON-LD
 zh/index.html                              | 10 +++++-----          认证 JSON-LD
 en/stroke-recovery-acupuncture/index.html  |  2 ++                  og:locale:alternate
 en/migraine-acupuncture/index.html         |  2 ++                  og:locale:alternate
 en/facial-paralysis-acupuncture/index.html |  2 ++                  og:locale:alternate
 en/join/index.html                         |  2 ++                  og:locale:alternate
 es/join/index.html                         |  2 ++                  og:locale:alternate
 zh/join/index.html                         |  2 ++                  og:locale:alternate
 en/tech-partnership/index.html             |  2 ++                  og:locale:alternate
 es/tech-partnership/index.html             |  2 ++                  og:locale:alternate
 zh/tech-partnership/index.html             |  2 ++                  og:locale:alternate
 sitemap.xml                                | 30 +++++++++---------- lastmod ×15
```

**交回 Haiyan 在 GitHub Desktop 提交。** 部署后记得按 skill §2.2:如果推上去没触发 Cloudflare 新部署,补一个空 commit。

---

## 需要你确认的两件

1. **`Dipl. O.M. (NCCAOM)` vs `Dipl. O.M. (NCBAHM)`** —— 见 A-3。我按注册表逐字用了 `(NCCAOM)`,和你"机构名用新名"的格式模板有出入。要改成 `(NCBAHM)` 我一句话就换。
2. **leisacupuncture.com 的 `NCCAOM Dipl. Ac.`** —— 另一仓库,本次没动,但按注册表它也是错的(应为 `Dipl. O.M.`)。要不要开一轮把那边一起修。
