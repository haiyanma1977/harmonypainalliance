<!-- ==========================================================================
     AUTHORITATIVE DEPLOYMENT GUIDE FOR THE hpa-leads WORKER
     Lives beside the authoritative source it documents. Keep them in sync.
     ========================================================================== -->

# ⭐ 本文件是 hpa-leads 的权威部署指南 / AUTHORITATIVE DEPLOYMENT GUIDE

> **这是唯一权威的 hpa-leads 部署文档。**
> 它与它所描述的源码放在同一目录下，随代码一起接受版本控制、审阅与回滚。
>
> **This repo copy is the authoritative deployment guide for the `hpa-leads` Worker.**
> It sits alongside the source it documents, so the two are versioned, reviewed and
> rolled back together.

| 位置 / Location | 角色 / Role |
|---|---|
| **`website/workers/hpa-leads/HPA_Deployment_Guide.md`** *(本文件 / this file)* | ⭐ **权威版本 / AUTHORITATIVE** — 修改从这里开始 |
| `HPA_Deployment_Guide_v2_2026-08-20` (Google Drive) | 参考副本 / reference mirror — 便于分享，但**不是**权威 |
| `HPA_Deployment_Guide_SUPERSEDED_2026-04-19_DO-NOT-FOLLOW.md` (Google Drive) | ❌ 已作废原版 / retired original — **请勿照做** |

**修改顺序 / Change order:** 先改本文件 → 再同步 Drive 参考副本。反之则会重演本次审计发现的文档漂移问题。

**同目录下的权威文件 / Authoritative files in this directory:**

| 文件 | 内容 |
|---|---|
| `worker.js` | 线上部署源码的逐字快照 / verbatim capture of the deployed Worker |
| `wrangler.toml` | 重建的配置（含 VERIFY 待核项）/ reconstructed config |
| `apps-script/Code.gs` | 恢复的 Apps Script 源码 / recovered Apps Script source |
| `README.md` | 运维说明、回滚参考、生产事实 / ops notes, rollback reference, verified production facts |

> 本文件为**文档**。创建时未改动任何生产系统 —— 未部署 Worker、未改 Apps Script、未改 DNS、
> 未配置 Postmark、未改网站。
> This file is documentation only. No production system was changed when it was created.

---

# HPA 网站 + 留资系统 部署指南 v2

**版本：v2 — 2026-08-20 修订**
**取代：HPA_Deployment_Guide.md（2026-04-19 原版）**

> **本次修订原因**
> 原版指南在两处指向了**未部署、且会泄露密钥的代码**，另有两节描述了**已经不再使用的 MailChannels 邮件通道**。
> 2026-08-20 的 Task 3 Step 0 审计恢复了真实的生产源码并纳入版本控制，本指南据此更新。
>
> 本次修订**仅为文档整理**。未修改任何 DNS、Worker、Apps Script 或网站。

---

## ⚠️ 修订摘要（先读这一段）

| 项目 | 原版说明 | 现状 |
|---|---|---|
| Worker 源码 | `worker/hpa-leads-worker.js` | ❌ **已废弃，禁止部署** → 改用 `website/workers/hpa-leads/worker.js` |
| Apps Script 源码 | `worker/google-apps-script.js` | ⚠️ 已归档 → 改用 `website/workers/hpa-leads/apps-script/Code.gs` |
| 邮件通道 | MailChannels + SPF 设置（§6.3、§7） | ❌ **已停用**。Worker v2.0 已移除 MailChannels，改用 Apps Script `MailApp` |
| 诊所通知 | 无 | 🕒 已批准 **Postmark**（`mail.harmonypainalliance.com`）— **尚未配置** |

---

## 🚫 已废弃：旧的本地 Worker 文件

```
Harmony-Painalliance-Comms/worker/hpa-leads-worker.js
```

**该文件不是线上运行的代码，且永远不要拿它去部署。**

| 行为 | 线上版本（188 行） | 该本地文件（204 行） |
|---|---|---|
| Apps Script 返回 302 时 | 记录 `"ok (status 302)"` | **跟随跳转**，把最多 300 字符的响应内容写进 `debug.sheets` |
| 其他状态码 | 回显 200 字符 | 回显 300 字符 |
| `debug.sheets_url` | **无** | **有 —— 把 `GOOGLE_SCRIPT_URL` 的前 60 个字符返回给浏览器** |

