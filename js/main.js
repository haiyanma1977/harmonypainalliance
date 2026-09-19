/* ============================================
   Harmony Pain Alliance — Main JavaScript v5.0
   Hamburger menu, language switching,
   FAQ accordion, lead capture, form handling
   ============================================ */

/* ============================================================
   STAGE 2a — HPA CONNECTION LAYER (2026-08)

   There is NO clinic registry in the front end. Worker v3
   (/api/lead) is the single authoritative source of clinic
   resolution, clinic phone, booking_type, redirect_url and
   next_step. Do not reintroduce clinic data, booking URLs, or
   routing fallbacks here (locked decision 10-B).

   Two connection modes, decided by the opening button's markup:
     GET MATCHED          data-clinic absent  -> target_clinic
                          omitted; Worker matches server-side;
                          primary_concern required client-side.
     REQUEST APPOINTMENT  data-clinic present -> clinic-scoped;
                          Worker validates the slug (422 on
                          unknown — no silent fallback).
   ============================================================ */
const HPA_API_URL = '/api/lead';

/* B2B partner-form fallback recipient — unchanged by Stage 2a. */
const HPA_PARTNER_EMAIL = 'founder@harmonypainalliance.com';
/* Patient-facing support path (approved 10-A, Message 3). */
const HPA_PATIENT_EMAIL = 'info@harmonypainalliance.com';

/* Approved Stage 2a microcopy (10-A final wording, 2026-08-21).
   ES register: usted (K3). Do not edit without Haiyan's approval. */
/* Legal versions (legal v1, 2026-09-18). MUST equal the "Last Updated" date on
   /terms and /privacy — change all three in the same commit (rule in AGENTS.md /
   CLAUDE.md). Sent with every lead as terms_version / privacy_version. */
const HPA_TERMS_VERSION = '2026-09-19';
const HPA_PRIVACY_VERSION = '2026-09-19';
/* Consent-box fallback clinic name when the trigger has no data-clinic-name. */
const HPA_CONSENT_CLINIC_FALLBACK = {
  en: 'the clinic named on this page',
  es: 'la clínica indicada en esta página',
  zh: '本页所示诊所'
};

/* Mode-aware modal copy (approved 2026-08-21). The static HTML carries the
   Mode B (Request Appointment) strings verbatim; Mode A (Get Matched) strings
   are applied by JS at open and restored on every open. Do not edit without
   Haiyan's approval. */
const HPA_MODAL_MODE_A = {
  en: {
    concernLabel: 'Primary Concern *',
    title: 'Get Matched with a Clinic',
    intro: 'Tell us what you need — it takes about 30 seconds. HPA will look for an appropriate participating clinic for you.',
    submit: 'Get Matched',
    helper: 'Your information will help HPA look for an appropriate participating clinic for you.'
  },
  es: {
    concernLabel: 'Preocupación Principal *',
    title: 'Le Conectamos con una Clínica',
    intro: 'Cuéntenos qué necesita — toma unos 30 segundos. HPA buscará una clínica participante adecuada para usted.',
    submit: 'Conectarme con una Clínica',
    helper: 'Su información ayudará a HPA a buscar una clínica participante adecuada para usted.'
  },
  zh: {
    concernLabel: '主要健康问题 *',
    title: '为您匹配合适的诊所',
    intro: '告诉我们您的需求——约 30 秒完成。HPA 将为您寻找合适的参与诊所。',
    submit: '开始匹配',
    helper: '您的信息将用于帮助 HPA 为您寻找合适的参与诊所。'
  }
};

