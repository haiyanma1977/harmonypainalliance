# 2026-08-27 · HPA 首页修复 v1 — 交付记录

来源：2026-08-27 首页体检（线上三语实渲染审计）→「HPA 首页修复 v1 — Cowork 交接指令」锁定指令
+ 同日 Haiyan 对三项挂起裁决的回批（F-inert 方案 a、E 深底白环、删 .gold-accent）。

**未运行任何 git 命令，未 commit，未 push。** 提交与推送由 Haiyan 在 GitHub Desktop 完成。

工作目录：`~/Documents/Harmony-Painalliance-Comms/website`

| 文件 | 相对基线的 diff 行数 |
|---|---|
| `en/index.html` | 54 |
| `es/index.html` | 54 |
| `zh/index.html` | 54 |
| `css/style.css` | 78 |
| `js/main.js` | 44 |

三个 index.html diff 行数完全一致，由同一个带断言的脚本一次施加。
**全部改动都是属性、标签名、CSS 值、注释——没有任何一个可见译文字符串被改动。**

---

## 一、断言结果表

### 1.1 §2-A 表单结构（每个 index.html）

| 断言 | 指令预期 | EN | ES | ZH |
|---|---|---|---|---|
| `class="form-group"` | 11 | 11 | 11 | 11 |
| form-group 内的组级 `<label>` | 11 | 11 | 11 | 11 |
| `<input>` text / email / tel | 3 | 3 | 3 | 3 |
| `<select>` | 5 | 5 | 5 | 5 |
| `<textarea>` | 1 | 1 | 1 | 1 |
| 一 label 对一控件的组 | 9 | 9 | 9 | 9 |
| 组标题 label（转 fieldset/legend） | 2 | 2 | 2 | 2 |

**一处口径差（不是不符）**：指令写「`<label>` 裸标签 = 11」，文件里 `<label>` 开标签实际 **16 个**——
11 个组级 label + 5 个 radio 包裹式 label（3 语言 + 2 first_acupuncture），后者指令自己也说明
「本来就是对的，保持不动」。文件状态与指令描述完全一致，只是「裸 `<label>`」这个说法会数到 16。
按 11 个组级 label 执行，那 5 个包裹式 label 未动。

### 1.2 锚点匹配数（每处必须 = 1，实测全部 = 1）

HTML：`<div class="lead-modal" id="leadModal">`、`<div class="lead-header">` 后第一个 `<h3>`、旧 FAQ 注释 —— 三语各 1。

CSS：`.form-group textarea` 规则、`.lead-modal .form-group label` 规则、`@media (max-width:1024px)` 抽屉偏移整块、
`.findcare-go` 的 aux-green 行、`.learn-go` 整行、`.footer-bottom a` 的 0.5 行、`body.clinic-profile` focus 选择器 + 上方注释末两行、
`padding: 72px 12px 40px`、`.hero .accent, .hero em, .hero-accent` 整条、`.hero-accent` 整条、`a:focus-visible` 站点级规则整条、
`.gold-accent` 整条 —— 各 1。

JS：`let lastFocusedBeforeModal` 声明点、`lastFocusedBeforeModal = document.activeElement;` 行、`document.body.style.overflow = '';` 行 —— 各 1。

`prefers-reduced-motion` 施加前全文件出现 0 次（与指令「全站没有」一致）。

### 1.3 token 归零检查

| 检查 | 结果 |
|---|---|
| 删 `.gold-accent` 前：26 个 HTML 中 `gold-accent` 出现次数 | **0**（断言成立，执行删除）；HTML 文件总数实测 26，与预期一致 |
| 删除后：全仓 `#D4A843` | **0** ✅ |
| 删除后：全仓 `gold-accent` | **0** ✅ |
| 全仓 `var(--aux-green)` | 7 —— 3 处 `border-left`、1 处 `.china-divider` background、3 处 `li::before`（tier-card / condition-card / check-list，首页未用）。与指令「合法保留」清单逐条吻合 |
| 三语旧 FAQ 注释残留 | 0 / 0 / 0 |
| `.hero-accent` 使用位置（J1 前置断言） | 5 处：style.css 2 条规则 + 三个 index.html 各 1 处，三处 HTML 均在 `<section class="hero">` 内的 `h1.hero-title` 里 → 断言成立 |