`GOOGLE_SCRIPT_URL` 指向一个 **"任何人都可访问"** 的 Apps Script Web App。
拿到该 URL 的人可以往患者留资表格里写数据，并以该 Google 账号的身份发信。
`debug` 对象会在**每一次成功提交**时返回给浏览器 —— 也就是说，部署该文件等于把这个 URL 的前缀暴露给每一位填表的患者。

**该文件保留用于历史比对，旁边已放置 `DEPRECATED.md` 说明。请勿删除，也请勿部署。**

---

## 第一步：Google Sheet + Apps Script

### 1.1 现状（已完成，无需重做）

- Google Sheet 名称：**HPA Leads**（单个工作表标签：`Sheet1`）
- 表头共 **22 列**，由脚本自动创建，已于生产环境核实
- 所属账号：**`haiyanma256@gmail.com`（个人 Gmail 账号）**

> ⚠️ **待办（已评估，未执行）：** 该表格与脚本位于个人 Gmail 账号，不在 HPA 的
> Google Workspace 之内，因此不受管理控制台、Drive 恢复、审计日志与保留策略的保护。
> 迁移方案已完成评估，**尚未获批执行**。

### 1.2 Apps Script 源码位置

**权威源码：**
```
website/workers/hpa-leads/apps-script/Code.gs
```

旧路径 `worker/google-apps-script.js` 仅作历史归档。

### 1.3 当前部署状态

| 项目 | 值 |
|---|---|
| 生产部署版本 | **Version 3** |
| 创建时间 | 2026-04-19 22:25（America/New_York） |
| 说明 | `HPA lead receiver Vison` |
| 绑定方式 | **锁定在 Version 3，不是 HEAD** |
| 通知收件人 | `founder@harmonypainalliance.com`（已由实际收到的邮件核实） |

### 1.4 ⚠️ 修改代码后必须重新发布版本

**只保存 `Code.gs` 不会改变线上行为。**

Web App 部署锁定在某个版本号上，保存后的代码只会出现在 `/dev` 网址 —— 而 Worker 调用的是 `/exec`。

**正确做法：**

> Deploy → **Manage deployments** → 编辑**现有部署** → Version 选 **New version** → Deploy

这样 **`/exec` 网址保持不变**，`GOOGLE_SCRIPT_URL` 无需改动。

> 🚫 **不要选 "New deployment"** —— 那会生成新的 `/exec` 网址，并且会**悄无声息地让 Worker 失效**。

### 1.5 已批准但尚未执行的修改

下列改动应**一次性打包**进同一个新版本：

1. 内部通知收件人：`founder@` → **`info@harmonypainalliance.com`**
2. 移除字段：`duration`、`first_acupuncture`、`first_visit`、`preferred_time`、`insurance`、`how_found`（第 8–13 列将变为空白，列不会错位）
3. `notes` 重命名为 `note`（否则第 14 列会变空白）
4. 新增列 23–26：`source_page`、`resolved_clinic`、`connection_status`、`schema_version`
   —— **表头行不会自动更新，需要手工添加**
5. 把 `getActiveSheet()` 改为 `getSheetByName("Sheet1")`

---

## 第二步：KV Namespace（已完成）

| 项目 | 值 |
|---|---|
| 名称 | `hpa-leads` |
| ID | `0a7c30cc4d6c49298efc0be6e0b37a34` |
| 绑定变量名 | `HPA_LEADS` |
| 保留期 | `expirationTtl` = 365 天 |

> 🚫 **不要新建 KV namespace。** 现有记录必须保持可读。

---

## 第三步：Cloudflare Worker

### 3.1 现状

| 项目 | 值 |
|---|---|
| Worker 名称 | `hpa-leads` |
| 路由 | `harmonypainalliance.com/api/*`（请在面板核实） |
| 当前生产 Version ID | **`33a1db41`**（v3.0，2026-08-20 部署） |
| 回滚目标 Version ID | **`778d24c9`**（v2.0，保持可用） |
| 源码版本 | `HPA Lead Capture Worker — v3.0` |

### 3.2 粘贴 Worker 代码 —— **已更正**

> 🚫 **不要再使用 `worker/hpa-leads-worker.js`。** 见本文开头的"已废弃"说明。

