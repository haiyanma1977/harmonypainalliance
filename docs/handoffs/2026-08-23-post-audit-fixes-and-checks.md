# HPA 网站审查后 — 核查与修复报告

**日期:** 2026-08-23
**仓库:** `~/Documents/Harmony-Painalliance-Comms/website`(注:不在 `~/Documents/GitHub`)
**执行范围:** 只改文件,未运行任何写操作 git 命令(仅 `git status` / `git diff --stat` 只读查看);`.git/*.lock` 已确认为空
**交回:** Haiyan 在 GitHub Desktop 提交

---

## 一、改动文件清单(6 个文件,15 增 / 9 删)

| 文件 | 改动项 |
|---|---|
| `en/index.html` | FAQ 价格(可见 L656 + JSON-LD L355) |
| `es/index.html` | FAQ 价格(可见 L657 + JSON-LD L355) |
| `zh/index.html` | FAQ 价格(可见 L658 + JSON-LD L355) |
| `en/clinics/leis-acupuncture/index.html` | og:locale:alternate ×2 + 周三营业时间 |
| `es/clinics/leis-acupuncture/index.html` | og:locale:alternate ×2 + 周三营业时间 |
| `zh/clinics/leis-acupuncture/index.html` | og:locale:alternate ×2 + 周三营业时间 |

---

### 1. 首页 FAQ 价格声明(必改)✅

删掉了"网络价格区间"的平台口径表述,保留"因诊所和病症而异 + 请直接联系诊所确认"。可见文案与 FAQPage JSON-LD 两处同步改,**JSON-LD 全站 `json.loads` 校验通过,0 失败**。

**EN** — `en/index.html` L355(JSON-LD)+ L656(可见),文案完全一致

- before: `Treatment fees vary by clinic and condition. Across our network, fees generally range from $80 to $300 per session. We recommend contacting your chosen clinic directly for specific pricing.`
- after: `Treatment fees vary by clinic and condition. We recommend contacting your chosen clinic directly for specific pricing.`

**ES** — `es/index.html` L355 + L657

- before: `Las tarifas varían según la clínica, generalmente entre $80 y $300 por sesión.`
- after: `Las tarifas varían según la clínica y la afección. Le recomendamos contactar directamente con la clínica que elija para conocer sus tarifas.`

> ⚠️ 注意:ES 原句**只有价格区间,没有"联系诊所确认"这半句**——比 EN/ZH 少一句。这次一并补齐,现在三语口径一致。

**ZH** — `zh/index.html` L355 + L658

- before: `各诊所收费不同，我们网络内的诊所费用范围约为每次 $80–$300。建议直接联系您选择的诊所确认具体收费。`
- after: `治疗费用因诊所和病症而异。建议直接联系您选择的诊所确认具体收费。`

**残留检查:** 全仓库 grep `$80` / `$300` / `80–$300` → **0 命中**。

---

### 4. og:locale:alternate ✅

**首页 — 已经是好的,不用改。** `en/index.html` 现在 L397–398 已同时有 `es_ES` 和 `zh_CN`(在 `</head>` 之前,位置有效)。es/zh 首页也都齐全。审查报告里"en 只有 zh_CN"那条已经过时了。

**三个诊所页 — 已补(原来只有 `og:locale`,0 条 alternate):**

| 文件 | before(L158) | after(L158–160) |
|---|---|---|
| `en/clinics/leis-acupuncture/` | `en_US` | `en_US` + alt `es_ES` `zh_CN` |
| `es/clinics/leis-acupuncture/` | `es_ES` | `es_ES` + alt `en_US` `zh_CN` |
| `zh/clinics/leis-acupuncture/` | `zh_CN` | `zh_CN` + alt `en_US` `es_ES` |

**🔶 顺带发现(未改,等你定):** 还有 8 个页面缺 alternate,而且缺得不对称——

- `en/` 下的 4 个:`stroke-recovery-` / `migraine-` / `facial-paralysis-acupuncture/` 三个落地页 + `join/`,**都是 0 条 alternate**;而对应的 **es/ 和 zh/ 版本反而都有 2 条**。也就是英文版落后于西/中文版。
- `join/` 和 `tech-partnership/`:**三语全部 0 条**。

不在你这次给的范围里,我没动。要补的话是 8 个文件、纯 meta 行、零风险,你说一声我一次做完。

---

### 5. 诊所页周三营业时间 ✅

三语诊所页 L589(改前 L587),括号内容已删除:

| | before | after |
|---|---|---|
| EN | `Wed: closed at this location (practitioner at the FCIM teaching clinic)` | `Wed: Closed` |
| ES | `Mié: cerrado en esta ubicación (el profesional atiende en la clínica docente FCIM)` | `Mié: Cerrado` |
| ZH | `周三：本址不接诊（医师于 FCIM 教学诊所）` | `周三：休息` |