---

## 二、逐项改动清单

### A. 线索表单 label 关联（P0）

**三个 index.html**，id 三语完全相同：

| 控件 `name` | 新 id |
|---|---|
| `name` / `email` / `phone` | `lead-name` / `lead-email` / `lead-phone` |
| `primary_concern` / `duration` | `lead-concern` / `lead-duration` |
| `preferred_time` / `insurance` / `how_found` | `lead-time` / `lead-insurance` / `lead-howfound` |
| `notes` | `lead-notes` |

label 对应加 `for="…"`。id 按文件既有的属性字母序插入（`autocomplete, id, name, required, type`），
与 `#leadSource` / `#leadClinic` 写法一致。

两个组标题（EN `Preferred Language` / `First acupuncture experience?`，ES/ZH 为其译文，**文字一字未动**）：

- `<div class="form-group">` → `<fieldset class="form-group">`
- `<label>组标题</label>` → `<legend>组标题</legend>`
- 对应的 `</div>` → `</fieldset>`
- 组内 5 处 `<label><input type="radio">…</label>` 包裹式写法**未动**

`css/style.css` 追加（落在 `.form-group textarea` 规则之后，现有 `.form-group` 规则本身未动）：

```css
.form-group[class] { border: 0; margin: inherit; padding: 0; min-width: 0; }
```

**指令未列出、但属于本改动必然后果的两条补充（已做，纯新增，未改动任何现有规则）**
`<label>` 变 `<legend>` 后，`.form-group label`（L683）与 `.lead-modal .form-group label`（L1270）都够不到它，
两个组标题会掉成浏览器默认 legend 样式。补两条规则把外观逐条还原：

```css
.form-group > legend {
  display: block; font-size: 0.875rem; font-weight: 600;
  color: var(--text-dark); margin-bottom: 6px; padding: 0;
}
.lead-modal .form-group > legend { margin-bottom: 4px; font-weight: 600; font-size: 0.875rem; color: var(--text-dark); }
```

实测 legend 计算值 `14px / 600 / block / margin-bottom 4px`，与同页 label 一致；
fieldset 盒模型 `margin 0/0/16px/0、border 0、padding 0`，与相邻 `div.form-group` 完全相同（`margin: inherit` 未造成间距漂移）。

### B. 抽屉导航关闭态移出焦点序列（P0）

`css/style.css`，落在既有 `@media (max-width: 1024px)` 抽屉偏移块内、`.nav-cta-mobile` 那行之后：

```css
  .nav-menu { visibility: hidden; transition: right 0.35s ease, visibility 0s linear 0.35s; }
  .nav-menu.open { visibility: visible; transition: right 0.35s ease, visibility 0s; }
```

**第三处 transition 核对**：`.nav-menu` 的 transition 声明全仓只有两处——L208 基础规则 `transition: right 0.35s ease;`，
和 `@media (min-width: 1025px)` 内的 `transition: none;`（桌面横向导航）。`≤1024` 内没有第三处。
新规则只落在 `max-width: 1024px` 内，`>1024` 未受影响。

### C. 绿色 token 分工修正（P1）

| 位置 | 原文 | 改后文 |
|---|---|---|
| `.findcare-go` | `font-size: 1.25rem; font-weight: 700; color: var(--aux-green);` | `… color: var(--green-600);` |
| `.learn-go` | `.learn-go { color: var(--aux-green); …` | `.learn-go { color: var(--green-600); …` |

三处 `border-left: solid var(--aux-green)`、`.china-divider` 的 `background`、三处 `li::before`（首页未用）**均未触碰**。

### D. 页脚法务链接对比度（P1）

`.footer-bottom a`：`color: rgba(255,255,255,0.5);` → `rgba(255,255,255,0.72);`。`:hover` 的 `var(--white)` 未动。

### E. 焦点样式全站化 + 深底白色焦点环（P1）