const HPA_CONNECT_I18N = {
  en: {
    concernRequired: 'Please select your primary concern so we can match you with the right clinic.',
    followUpMatch: "Thank you — we've received your request. HPA will contact you to help you find the right clinic.",
    followUpClinic: "Thank you — we've sent your request to {clinic}. HPA will follow up with you.",
    followUpClinicGeneric: "Thank you — we've sent your request to this clinic. HPA will follow up with you.",
    failure: "Sorry — our system couldn't submit your request just now. Please try again in a few minutes, or email us directly at " + HPA_PATIENT_EMAIL + " (an email draft may have opened for you).",
    clinicContact: 'Thank you — the clinic will contact you directly to arrange your visit. You can also call them at:',
    fieldError: 'Please check this field and try again.',
    matchConfirm: "We've received your information. HPA will look for a suitable partner clinic. If no clinic currently fits your needs, we will let you know. This is a care request, not an appointment. HPA will follow up with you; any visit time is confirmed directly with the clinic. Care is provided by the clinic."
  },
  es: {
    concernRequired: 'Seleccione su principal problema de salud para que podamos conectarle con la clínica adecuada.',
    followUpMatch: 'Gracias — hemos recibido su solicitud. HPA se pondrá en contacto con usted para ayudarle a encontrar la clínica adecuada.',
    followUpClinic: 'Gracias — hemos enviado su solicitud a {clinic}. HPA hará el seguimiento con usted.',
    followUpClinicGeneric: 'Gracias — hemos enviado su solicitud a esta clínica. HPA hará el seguimiento con usted.',
    failure: 'Lo sentimos — nuestro sistema no pudo enviar su solicitud en este momento. Inténtelo de nuevo en unos minutos, o escríbanos directamente a ' + HPA_PATIENT_EMAIL + ' (es posible que se haya abierto un borrador de correo para usted).',
    clinicContact: 'Gracias — la clínica se pondrá en contacto con usted directamente para coordinar su visita. También puede llamarles directamente al:',
    fieldError: 'Revise este campo e inténtelo de nuevo.',
    matchConfirm: 'Hemos recibido su información. HPA buscará una clínica colaboradora adecuada. Si actualmente no hay ninguna que se ajuste a sus necesidades, también se lo informaremos. Esta es una solicitud de atención, no una cita. HPA hará el seguimiento con usted; la hora de la visita se confirma directamente con la clínica. La atención la brinda la clínica.'
  },
  zh: {
    concernRequired: '请选择您的主要健康问题，以便我们为您匹配合适的诊所。',
    followUpMatch: '感谢您的提交。HPA 将与您联系，帮助您找到合适的诊所。',
    followUpClinic: '感谢您的提交。我们已把您的请求发送给{clinic}，HPA 会跟进。',
    followUpClinicGeneric: '感谢您的提交。我们已把您的请求发送给这家诊所，HPA 会跟进。',
    failure: '抱歉，系统暂时无法提交您的请求。请几分钟后重试，或直接发送邮件至 ' + HPA_PATIENT_EMAIL + '（您的邮件应用中可能已为您打开一封草稿）。',
    clinicContact: '感谢您的提交，诊所将直接与您联系安排就诊。您也可以致电诊所：',
    fieldError: '请检查此项内容后重新提交。',
    matchConfirm: '我们已经收到您的信息。HPA 会为您查找合适的合作诊所；如果目前没有符合您需求的诊所，我们也会告知您。这是一份咨询请求，不是预约。HPA 会人工跟进，具体就诊时间由诊所与您直接确认。诊疗由诊所提供。'
  }
};