JSON-LD 的 `openingHoursSpecification` 本来就没写周三(不列 = 不营业),与可见文案一致,无需改。

**🔶 一个残留,我没动,请你定:** 三个诊所页的 **L99 是模板 spec 注释**,里面仍写着:

```
hours ............ Mon,Tue,Thu,Fri 9:00–17:00 · Sat 10:00–17:00 · Sun 10:00–16:00 · Wed off-site (FCIM)
```

HTML 注释是**会随页面发到浏览器的**(右键"查看源代码"能看到)。如果这次删括号的动机是"不对外说医师周三在哪",那这行注释等于把同样的信息留在了源码里。要不要一起清掉 / 改成 `Wed closed`,你说。

---

## 二、核查报告

### 2. hreflang — **全部合格,无需补** ✅

用脚本逐页比对了 `canonical` + 4 条 hreflang 的实际 URL 与该页应有的三语 URL:

**24 个语言页面(en/es/zh × 8)全部 OK** — 每页都有完整 `en` / `es` / `zh` + `x-default`(x-default 一律指向 EN 版),URL 全部正确指向自己的对应语言版本,无重复、无错指、canonical 全部自指正确。

| 页面组 | en | es | zh | x-default | 结论 |
|---|---|---|---|---|---|
| `/` 首页 | ✅ | ✅ | ✅ | ✅→en | OK |
| `/learn/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/join/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/tech-partnership/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/clinics/leis-acupuncture/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/stroke-recovery-acupuncture/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/migraine-acupuncture/` | ✅ | ✅ | ✅ | ✅→en | OK |
| `/facial-paralysis-acupuncture/` | ✅ | ✅ | ✅ | ✅→en | OK |

**唯二 0 条 hreflang 的:** `privacy.html`、`terms.html`。这两个是根目录单语页,**没有 es/zh 版本存在**,按"每页指向自己的三个语言版本"规则无从指起——我没有编造不存在的 URL。两者 canonical 自指正确。要不要做三语版是内容决策,留给你。

---

### 3. Lei Dong 认证写法 — **只报告,一字未改** ⚠️

全仓库 grep `Dipl` / `NCBAHM` / `NCCAOM`,共 **27 处**,分成两个互相冲突的口径:

#### 口径 A — 三个诊所页:`Dipl. AHM (NCBAHM)`

| 位置 | 原文 |
|---|---|
| `{en,es,zh}/clinics/leis-acupuncture/index.html` L222(Physician JSON-LD)| `"name": "Diplomate in Acupuncture & Herbal Medicine — Dipl. AHM (NCBAHM)", "recognizedBy": {"@type": "Organization", "name": "National Certification Board for Acupuncture and Herbal Medicine (NCBAHM)", "url": "https://www.ncbahm.org/"}` |
| `en/.../index.html` L459(可见)| `Nationally Board-Certified · Dipl. AHM (NCBAHM)` |
| `es/.../index.html` L459(可见)| `Certificación nacional · Dipl. AHM (NCBAHM)` |
| `zh/.../index.html` L459(可见)| `全国专业委员会认证 · Dipl. AHM (NCBAHM)` |
| `{en,es,zh}/.../index.html` L93 / L206 / L436-438(模板注释)| `AP suffix only §3.1; Diplomate -> Dipl. AHM (NCBAHM)`;`⚠ ZH: do NOT translate "NCBAHM" — Chinese official name unresolved (locked)`;`"Nationally Board-Certified" must stay anchored to NCBAHM; not MD/DO/PhD` |

#### 口径 B — 三个**首页**:`Diplomate of Oriental Medicine (NCCAOM)`

| 位置 | 原文 |
|---|---|
| `{en,es,zh}/index.html` L233–239(MedicalBusiness → hasCredential JSON-LD)| `"credentialCategory": "certification", "name": "Diplomate of Oriental Medicine", "recognizedBy": {"@type": "Organization", "name": "National Certification Commission for Acupuncture and Oriental Medicine (NCCAOM)", "url": "https://www.nccaom.org/"}` |

#### 🔴 这是站**内部**的冲突,不只是跟 leisacupuncture.com 不一致

你原本说的是"诊所页 vs leisacupuncture.com 不一致"。实际情况更麻烦:**HPA 站自己的首页和自己的诊所页就写了两个不同的认证机构**——首页说 NCCAOM(Diplomate of Oriental Medicine),诊所页说 NCBAHM(Dipl. AHM)。两处都是 JSON-LD 结构化数据,Google 都会读,同一个人(同一个 NPI `1811880438`)挂了两个互斥的认证。

三个口径摊开:

| 出处 | 写法 | 发证机构 |
|---|---|---|
| HPA 首页 JSON-LD ×3 | Diplomate of Oriental Medicine | NCCAOM |
| HPA 诊所页(可见 + JSON-LD)×3 | Dipl. AHM | NCBAHM |
| leisacupuncture.com | NCCAOM Dipl. Ac. | NCCAOM |