**E-1 选择器全站化**

```
body.clinic-profile a:focus-visible,        →   a:focus-visible,
body.clinic-profile button:focus-visible {      button:focus-visible,
                                                [role="button"]:focus-visible {
```

规则体三行（`outline / outline-offset / border-radius`）未动。上方注释末两行由
「Scoped to the Clinic Profile for this round; a site-wide focus style is a separate change.」改为
「Now site-wide: this rule applies on every page, not only the Clinic Profile.」（英文注释未译）。

**E-2 深底白环（Haiyan 裁决落地）** —— 紧接上面那条规则之后新增，只改 `outline-color`：

```css
.hero a:focus-visible,
.hero button:focus-visible,
footer a:focus-visible,
footer button:focus-visible,
.navbar:not(.scrolled) a:focus-visible,
.navbar:not(.scrolled) button:focus-visible {
  outline-color: #fff;
}
```

特异度：`.hero a:focus-visible` = 0-2-1、`footer a:focus-visible` = 0-1-2、`.navbar:not(.scrolled) a:focus-visible` = 0-3-1，
均高于站点级的 `a:focus-visible`（0-1-1），且在源码顺序上也在其后。

**第三条的作用域核查（结论：不会误伤其它 25 页）**
`js/main.js` L186 `const navAlwaysSolid = !document.querySelector('.hero');` —— 没有 `.hero` 的页面首帧就加上 `.scrolled`
并永久保持。全仓只有三个首页有 `class="hero"`，所以 `.navbar:not(.scrolled)` 只在三个首页且 `scrollY ≤ 10` 时成立，
正是透明导航浮在深蓝 hero 上的那一刻。实测四页对照（首页 / join / learn / clinic-profile）见 §三。

### F. 线索弹窗对话框语义（P1）

**HTML（三个 index.html）**

- `<div class="lead-modal" id="leadModal">` → `<div class="lead-modal" id="leadModal" role="dialog" aria-modal="true" aria-labelledby="leadModalTitle">`（属性顺序按指令原文，未按文件的字母序）
- `.lead-header` 后第一个 `<h3>` → `<h3 id="leadModalTitle">`。三语 h3 文字一字未动
  （`Connect with This Clinic` / `Contactar con esta clínica` / `联系这家诊所`）。
  用「`<div class="lead-header">` 之后第一个 `<h3>`」正则锚点定位，未用行号。

**JS（`js/main.js`）— 焦点归位**

```js
  // WCAG 2.4.3 — the element that opened the dialog, so focus can be returned
  // to it on close instead of falling back to <body>.
  let lastFocusedBeforeModal = null;
```
`openLeadModal` 内 `leadModal.classList.add('show');` 之后：`lastFocusedBeforeModal = document.activeElement;`
`closeLeadModal` 内：显式判空后 `lastFocusedBeforeModal.focus()`，再清空。
（`main.js` 全文未用过可选链 `?.`，故写成显式判空而非 `lastFocusedBeforeModal?.focus()`，行为相同。）

**JS — 背景失活（Haiyan 裁决：方案 a，不动 DOM）**

指令原文的「对 `nav.navbar, main, footer` 设 inert」在本页结构下无法照字面执行：
`#leadModal` 就在 `<main>` 内部（EN 为 L697，`<main>` 是 L458–859），对 `main` 设 inert 会把弹窗自己一起失活。
改为 inert 掉 `nav.navbar`、`footer`，以及 `<main>` 的直接子元素中除 `#leadModal` / `#leadOverlay` 之外的全部：

```js
  // The elements THIS open() actually switched to inert. closeLeadModal clears
  // inert from exactly this list and never re-queries the DOM, so nothing that
  // was already inert for another reason gets cleared, and nothing added or
  // moved while the dialog was open can be left inert.
  let inertedByModal = [];

  const setBackgroundInert = () => {
    const targets = [];
    document.querySelectorAll('nav.navbar, footer').forEach((el) => targets.push(el));
    const main = document.querySelector('main');
    if (main) {
      Array.prototype.forEach.call(main.children, (el) => {
        if (el === leadModal || el === leadOverlay) return;
        if (leadModal && el.contains(leadModal)) return;
        if (leadOverlay && el.contains(leadOverlay)) return;
        targets.push(el);
      });
    }
    inertedByModal = targets.filter((el) => !el.inert);
    inertedByModal.forEach((el) => { el.inert = true; });
  };

  const clearBackgroundInert = () => {
    inertedByModal.forEach((el) => { el.inert = false; });
    inertedByModal = [];
  };
```