document.addEventListener('DOMContentLoaded', () => {

  // --- Language Switching ---
  // As of 2026-05-20, each language has its own URL (/en/, /es/, /zh/), so the
  // language is fixed per-page via <body class="lang-XX"> in the HTML itself.
  // The nav lang-switch is now plain <a href="/{lang}/"> links — no JS needed.
  // getLang() below still reads body.className for the lead form's page_language field.

  // --- Hamburger Menu ---
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navOverlay = document.querySelector('.nav-overlay');

  const toggleMenu = (open) => {
    const isOpen = open !== undefined ? open : !navMenu.classList.contains('open');
    hamburger.classList.toggle('open', isOpen);
    navMenu.classList.toggle('open', isOpen);
    navOverlay.classList.toggle('show', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (!isOpen) closeAllDropdowns();
  };

  hamburger.addEventListener('click', () => toggleMenu());
  navOverlay.addEventListener('click', () => toggleMenu(false));
  navMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => toggleMenu(false));
  });

  // ==========================================
  //  NAVIGATION V2 — dropdowns / accordions
  //  Same markup at every width; CSS decides bar vs drawer.
  // ==========================================
  const navItems = Array.from(document.querySelectorAll('.nav-item.has-children'));

  function closeAllDropdowns(except) {
    navItems.forEach(item => {
      if (item === except) return;
      item.classList.remove('open');
      const btn = item.querySelector(':scope > .nav-parent');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function setDropdown(item, open) {
    const btn = item.querySelector(':scope > .nav-parent');
    item.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  navItems.forEach(item => {
    const btn = item.querySelector(':scope > .nav-parent');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !item.classList.contains('open');
      closeAllDropdowns(item);
      setDropdown(item, willOpen);
    });
    // Keyboard: Down opens and moves into the submenu; Up/Escape close.
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAllDropdowns(item);
        setDropdown(item, true);
        const first = item.querySelector('.nav-sub a');
        if (first) first.focus();
      } else if (e.key === 'Escape' || e.key === 'ArrowUp') {
        setDropdown(item, false);
      }
    });
    item.querySelectorAll('.nav-sub a').forEach((link, idx, all) => {
      link.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); (all[idx + 1] || all[0]).focus(); }
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx === 0) btn.focus(); else all[idx - 1].focus();
        } else if (e.key === 'Escape') { setDropdown(item, false); btn.focus(); }
      });
    });
    // Focus leaving the whole item closes it (desktop only — the drawer keeps
    // accordions open while the user scrolls the panel).
    item.addEventListener('focusout', (e) => {
      if (window.innerWidth < 1025) return;
      if (!item.contains(e.relatedTarget)) setDropdown(item, false);
    });
  });

  // Click anywhere outside the nav closes open dropdowns (desktop).
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1025) return;
    if (!e.target.closest('.nav-menu')) closeAllDropdowns();
  });

  // --- Navbar Scroll Shadow ---
  const navbar = document.querySelector('.navbar');
  // Pages without a .hero open on a light background; the transparent navbar's
  // white text was invisible there (white-on-white defect, fixed 2026-08-21).
  // Such pages keep the solid "scrolled" style from first paint. The homepage
  // (blue hero) keeps its transparent-at-top behaviour unchanged.
  const navAlwaysSolid = !document.querySelector('.hero');
  if (navAlwaysSolid) {
    // Apply instantly — suppress the 0.3s background/color transition for the
    // first frames so there is no white-text flash before the solid style lands.
    navbar.style.transition = 'none';
    navbar.classList.add('scrolled');
    requestAnimationFrame(() => requestAnimationFrame(() => { navbar.style.transition = ''; }));
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', navAlwaysSolid || window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  });

  // --- Smooth Scroll (skip lead-source buttons) ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      if (anchor.dataset.leadSource) return; // handled by lead modal
      const href = anchor.getAttribute('href');
      // Bare "#" is not a valid selector — querySelector('#') THROWS, which
      // silently broke the homepage brand link (2026-08-21 root cause).
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', anchor.getAttribute('href'));
      }
    });
  });

  // Mirrors the .open class onto aria-expanded. Derived from the class rather
  // than toggled inline, so every open/close path stays in step automatically.
  // Deliberately defensive: .faq-question also exists on pages whose markup has
  // no aria-expanded (homepage, /join, /learn, condition pages). Those questions
  // must neither throw nor silently acquire a half-wired ARIA attribute, so only
  // questions already marked up with aria-expanded are touched.
  const syncFaqAria = (item) => {
    if (!item) return;
    const q = item.querySelector('.faq-question');
    if (q && q.hasAttribute('aria-expanded')) {
      q.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
    }
  };

  // --- FAQ Accordion ---
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-answer').style.maxHeight = '0';
          syncFaqAria(other);
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
      syncFaqAria(item);
    });
  });

  // --- FAQ Tab Filtering ---
  document.querySelectorAll('.faq-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.faq-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.faq-item').forEach(item => {
        const match = item.dataset.category === filter;
        item.style.display = match ? '' : 'none';
        if (!match) {
          item.classList.remove('open');
          item.querySelector('.faq-answer').style.maxHeight = '0';
          syncFaqAria(item);
        }
      });
    });
  });

  // --- Partnership Form Tabs ---
  document.querySelectorAll('.form-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.classList.add('active');
    });
  });

  // --- Partnership Form Submission (clinic + tech forms, mailto + no-loss fallback) ---
  //  Delivery is still mailto (unchanged). What is new: if the visitor has no
  //  mail client configured — common on mobile and for webmail users — the old
  //  version silently did nothing and the application was lost. Now we always
  //  show the filled application with a copy button and the address to send it to.
  const HPA_PARTNER_I18N = {
    en: {
      sent: 'Your email app should now be open with your application filled in — press send to complete it.',
      fallback: 'Nothing opened? Some browsers have no email app configured. Copy your application and send it to:',
      copy: 'Copy my application',
      copied: '✓ Copied — now paste it into your email',
      reply: 'We reply to every application within 5 business days.'
    },
    es: {
      sent: 'Su aplicación de correo debería abrirse con su solicitud ya completada — pulse enviar para finalizar.',
      fallback: '¿No se abrió nada? Algunos navegadores no tienen una aplicación de correo configurada. Copie su solicitud y envíela a:',
      copy: 'Copiar mi solicitud',
      copied: '✓ Copiado — ahora péguelo en su correo',
      reply: 'Respondemos a cada solicitud en un plazo de 5 días hábiles.'
    },
    zh: {
      sent: '您的邮件应用应该已经打开，申请内容已自动填好 —— 点击发送即可完成。',
      fallback: '没有反应？部分浏览器没有配置邮件应用。请复制您的申请内容，发送至：',
      copy: '复制我的申请内容',
      copied: '✓ 已复制 —— 请粘贴到您的邮件中',
      reply: '我们承诺在 5 个工作日内回复每一份申请。'
    }
  };

  const hpaLang = () => {
    const l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.startsWith('zh')) return 'zh';
    if (l.startsWith('es')) return 'es';
    return 'en';
  };

  // Build a human-readable application body using the form's own visible labels,
  // so the text stays in whatever language the page is in.
  const buildPartnerBody = (form) => {
    const fields = new Map();
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => {
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      const val = (el.value || '').trim();
      if (!val) return;
      const group = el.closest('.form-group');
      const labelEl = group ? group.querySelector('label') : null;
      const label = labelEl
        ? labelEl.textContent.replace(/\*/g, '').trim()
        : el.name;
      if (!fields.has(el.name)) fields.set(el.name, { label, values: [] });
      fields.get(el.name).values.push(val);
    });
    let body = '';
    fields.forEach((f) => { body += `${f.label}: ${f.values.join(', ')}\n`; });
    return body;
  };

  const showPartnerFallback = (form, body) => {
    const t = HPA_PARTNER_I18N[hpaLang()];
    let panel = form.querySelector('.partner-fallback');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'partner-fallback';
      panel.style.cssText =
        'margin-top:22px;padding:20px;border-radius:14px;background:#eef3fb;' +
        'text-align:center;font-size:0.95rem;line-height:1.7;';
      form.appendChild(panel);
    }
    panel.innerHTML = '';

    const p1 = document.createElement('p');
    p1.style.cssText = 'margin:0 0 10px;';
    p1.textContent = t.sent;

    const p2 = document.createElement('p');
    p2.style.cssText = 'margin:0 0 12px;';
    p2.textContent = t.fallback + ' ';
    const mail = document.createElement('a');
    mail.href = 'mailto:' + HPA_PARTNER_EMAIL;
    mail.textContent = HPA_PARTNER_EMAIL;
    p2.appendChild(mail);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline';
    btn.textContent = t.copy;
    btn.addEventListener('click', () => {
      const done = () => { btn.textContent = t.copied; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(done).catch(() => {
          window.prompt(HPA_PARTNER_EMAIL, body);
        });
      } else {
        window.prompt(HPA_PARTNER_EMAIL, body);
      }
    });

    const note = document.createElement('p');
    note.style.cssText = 'margin:12px 0 0;font-size:0.85rem;opacity:0.75;';
    note.textContent = t.reply;

    panel.append(p1, p2, btn, note);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Mobile is where mailto fails most: iOS Safari and Android Chrome block
  // external-scheme navigation from hidden iframes, and long mailto URLs get
  // truncated or dropped. So: render the fallback panel FIRST (it carries the
  // full text either way), then hand off via a real anchor click inside the
  // user gesture, with a length-capped body.
  const MAILTO_BODY_LIMIT = 1500;

  const handlePartnerFormSubmit = (form, subject) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = buildPartnerBody(form);

      // Panel goes up first — never depends on the mail handoff succeeding.
      showPartnerFallback(form, body);

      let mailBody = body;
      if (mailBody.length > MAILTO_BODY_LIMIT) {
        mailBody = mailBody.slice(0, MAILTO_BODY_LIMIT) + '\n...';
      }
      const mailtoLink = `mailto:${HPA_PARTNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

      // Anchor click keeps the user gesture, which mobile browsers require to
      // hand off to the mail app. The page itself is not navigated away.
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    });
  };

  const clinicForm = document.getElementById('clinicForm');
  const techForm = document.getElementById('techForm');
  if (clinicForm) handlePartnerFormSubmit(clinicForm, 'HPA Clinic Partnership Application');
  if (techForm) handlePartnerFormSubmit(techForm, 'HPA Technology Partnership Inquiry');

  // ==========================================
  //  LEAD CAPTURE MODAL SYSTEM
  // ==========================================
  const leadOverlay = document.getElementById('leadOverlay');
  const leadModal = document.getElementById('leadModal');
  const leadClose = document.getElementById('leadClose');
  const leadForm = document.getElementById('leadForm');
  const leadSource = document.getElementById('leadSource');
  const leadClinic = document.getElementById('leadClinic');
  const leadExpandBtn = document.getElementById('leadExpandBtn');
  const leadOptional = document.getElementById('leadOptional');
  const leadSubmitBtn = document.getElementById('leadSubmitBtn');
  const leadSuccess = document.getElementById('leadSuccess');
  // Consent box (legal v1, 2026-09-18)
  const leadConsentTerms = document.getElementById('lead-consent');
  const leadConsentClinic = document.getElementById('lead-consent-clinic');
  const leadConsentClinicRow = document.getElementById('leadConsentClinicRow');
  const leadConsentClinicName = document.getElementById('leadConsentClinicName');

  // Stage 2a state + message helpers -----------------------------------
  let leadIsMatchMode = false;

  // Submit stays disabled until the Terms/Privacy box is ticked (Mode A) or
  // both boxes are ticked (Mode B). The Worker is the real gate; this is UX.
  const updateConsentState = () => {
    if (!leadConsentTerms || !leadSubmitBtn) return;
    const clinicOk = leadIsMatchMode || !leadConsentClinic || leadConsentClinic.checked;
    leadSubmitBtn.disabled = !(leadConsentTerms.checked && clinicOk);
  };
  [leadConsentTerms, leadConsentClinic].forEach((el) => {
    if (el) el.addEventListener('change', updateConsentState);
  });

  const connectT = () => HPA_CONNECT_I18N[getLang()] || HPA_CONNECT_I18N.en;

  const clearConnectMessages = (scope) => {
    (scope || document).querySelectorAll('.hpa-connect-msg').forEach(n => n.remove());
  };

  // Insert a message element directly after `anchor`.
  // kind: 'error' | 'info'
  const showConnectMessage = (anchor, text, kind) => {
    if (!anchor) return null;
    const div = document.createElement('div');
    div.className = 'hpa-connect-msg';
    div.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    div.style.cssText = 'margin-top:8px;font-size:0.875rem;line-height:1.5;border-radius:8px;padding:10px 14px;' +
      (kind === 'error'
        ? 'color:#8a1f1f;background:#fbeaea;border:1px solid #efc7c7;'
        : 'color:#0d4f42;background:#e0f5ef;border:1px solid #bfe5da;');
    div.textContent = text;
    anchor.insertAdjacentElement('afterend', div);
    return div;
  };

  // Map a Worker `field` name onto the actual input in this form.
  const connectFieldEl = (form, field) => form.querySelector('[name="' + field + '"]');

  // ---- Mode-aware modal copy + concern placement (approved 2026-08-21) ----
  // The shared modal stays ONE component. Static HTML = Mode B (Request
  // Appointment) verbatim. Mode A (Get Matched) swaps four strings and moves
  // the required Primary Concern field out of the "(optional)" expander so it
  // is visible at open. Everything is restored on every open.
  const modalTitleEl  = leadModal ? leadModal.querySelector('.lead-header h3') : null;
  const modalIntroEl  = leadModal ? leadModal.querySelector('.lead-subtitle') : null;
  const modalSubmitEl = leadModal ? leadModal.querySelector('.lead-submit-text') : null;
  const modalHelperEl = leadForm ? leadForm.querySelector('.form-note') : null;
  const concernSelect = leadForm ? leadForm.querySelector('select[name="primary_concern"]') : null;
  const concernGroup  = concernSelect ? concernSelect.closest('.form-group') : null;
  const concernLabel  = concernGroup ? concernGroup.querySelector('label') : null;
  // Remember the concern group's home inside the optional block (Mode B).
  const concernHome = concernGroup
    ? { parent: concernGroup.parentElement, next: concernGroup.nextElementSibling }
    : null;

  const cacheOriginal = (el) => {
    if (el && el.dataset.original === undefined) el.dataset.original = el.textContent;
  };
  [modalTitleEl, modalIntroEl, modalSubmitEl, modalHelperEl, concernLabel].forEach(cacheOriginal);

  const applyModalMode = (isMatch) => {
    const t = HPA_MODAL_MODE_A[getLang()] || HPA_MODAL_MODE_A.en;
    // 1. Restore Mode B (the HTML originals) first — makes reopening in a
    //    different mode always clean.
    [modalTitleEl, modalIntroEl, modalSubmitEl, modalHelperEl, concernLabel].forEach((el) => {
      if (el && el.dataset.original !== undefined) el.textContent = el.dataset.original;
    });
    if (concernGroup && concernHome && concernGroup.parentElement !== concernHome.parent) {
      concernHome.parent.insertBefore(concernGroup, concernHome.next);
    }
    if (!isMatch) return;
    // 2. Mode A: Get Matched copy + concern visible and marked required.
    if (modalTitleEl)  modalTitleEl.textContent  = t.title;
    if (modalIntroEl)  modalIntroEl.textContent  = t.intro;
    if (modalSubmitEl) modalSubmitEl.textContent = t.submit;
    if (modalHelperEl) modalHelperEl.textContent = t.helper;
    if (concernLabel)  concernLabel.textContent  = t.concernLabel;
    if (concernGroup && leadExpandBtn) {
      // Place the concern field directly above the "(optional)" expander,
      // outside the collapsed block. The truly optional fields stay collapsed.
      leadExpandBtn.parentElement.insertBefore(concernGroup, leadExpandBtn);
    }
  };

  // Get current language
  const getLang = () => {
    const m = document.body.className.match(/lang-(en|es|zh)/);
    return m ? m[1] : 'en';
  };

  // Open modal
  //  concern (optional) — a Find Care taxonomy value. When present it preselects
  //  the Primary Concern field and expands the optional block so the patient can
  //  see and change what was chosen for them. Values must match the Worker's
  //  ALLOWED_CONCERNS exactly — seven-category v1 (2026-09-18), nine values:
  //  pain-msk | chronic-complex | neuro | fertility | womens | mind-sleep |
  //  cosmetic | other-health-concern | not-sure. The Worker maps the legacy
  //  post-stroke-neuro / chronic-complex-pain until 2026-10-18. Find Care
  //  entries (cards, nav) omit target_clinic = Get Matched mode; data-clinic
  //  buttons send target_clinic = Request Appointment mode.

  // WCAG 2.4.3 — the element that opened the dialog, so focus can be returned
  // to it on close instead of falling back to <body>.
  let lastFocusedBeforeModal = null;

  // The elements THIS open() actually switched to inert. closeLeadModal clears
  // inert from exactly this list and never re-queries the DOM, so nothing that
  // was already inert for another reason gets cleared, and nothing added or
  // moved while the dialog was open can be left inert.
  let inertedByModal = [];

  // #leadModal sits inside <main>, so <main> itself cannot be inerted — that
  // would deactivate the dialog too. Inert the navbar, the footer, and every
  // direct child of <main> except the dialog and its overlay. `inert` replaces
  // a hand-written focus trap: fewer moving parts, and it also removes the
  // background from the accessibility tree.
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

  const openLeadModal = (source, clinicId, concern, clinicName) => {
    leadSource.value = source || 'unknown';
    // Mode: data-clinic present -> Request Appointment (clinic-scoped);
    // absent -> Get Matched (target_clinic omitted; Worker matches). 10-B.
    leadClinic.value = clinicId || '';
    leadIsMatchMode = !clinicId;
    clearConnectMessages(leadModal);
    // Restore the page's own localized success text (a previous submission
    // may have replaced it with a follow-up / clinic-contact outcome).
    const successH3 = leadSuccess.querySelector('h3');
    if (successH3) {
      if (!successH3.dataset.original) successH3.dataset.original = successH3.textContent;
      successH3.textContent = successH3.dataset.original;
    }
    // v4.8: the Mode B booking link is opt-in per submission — never carry a
    // previous response's URL into a new one.
    const successBtnReset = leadSuccess.querySelector('.lead-redirect-btn');
    if (successBtnReset) { successBtnReset.hidden = true; successBtnReset.removeAttribute('href'); }
    leadForm.style.display = '';
    leadSuccess.style.display = 'none';
    leadForm.reset();
    if (leadOptional) leadOptional.classList.remove('show');
    if (leadExpandBtn) leadExpandBtn.classList.remove('expanded');
    leadSubmitBtn.classList.remove('loading');
    // Consent box: both boxes cleared by reset(); clinic-share row only in
    // Mode B, with the clinic name from data-clinic-name (fallback per lang).
    if (leadConsentClinicRow && leadConsentClinic) {
      if (leadIsMatchMode) {
        leadConsentClinicRow.hidden = true;
        leadConsentClinic.required = false;
      } else {
        leadConsentClinicRow.hidden = false;
        leadConsentClinic.required = true;
        if (leadConsentClinicName) {
          const fb = HPA_CONSENT_CLINIC_FALLBACK[getLang()] || HPA_CONSENT_CLINIC_FALLBACK.en;
          leadConsentClinicName.textContent = clinicName || fb;
        }
      }
    }
    updateConsentState();
    // Render the correct copy + concern placement for this mode.
    applyModalMode(leadIsMatchMode);
    if (concern) {
      const sel = leadForm.querySelector('select[name="primary_concern"]');
      if (sel && Array.from(sel.options).some(o => o.value === concern)) {
        sel.value = concern;
        // Only expand the optional block if the concern still lives inside it
        // (Mode B). In Mode A it is already visible above the expander.
        if (leadOptional && leadOptional.contains(sel)) {
          leadOptional.classList.add('show');
          if (leadExpandBtn) leadExpandBtn.classList.add('expanded');
        }
      }
    }
    leadOverlay.classList.add('show');
    leadModal.classList.add('show');
    lastFocusedBeforeModal = document.activeElement;
    setBackgroundInert();
    document.body.style.overflow = 'hidden';
    // Focus first input
    setTimeout(() => {
      const firstInput = leadForm.querySelector('input[name="name"]');
      if (firstInput) firstInput.focus();
    }, 100);
  };

  // Close modal
  const closeLeadModal = () => {
    leadOverlay.classList.remove('show');
    leadModal.classList.remove('show');
    document.body.style.overflow = '';
    clearBackgroundInert();
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  };

  if (leadClose) leadClose.addEventListener('click', closeLeadModal);
  if (leadOverlay) leadOverlay.addEventListener('click', closeLeadModal);

  // Expand optional fields
  if (leadExpandBtn) {
    leadExpandBtn.addEventListener('click', () => {
      const isExpanded = leadOptional.classList.contains('show');
      leadOptional.classList.toggle('show');
      leadExpandBtn.classList.toggle('expanded');
    });
  }

  // --- All [data-lead-source] buttons open the modal ---
  document.querySelectorAll('[data-lead-source]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openLeadModal(btn.dataset.leadSource, btn.dataset.clinic, btn.dataset.concern, btn.dataset.clinicName);
    });
  });

  // --- Lead Form (modal) submission ---
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearConnectMessages(leadModal);

      const fd = new FormData(leadForm);
      const payload = {};
      for (const [key, value] of fd.entries()) {
        if (value) payload[key] = value;   // empty target_clinic is omitted
      }
      payload.page_language = getLang();
      payload.source_page = location.pathname;
      payload.terms_version = HPA_TERMS_VERSION;
      payload.privacy_version = HPA_PRIVACY_VERSION;

      // GET MATCHED: primary_concern is required (front-end rule; the
      // Worker deliberately accepts an absent concern, so this must live
      // here). Never enforced in Request Appointment mode.
      if (leadIsMatchMode && !payload.primary_concern) {
        const sel = leadForm.querySelector('select[name="primary_concern"]');
        // In Mode A the concern field sits above the expander and is already
        // visible; only expand the optional block if it still contains it.
        if (sel && leadOptional && leadOptional.contains(sel)) {
          leadOptional.classList.add('show');
          if (leadExpandBtn) leadExpandBtn.classList.add('expanded');
        }
        const group = sel ? sel.closest('.form-group') : null;
        showConnectMessage(group || sel, connectT().concernRequired, 'error');
        if (sel) sel.focus();
        return;
      }

      leadSubmitBtn.classList.add('loading');
      submitLead(payload, { form: leadForm, inModal: true, matchMode: leadIsMatchMode });
    });
  }

  // --- Submit lead to Worker v3 (the authoritative registry) -----------
  //  The response body decides everything: clinic, redirect_url, phone,
  //  next_step. No destination is ever chosen client-side (10-B).
  async function submitLead(payload, ctx) {
    const t = connectT();

    const showModalOutcome = (text) => {
      leadForm.style.display = 'none';
      leadSuccess.style.display = '';
      const h3 = leadSuccess.querySelector('h3');
      if (h3) h3.textContent = text;
      // v4.8: outcomes other than Mode B booking never show the booking link.
      const btn = leadSuccess.querySelector('.lead-redirect-btn');
      if (btn) { btn.hidden = true; btn.removeAttribute('href'); }
      // No auto-close: the patient should read the outcome.
    };

    const showFailure = () => {
      // Lead NOT durably stored: honest failure, no redirect (10-B).
      // v4.10: the modal is the only submitter, so the message always anchors
      // to the modal's submit button.
      showConnectMessage(leadSubmitBtn.parentElement, t.failure, 'error');
      fallbackMailto(payload);
    };

    let resp = null, data = null;
    try {
      resp = await fetch(HPA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      try { data = await resp.json(); } catch (parseErr) { data = null; }
    } catch (netErr) {
      console.warn('HPA connect: network failure', netErr);
      showFailure();
      leadSubmitBtn.classList.remove('loading');
      return;
    }
    leadSubmitBtn.classList.remove('loading');

    // 422 with a named field: fixable input — keep the form open, point at
    // the field. Never routed into the failure state, never mailto.
    if (resp.status === 422 && data && data.field) {
      const form = ctx.form;
      const el = connectFieldEl(form, data.field);
      if (el && leadOptional && leadOptional.contains(el)) {
        leadOptional.classList.add('show');
        if (leadExpandBtn) leadExpandBtn.classList.add('expanded');
      }
      const group = el ? (el.closest('.form-group') || el) : null;
      showConnectMessage(group || leadSubmitBtn.parentElement, t.fieldError, 'error');
      if (el) el.focus();
      return;
    }

    if (!resp.ok || !data || data.ok !== true) {
      showFailure();
      return;
    }

    // Stored. GET MATCHED never redirects (live fixes v1, 2026-09-17): the
    // Worker may still resolve a clinic, but HPA follows up by hand, so the
    // patient stays on the confirmation message. Request Appointment
    // (data-clinic present) keeps the Worker-driven branches below.
    if (ctx.inModal && ctx.matchMode) {
      showModalOutcome(t.matchConfirm);
      return;
    }

    // Branch on the Worker's authoritative next_step.
    const nextStep = data.next_step;
    const clinic = data.clinic || null;

    // Mode B (Request Appointment) with a Worker-supplied booking URL.
    // v4.8: no timer, no automatic window.open, no auto-close. The patient sees
    // the page's own localized success text and decides whether to open the
    // clinic's booking page. The link's LABEL lives in the page HTML (three
    // languages); this code only sets href and unhides it — never the wording.
    // A null/absent redirect_url falls through to the follow-up text below, so
    // no empty button is ever shown.
    if (nextStep === 'booking' && clinic && clinic.redirect_url) {
      leadForm.style.display = 'none';
      leadSuccess.style.display = '';
      const redirectBtn = leadSuccess.querySelector('.lead-redirect-btn');
      if (redirectBtn) {
        redirectBtn.href = clinic.redirect_url;
        redirectBtn.hidden = false;
      }
      return;
    }

    if (nextStep === 'clinic_will_contact') {
      const text = t.clinicContact + (clinic && clinic.phone ? ' ' + clinic.phone : '');
      showModalOutcome(text);
      return;
    }

    // hpa_will_follow_up — and any stored-but-unroutable shape defaults here
    // rather than faking a booking. Two voices, decided by the path the patient
    // took: Get Matched (matchMode) says HPA will look for a clinic; the clinic
    // page says the request went TO that clinic. Mode A returns earlier at
    // matchConfirm, so the match variant here is a safety net, not a live string.
    // clinic.display_name is the ONLY clinic string used here — no front-end
    // registry, no slug-to-name table (locked decision 10-B). With no clinic in
    // the response the generic variant runs; a name is never invented.
    const clinicName = clinic && clinic.display_name ? clinic.display_name : '';
    const followText = ctx.matchMode
      ? t.followUpMatch
      : (clinicName
          ? t.followUpClinic.replace('{clinic}', clinicName)
          : t.followUpClinicGeneric);
    showModalOutcome(followText);
  }

  // --- Fallback mailto ---
  function fallbackMailto(payload) {
    let body = '';
    for (const [key, value] of Object.entries(payload)) {
      if (value) body += `${key}: ${value}\n`;
    }
    const subject = 'HPA Lead (fallback) — ' + (payload.name || 'Unknown');
    const mailtoLink = `mailto:${HPA_PATIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  }

  // --- Close modal on Escape ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (leadModal && leadModal.classList.contains('show')) {
        closeLeadModal();
      } else if (navMenu.classList.contains('open')) {
        toggleMenu(false);
      } else if (document.querySelector('.nav-item.has-children.open')) {
        closeAllDropdowns();
      }
    }
  });

});