1. 在在线编辑器中**全选并删除**默认代码
2. 打开**权威源码**：
   ```
   website/workers/hpa-leads/worker.js
   ```
3. **复制全部内容**，粘贴到在线编辑器
4. 点击右上角 **Save and Deploy**
5. 部署完成后，到 **Deployments** 页面复制新的 Version ID，写入
   `website/workers/hpa-leads/README.md`，并保留上一个 Version ID 直到新版本稳定

### 3.3 绑定 KV Namespace

Settings → Bindings → Add → KV Namespace
变量名 `HPA_LEADS`（全大写），选择 `hpa-leads`。

### 3.4 环境变量

变量名：`GOOGLE_SCRIPT_URL`

> ⚠️ **已批准的安全改动（尚未执行）：** 目前它是**明文 Variable**，应改为**加密 Secret**。
> 同时 Worker v3 必须**移除返回给浏览器的整个 `debug` 对象** —— 否则加密也挡不住代码把值打印出来。

### 3.5 回滚

Cloudflare Dashboard → Workers & Pages → `hpa-leads` → **Deployments** → 选择 **`778d24c9`** → Rollback。
数秒完成，且与 git 无关。

---

## 第四步：自定义域名路由（不变）

Worker → Settings → Domains & Routes → Add → Route
Route：`harmonypainalliance.com/api/*`，Zone：`harmonypainalliance.com`

---

## 第五步：网站前端 ⚠️ 待复核

> **本节可能已过时。** 原版描述的是把 `deploy_ready/` 文件夹手动拖拽上传到 Cloudflare Pages
> 项目 `orange-fog-20a4`。当前网站的实际发布流程（Pages 项目名称、是否已改为 GitHub 自动部署）
> **本次修订未予核实**，请在下次发布前确认后再更新本节。

---

## 第六步：端到端测试

### 6.1 测试留资流程（不变）

打开网站 → 点击任意 Book 按钮 → 填写测试数据 → 提交。

### 6.2 检查数据是否到达

| 位置 | 预期 |
|---|---|
| 邮件 | `founder@harmonypainalliance.com` 收到 `[HPA Lead] …` 主题邮件（改动后为 `info@`） |
| Google Sheet | **HPA Leads** 表新增一行 |
| KV | Cloudflare → KV → `hpa-leads` 出现 `lead_xxx_xxxx` 记录 |

### 6.3 排查 —— **已更正**

**弹窗提交后没有跳转到 JaneApp：**
浏览器开发者工具（F12）→ Console，查看是否有报错。常见原因：Worker 路由未生效、CORS 问题。

**没有收到邮件：**

> 🚫 **原版此处的 MailChannels SPF 说明已作废。** Worker v2.0 已移除 MailChannels（该服务 2024 年停止免费支持），
> 邮件现在完全由 Apps Script 的 `MailApp` 发送。**添加 MailChannels 的 SPF 记录不会解决任何问题。**

正确排查路径：

1. Apps Script 编辑器 → **Executions（执行记录）**，查看 `doPost` 是否运行、是否报错
2. 确认发信配额：**个人 Gmail 账号每天 100 位收件人**（Workspace 为 1,500）
3. 确认 Worker 的 `GOOGLE_SCRIPT_URL` 环境变量正确

> ⚠️ **已知缺陷：** 当前 Apps Script 在出错时仍返回 HTTP 200，`sendNotification` 也会吞掉邮件错误。
> 因此 **Sheet 写入失败与邮件发送失败，Worker 都无法感知**。这正是 Worker v3 要修复的问题。

**Google Sheet 没有数据：**
同上，先看 Executions 执行记录。

---

## 第七步：邮件发送配置 —— **已重写**

### 7.1 MailChannels：已停用

> 🚫 **原版 §7 的 MailChannels SPF 与 Domain Lockdown 记录说明已完全作废，请勿执行。**
>
> - Worker v2.0 已移除 MailChannels
> - 2026-08-20 的 DNS 审计确认：**这些记录从未被添加过**，因此**没有遗留记录需要清理**

### 7.2 当前 DNS 现状（2026-08-20 只读审计）