`openLeadModal`：`lastFocusedBeforeModal = document.activeElement;` **之后**调 `setBackgroundInert()`
（顺序不能反——先设 inert 会把触发按钮 blur 掉，就记不到它了）。
`closeLeadModal`：先 `clearBackgroundInert()`，再归还焦点（元素得先解除 inert 才可聚焦）。

两个设计细节按要求落实：

1. **关闭时只清 `inertedByModal` 数组，不重新查 DOM。**
2. `inertedByModal = targets.filter((el) => !el.inert)` —— 只收录「本次真正改过」的元素。
   若某个元素因别的原因本来就是 inert，关闭时不会被误清。

**未手写焦点陷阱循环**，符合指令。

### G. 减弱动效偏好（P2）

`css/style.css` 末尾追加，规则体与指令逐字一致（另加三行说明注释）。与 B 项的冲突已实测排除，见 §三。

### H. 390 下 hero 首行与导航零间距（P2）

`@media (max-width: 480px)` 内：`padding: 72px 12px 40px;` → `padding: 100px 12px 40px;`（全文件唯一匹配）。

### I. ZH hero 强调字去伪斜体（P2）

落在 `.hero .accent, .hero em, .hero-accent { … !important }` 那条规则**之后**：

```css
body.lang-zh .hero-accent {
  font-family: 'Noto Sans SC', sans-serif !important;
  font-style: normal !important;
  font-weight: 700;
}
```
金色 `#D4A574` 未动（实测计算色仍为 `rgb(212, 165, 116)`）。

### J. 死代码与过期注释（P3）+ `.gold-accent` 删除（Haiyan 裁决）

**J1**：`.hero-accent` 规则里的 `color: #D4A843;` 一行删除，原位换成指向文件末尾 `#D4A574 !important` 那条规则的注释。

**J2**：三个 index.html 第 336 行注释

- 原文：`<!-- JSON-LD: FAQPage — patient-facing FAQs (English; ES/ZH translations live in page body) -->`
- 改后文：`<!-- JSON-LD: FAQPage — patient-facing FAQs (each language file carries its own translated FAQ schema) -->`
- 三个文件都改，英文未译。

**J3（裁决落地）**：`css/style.css` 的整条 `.gold-accent` 规则删除。
上方那行 `/* --- Gold accent for key terms --- */` 是该规则专属的段落注释，规则删掉后会成为悬空注释，
按「改动的必然后果直接做」一并删除。删后全仓 `#D4A843` = 0、`gold-accent` = 0。

---

## 三、复测结果

**方法**：把改后的 4 个文件（连同首页引用的 img 资产、以及对照用的 join / learn / clinic-profile / privacy / terms 页面）
在本地起静态服务器，用无头 Chromium 按 EN/ES/ZH × 1280 / 900 / 390 跑真实渲染与真实键盘事件（不是静态推算）。
Google Fonts 正常加载。三语九组页面**均无 JS 运行时错误**。

> 测量法上的一个坑，记录备查：`.btn { transition: all 0.25s }` 把 `outline-width` 也纳入过渡，
> 聚焦后立刻读计算值会读到 `0px`（还在插值中）。测焦点环必须等 ~380ms 稳定后再读。下面 E 项数据都是稳定后的值。