顺带说一句事实层面的背景,供你跟 Lei 核对时参考:**NCCAOM 是行业通认的那家**(全美各州采用的认证机构),历史上发过 `Dipl. Ac.`、`Dipl. OM`(Oriental Medicine)、`Dipl. C.H.` 等衔;`NCBAHM` 与 `ncbahm.org` 这个名字我这边**无法确认其真实性**,不敢替你判断。**这一条必须 Haiyan 找 Lei 拿到证书原件/证号确认后再统一**,不要靠推测改。

统一之后需要一起改的位置(共 6 个文件 12 处):首页 ×3 的 JSON-LD、诊所页 ×3 的 JSON-LD + 可见行 + 三段模板注释。另外 `AP`(Florida Board of Acupuncture)那条 license 三处写法一致,没问题,不受影响。

---

### 6. 锚点与 CTA — **只报告,一字未改** ✅

#### 锚点存在性

| | `id="patients"` | `id="about"` |
|---|---|---|
| `en/index.html` | ✅ L476 | ✅ L584 |
| `es/index.html` | ✅ L476 | ✅ L584 |
| `zh/index.html` | ✅ L476 | ✅ L584 |

跨页链接也都对:子页面用 `/{lang}/#about`、`/{lang}/#patients`(同语言前缀,无跨语言错指);首页内用裸 `#about` / `#patients`。三个落地页正文里的 `/{lang}/#patients` 链接同样有效。

#### `href="#"` 的 CTA — 全站 **207 个**(24 个语言页面,每语言 69 个),**100% 有 JS 绑定,0 个悬空**

脚本核对结果:**`href="#"` 的 `<a>` 中,没有 `data-lead-source` 的数量 = 0**。

绑定链路:

```js
// js/main.js L585
document.querySelectorAll('[data-lead-source]').forEach(btn => {
  if (btn.tagName === 'FORM') return;          // 跳过 #bookingForm(有自己的 submit)
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openLeadModal(btn.dataset.leadSource, btn.dataset.clinic, btn.dataset.concern);
  });
});
```

一个全局选择器兜住所有 CTA,所以只要元素带 `data-lead-source` 就一定绑上,不存在漏绑。

CTA 分四类,各自的行为都对得上:

| 类型 | 示例 | data 属性 | 弹窗模式 |
|---|---|---|---|
| 导航/页脚 Get Matched | `nav-get-matched`、`footer-get-matched` | 无 `data-clinic` | Mode A = Get Matched(不传 target_clinic) |
| Find Care 下拉 4 项 | `nav-findcare` + `data-concern` | `post-stroke-neuro` / `chronic-complex-pain` / `other-health-concern` / `not-sure` | Mode A,预选 Primary Concern |
| 首页 hero / how | `home-hero`、`home-how` | 无 `data-clinic` | Mode A |
| 诊所相关 | `home-clinic-card`、`clinic-hero`、`clinic-cta` | `data-clinic="lei-acupuncture"` | Mode B = Request Appointment(clinic-scoped) |

三项交叉验证也都通过:

1. **弹窗容器存在:** 所有 24 个带 CTA 的页面都同时有 `#leadModal` 和 `#leadForm`(privacy/terms 无 CTA 也无弹窗,一致)。
2. **concern 取值对得上:** 导航 4 个 `data-concern` 值与 `select[name="primary_concern"]` 的 4 个 option value 完全一致——`openLeadModal` 只在 option 存在时才预选,不匹配会静默失效,这里不会。
3. **平滑滚动不会抢事件:** `main.js` L206 的 `a[href^="#"]` 处理器第一行就是 `if (anchor.dataset.leadSource) return;`,并且对裸 `#` 有 `if (!href || href === '#') return;` 的防护(注释里标了这是 2026-08-21 首页 brand 链接失效的 root cause)。所以 CTA 只走弹窗路径,不会被滚动逻辑干扰。

**结论:弹窗逻辑全部有绑定对象,不需要改动。**

---

## 三、需要你拍板的三件事

1. **认证口径(第 3 条)** — 必须先跟 Lei 确认证书原件。这不只是跟 leisacupuncture.com 不一致,**HPA 站首页(NCCAOM)和诊所页(NCBAHM)自己就打架**,而且两处都是 Google 会读的 JSON-LD。确认后我一次改齐 6 文件 12 处。
2. **诊所页 L99 模板注释** — 还留着 `Wed off-site (FCIM)`,HTML 注释会随页面发出去。要不要一起清?
3. **8 个页面缺 og:locale:alternate** — en 的三个落地页 + join(三语)+ tech-partnership(三语)。零风险,一句话我就补。

另外顺手记一下:**这个仓库在 `~/Documents/Harmony-Painalliance-Comms/website`,不是 `~/Documents/GitHub`** —— 值得加进 harmonypainalliance-site skill 的 §1,省得下次再找。