| 记录 | 状态 |
|---|---|
| MX | Google Workspace（`aspmx.l.google.com` 等 5 条） |
| SPF | **无** |
| DKIM | **无**（含 `google._domainkey`，即 Workspace DKIM 未启用） |
| DMARC | **无** |
| MailChannels 相关记录 | **无** |
| `mail.harmonypainalliance.com` | **不存在**（干净） |

> ⚠️ **独立于本项目的既有风险：** 域名目前没有任何邮件认证记录，
> `founder@` 与 `info@` 的外发邮件无 SPF/DKIM 背书，域名也容易被冒用。
> 这是一项**独立待办**，尚未立项。

### 7.3 诊所通知：Postmark（已批准，**尚未配置**）

| 项目 | 值 |
|---|---|
| 服务商 | **Postmark** |
| 发信子域名 | **`mail.harmonypainalliance.com`** |
| Lei's Acupuncture 收件地址 | `leidong@leisacupuncture.com` |
| HPA 内部通知 | `info@harmonypainalliance.com`（仍走 Apps Script + Sheet） |

**两条通知路径必须保持分离：**

```
Worker (v3)
  ├── HPA 内部  → Apps Script → HPA Leads 表 + 邮件 → info@harmonypainalliance.com
  │               （完整运营记录，含 source_page / source_button 归因字段）
  └── 诊所侧    → Postmark → 该诊所的通知地址
                  最小化字段：不含 IP、不含归因、不含内部元数据
```

**将来需要添加的 DNS 记录（仅为方案，尚未执行）：**

| 类型 | 名称 | 值 | Cloudflare |
|---|---|---|---|
| TXT | `<selector>._domainkey.mail.harmonypainalliance.com` | **由 Postmark 账号生成** | — |
| CNAME | `pm_bounces.mail.harmonypainalliance.com` | `pm.mtasv.net` | **DNS only（灰云）** |
| TXT（可选） | `_dmarc.mail.harmonypainalliance.com` | `v=DMARC1; p=none; rua=mailto:info@harmonypainalliance.com` | — |

> 🚫 **真实的 DKIM selector 与密钥值必须从实际的 Postmark 账号生成后再填写，不得臆造。**
>
> ⚠️ **CNAME 必须设为 DNS only（灰云）。** Cloudflare 默认代理 CNAME，
> 一旦被代理会破坏退信处理与 SPF 对齐 —— 这是该配置最常见的失败原因。

**当前状态：Postmark 账号尚未创建，DNS 尚未添加，Worker 尚未改动。**

---

## 快速参考（已更新）

| 组件 | 位置 |
|---|---|
| **Worker 源码（权威）** | `website/workers/hpa-leads/worker.js` |
| **Worker 配置** | `website/workers/hpa-leads/wrangler.toml` |
| **Apps Script 源码（权威）** | `website/workers/hpa-leads/apps-script/Code.gs` |
| **运维说明 / 回滚参考** | `website/workers/hpa-leads/README.md` |
| ~~旧 Worker 源码~~ | ~~`worker/hpa-leads-worker.js`~~ — **已废弃，禁止部署** |
| ~~旧 Apps Script 源码~~ | ~~`worker/google-apps-script.js`~~ — 仅历史归档 |
| KV Namespace ID | `0a7c30cc4d6c49298efc0be6e0b37a34` |
| Worker 名称 / 当前 Version ID | `hpa-leads` / `33a1db41`（回滚：`778d24c9`） |
| Apps Script 部署版本 | Version 3（锁定，非 HEAD） |
| Sheet 所属账号 | `haiyanma256@gmail.com`（个人） |
| 诊所通知服务商 | Postmark（已批准，未配置） |

---

## 以后添加新诊所 ⚠️ 说明已更新

**当前（v2 架构）：** 诊所配置在**两个地方重复维护** —— `website/js/main.js` 的 `HPA_CLINICS`
与 Worker 内的 `CLINICS`。两者会各自漂移。

**已批准的目标架构（Worker v3）：** **Worker 成为唯一权威的诊所注册表**，前端不再保留独立的
预约地址表，改为使用 Worker 返回的 `redirect_url`。

因此，**在 v3 完成之前**新增诊所仍需两处同时修改；v3 之后只需修改 Worker 注册表一处。

> 另注：当前对未知诊所 slug 会**静默回退到 Lei's Acupuncture**。在多诊所场景下这属于误转诊，
> v3 将改为明确报错，不再静默回退。