| 项 | 目标 | 实测 | 结论 |
|---|---|---|---|
| **A** | 无可编程名称的控件数 = 0 | 三语 × 三断点：`controls = 9, unnamed = 0` | ✅ |
| **A 附加** | fieldset 不引入盒模型漂移 | fieldset `margin 0/0/16px/0, border 0, padding 0`；相邻 `div.form-group` `margin 0/0/16px/0` | ✅ |
| **A 附加** | legend 外观等同原 label | 三语均 `14px / 600 / display:block / margin-bottom 4px` | ✅ |
| **B** | 390 / 900 未展开菜单 Tab 15 次无视口外焦点 | 六组（三语 × 390/900）全部 `offscreen = 0`；`.nav-menu` 计算值 `visibility: hidden, right: -320px` | ✅ |
| **B** | 1280 导航 6 项仍在 Tab 序列内 | EN `Find Care / Clinics / Learn / About HPA / For Clinics / Get Matched`，ES、ZH 同样 6/6 | ✅ |
| **C** | `.learn-go` / `.findcare-go` = `rgb(0, 125, 96)` | 三语 × 三断点全部 `rgb(0, 125, 96)`；`#007d60` 对白 5.12:1 | ✅ |
| **D** | `.footer-bottom a` 对比度 ≥ 4.5 | `rgba(255,255,255,0.72)` on `rgb(7,56,128)` → 合成 `rgb(186,199,219)`，**6.51:1**（改前 0.5 = 3.97:1） | ✅ |
| **E-1** | 首页主 CTA 聚焦有可见环 | 键盘 Tab 走查 EN@1280 / ZH@390：**16/16 均为 2px 实线环, offset 3px**。唯一 `0px` 的是 Google 地图 `<iframe>`——不是 `a`/`button`/`[role=button]`，本就不在规则范围内 | ✅ |
| **E-2** | 三个深底场景为白环 | 场景1 `.hero` 主 CTA / 次级链接、场景2 `footer` 法务链接、场景3 `.navbar:not(.scrolled)` 语言切换 + 导航 CTA + 导航各项 —— 计算值全部 `outline-color: rgb(255, 255, 255)`，截图肉眼清晰可见 | ✅ |
| **E-2** | 浅底区块未被误伤 | `.findcare-card`、`.learn-card`、`.btn-outline`、`.btn-primary` 等浅底元素仍为 `rgb(7, 56, 128)`；EN@1280 白环 12 / 深蓝 4，ZH@390 白环 7 / 深蓝 8，分区与预期完全对应 | ✅ |
| **E-2** | `.navbar.scrolled` 回落深蓝 | 滚动后导航栏底色变白，导航链接焦点环回到 `rgb(7, 56, 128)` | ✅ |
| **E-2** | 作用域不外溢到其它页 | join / learn / clinic-profile 三页首帧即 `navbar.scrolled = true`（`navAlwaysSolid` 逻辑），导航焦点环为深蓝；`privacy.html` / `terms.html` **不加载 `/css/style.css`**（各自内联 `<style>`），本规则完全够不到 | ✅ |
| **F** | 弹窗打开后 Tab 一圈不外逸 | **Tab × 30，落到弹窗外 0 次**（三语 × 1280/390 六组一致），弹窗内 7 个可聚焦停靠点循环 | ✅ |
| **F** | inert 目标正确 | 每次打开 inert 10 个元素：`nav.navbar` + `footer.footer` + `<main>` 的 8 个 section；`main.inert = false`、`#leadModal.inert = false`、`#leadOverlay.inert = false` | ✅ |
| **F** | ESC 后背景全部恢复可聚焦 | 关闭后 `document` 内 inert 元素 = 0；弹窗外可聚焦元素 59 个（与打开前一致），其中被 inert 挡住的 = **0** | ✅ |
| **F** | ESC 后焦点归位 | 六组全部回到 `#probeTrigger`（最初点击的那个按钮），弹窗已关闭 | ✅ |
| **F** | 连开连关不残留 | 第二轮开→关：打开时 inert 10 个，关闭后 0 个 | ✅ |
| **F** | 对话框语义 | 三语均 `role=dialog / aria-modal=true / aria-labelledby=leadModalTitle`，标题元素文本 = 该语言 h3 原文；打开时首个输入框获得焦点（`INPUT#lead-name`） | ✅ |
| **G** | 开启减弱动效后抽屉开合正常 | 390 与 900：`transition-duration` 压到 `1e-05s`，`transition-delay` 保持 `0s, 0.35s`；关→开→关全程 `visibility` / `right` 正确切换 | ✅ 与 B 无冲突 |
| **H** | 390 下 eyebrow 顶边与 navbar 底边间距 > 0 | 三语均 **28px**（navbar 实高 72px，hero padding-top 100px）。EN 与 ES 的 eyebrow 都是两行（41px 高），ZH 一行 | ✅ |
| **H 对照** | 其它断点未回退 | 1280：EN/ES 162px、ZH 151px；900：EN/ES 152px、ZH 146px —— 与体检时记录的 161 / 152 吻合 | ✅ |
| **I** | ZH `.hero-accent` 计算 `font-style: normal` | ZH 三断点均 `font-style: normal / font-weight: 700 / font-family: "Noto Sans SC", sans-serif / color: rgb(212,165,116)`；EN、ES 仍是 `italic / 600 / Playfair Display` | ✅ |

