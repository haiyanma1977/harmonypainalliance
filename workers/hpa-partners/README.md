# hpa-partners — 合作申请 Worker

**状态:未部署。** 源码进仓库做版本管理,部署按下面的顺序走。

处理 harmonypainalliance.com 的**合作申请**(诊所加盟 + 技术出海)。与 `hpa-leads`(患者线索)完全独立:独立 KV、独立 Apps Script、独立邮件模板、响应里没有任何 Jane App 跳转。

> `hpa-leads` 的源码目前只存在于 Cloudflare 上,仓库里没有副本。若后续要改它,建议先 `wrangler download` 一份进 `workers/hpa-leads/`,再动手。

---

## 绑定

| 类型 | 名称 | 说明 |
|---|---|---|
| 路由 | `harmonypainalliance.com/api/partner` | hpa-leads 继续占 `/api/lead` |
| KV | `HPA_PARTNERS` | 独立命名空间,**不是** HPA_LEADS |
| Secret | `PARTNER_SCRIPT_URL` | 独立 Apps Script,**不是** GOOGLE_SCRIPT_URL |
| Var | `PARTNER_NOTIFY_EMAIL` | 可选,默认 founder@harmonypainalliance.com |

---

## 部署顺序(逐步做,不要跳)

### 第 1 步 — 建 KV

```bash
cd workers/hpa-partners
wrangler kv:namespace create HPA_PARTNERS
```

把返回的 id 填进 `wrangler.toml` 的 `[[kv_namespaces]] id`。

### 第 2 步 — 建 Apps Script

新建一个**独立**的 Apps Script(不要复用患者那个),`doPost` 收到的 payload 形状:

```json
{
  "type": "partner_application",
  "notify_email": "founder@harmonypainalliance.com",
  "subject": "[HPA] Clinic Partnership Application — 张伟",
  "text_body": "已排版好的纯文本正文,直接发即可",
  "application": { "...完整结构化数据..." }
}
```

最省事:用 `text_body` 直接 `MailApp.sendEmail`,再把 `application` 追加进**一张新的 Google Sheet**(不要写进患者那张表)。部署成 Web App,访问权限设为"任何人",拿到 `/exec` 结尾的 URL。

```bash
wrangler secret put PARTNER_SCRIPT_URL
```

### 第 3 步 — 部署

```bash
wrangler deploy
```

### 第 4 步 — 测试(两项都必须做)

**4a. 新 Worker 通不通**

```bash
curl -X POST https://harmonypainalliance.com/api/partner \
  -H "Content-Type: application/json" \
  -d '{"form_type":"clinic","clinic_name_full":"ROUTING TEST","clinic_contact":"test@example.com","clinic_name":"Test Clinic"}'
```

期望:`{"success":true,"application_id":"partner_clinic_...","stored":true,"delivered":true}`。
然后确认**邮件真的收到了**、KV 里有这条记录。收不到邮件就是第 2 步的问题。

**4b. ⚠️ 患者表单回归测试 —— 这一步不能省**

新增 `/api/partner` 路由后,必须确认 `hpa-leads` 的 `/api/lead` **没有被截**。Cloudflare 的规则是更具体的路由优先,理论上两者互不干扰,但这必须实测:

```bash
curl -X POST https://harmonypainalliance.com/api/lead \
  -H "Content-Type: application/json" \
  -d '{"name":"ROUTING TEST","email":"test@example.com","phone":"5555555555","target_clinic":"lei-acupuncture"}'
```

期望:返回里**有** `redirect_url`(Jane App 链接)和 `lead_id`,`debug.kv` 和 `debug.sheets` 都是 `ok` —— 说明还是 hpa-leads 在处理。

如果返回的是 `application_id` 或者 404,说明路由被新 Worker 截了,**立刻回滚**:

```bash
wrangler delete hpa-partners
```

命令行之外,再用浏览器实际走一遍患者预约弹窗(首页任意"预约"按钮),确认能正常提交并跳转 Jane App。

测试完记得把两条 `ROUTING TEST` 记录从表格/KV 里清掉。

### 第 5 步 — 切前端(确认前四步都通过之后)

前端目前两个合作表单仍走 `mailto`。切换要做的:表单改为 POST 到 `/api/partner`、带上 `form_type`(`clinic` / `tech`)和蜜罐字段 `company_website_hp`、`mailto` 保留为失败兜底(Worker 返回 `show_fallback: true` 或请求失败时启用)。

**在第 4 步全部通过之前不要做第 5 步** —— 先改前端而 Worker 没就绪,申请会直接丢失。

---

## 回滚

```bash
wrangler delete hpa-partners
```

前端还没切的情况下,删掉 Worker 不影响任何线上功能(合作表单继续走 mailto)。