**截图证据**（随交付发在对话里，未入库）：
`E2-hero-cta.png`、`E2-footer-legal.png`、`E2-navbar-top-lang.png`、`E2-navbar-top-cta.png`（三个深底场景白环）、
`E2-light-control.png`、`E2-navbar-scrolled.png`（浅底对照，深蓝环）、
`A-modal-legends.png`（弹窗两个 legend 与其它 label 排版一致）、`I-zh-heroaccent.png`（「北美康复医学」竖直无伪斜）、
`D-footer-1280.png`（页脚法务链接可读性）、`H-390-es.png`（ES 两行 eyebrow 最坏情况下的间距）。

---

## 四、未做的项

| 项 | 原因 |
|---|---|
| §3.1 D1–D5（licensed 表述、ES/ZH 结构化数据英文、hero 金色 390 对比度、hero min-height 不实注释、页脚法务链接三语化） | 按指令，待裁决 |
| §3.2 地图 iframe（旧坐标 + 假 place id） | 按指令挂起，等 Lei 认领 Google Business Profile |
| `.tier-card li::before` / `.condition-card li::before` / `.check-list li::before` 三处 aux-green 涂字形 | 按指令，首页未用这些类，留待全站 token 排查 |

**本轮无因断言失败而跳过的项。**

---

## 五、本轮发现、但不在指令清单内（只记录，未改）

1. **`footer a:focus-visible` 是无类名的元素选择器，理论上覆盖全部 26 页的 `<footer>`。**
   实测目前无风险：24 页用的是 `<footer class="footer">`，底色统一 `#073880`（深底，白环正确）；
   `privacy.html` / `terms.html` 用的是 `<footer class="legal-footer">`、底色 `rgb(250,250,250)`（浅底，白环会看不见），
   但这两页**不加载 `/css/style.css`**，各自带内联 `<style>`，所以本规则够不到它们。
   → **如果哪天让这两页改用站点样式表，`footer a:focus-visible` 必须收窄成 `.footer a:focus-visible`**，否则那 3 个链接的焦点环会消失。同理，v1 的站点级 focus 规则实际覆盖的是 24 页而不是 26 页。

2. **`.btn { transition: all 0.25s }`** 把 `outline-width` 也纳入过渡，焦点环是「渐显」的（约 0.25s 才到 2px）。
   功能上没问题，减弱动效下也会被 G 项压掉；若希望焦点反馈瞬时，把 `all` 收窄成具体属性更好。

3. **导航语言切换器的白色焦点环与 `.active` 状态的白色边框观感接近**（焦点环有 3px offset，实际能分辨，
   但同屏出现时视觉信息略重复）。仅记录。

4. **页脚 Privacy Policy / Terms of Use 在 ES/ZH 页仍是英文**——即 §3.1 的 D5，本轮未碰，在此确认现状属实。

5. 三个 index.html 实际各 **919** 行（指令写 920），只是行尾换行计法差异；锚点全部用字符串定位，未受影响。

---

**交付到此结束。提交与推送请在 GitHub Desktop 完成。**
