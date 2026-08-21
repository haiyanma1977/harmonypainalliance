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
const HPA_CONNECT_I18N = {
  en: {
    concernRequired: 'Please select your primary concern so we can match you with the right clinic.',
    followUp: "Thank you — we've received your request. HPA will contact you to help you find the right clinic.",
    failure: "Sorry — our system couldn't submit your request just now. Please try again in a few minutes, or email us directly at " + HPA_PATIENT_EMAIL + " (an email draft may have opened for you).",
    clinicContact: 'Thank you — the clinic will contact you directly to arrange your visit. You can also reach them at:',
    fieldError: 'Please check this field and try again.'
  },
  es: {
    concernRequired: 'Seleccione su principal problema de salud para que podamos conectarle con la clínica adecuada.',
    followUp: 'Gracias — hemos recibido su solicitud. HPA se pondrá en contacto con usted para ayudarle a encontrar la clínica adecuada.',
    failure: 'Lo sentimos — nuestro sistema no pudo enviar su solicitud en este momento. Inténtelo de nuevo en unos minutos, o escríbanos directamente a ' + HPA_PATIENT_EMAIL + ' (es posible que se haya abierto un borrador de correo para usted).',
    clinicContact: 'Gracias — la clínica se pondrá en contacto con usted directamente para coordinar su visita. También puede llamar directamente a la clínica al:',
    fieldError: 'Revise este campo e inténtelo de nuevo.'
  },
  zh: {
    concernRequired: '请选择您的主要健康问题，以便我们为您匹配合适的诊所。',
    followUp: '感谢您的提交。HPA 将与您联系，帮助您找到合适的诊所。',
    failure: '抱歉，系统暂时无法提交您的请求。请几分钟后重试，或直接发送邮件至 ' + HPA_PATIENT_EMAIL + '（您的邮件应用中可能已为您打开一封草稿）。',
    clinicContact: '感谢您的提交，诊所将直接与您联系安排就诊。您也可以致电诊所：',
    fieldError: '请检查此项内容后重新提交。'
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
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  });

  // --- Smooth Scroll (skip lead-source buttons) ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      if (anchor.dataset.leadSource) return; // handled by lead modal
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', anchor.getAttribute('href'));
      }
    });
  });

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
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
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

  // Stage 2a state + message helpers -----------------------------------
  let leadIsMatchMode = false;

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
  // (#bookingForm splits name into first_name/last_name.)
  const connectFieldEl = (form, field) => {
    let el = form.querySelector('[name="' + field + '"]');
    if (!el && field === 'name') el = form.querySelector('[name="first_name"]');
    return el;
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
  //  ALLOWED_CONCERNS exactly: post-stroke-neuro | chronic-complex-pain |
  //  other-health-concern | not-sure. STAGE 1: target_clinic is still sent, so
  //  this is Request Appointment mode. Stage 2a switches Find Care to the
  //  Worker's existing Get Matched mode by omitting target_clinic.
  const openLeadModal = (source, clinicId, concern) => {
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
    leadForm.style.display = '';
    leadSuccess.style.display = 'none';
    leadForm.reset();
    leadOptional.classList.remove('show');
    leadExpandBtn.classList.remove('expanded');
    leadSubmitBtn.classList.remove('loading');
    if (concern) {
      const sel = leadForm.querySelector('select[name="primary_concern"]');
      if (sel && Array.from(sel.options).some(o => o.value === concern)) {
        sel.value = concern;
        leadOptional.classList.add('show');
        leadExpandBtn.classList.add('expanded');
      }
    }
    leadOverlay.classList.add('show');
    leadModal.classList.add('show');
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
    // Skip the bookingForm (it has its own submit handler)
    if (btn.tagName === 'FORM') return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openLeadModal(btn.dataset.leadSource, btn.dataset.clinic, btn.dataset.concern);
    });
  });

  // --- Booking Form (#bookingForm) — always Request Appointment mode ---
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearConnectMessages(bookingForm.parentElement);
      const fd = new FormData(bookingForm);
      const payload = {
        name: ((fd.get('first_name') || '') + ' ' + (fd.get('last_name') || '')).trim(),
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        language: fd.get('language') || '',
        first_visit: fd.get('first_visit') || '',
        source_button: bookingForm.dataset.leadSource || 'booking-form',
        // Clinic-scoped: the slug from the markup, passed through verbatim.
        // The Worker validates it (422 on unknown) — no client-side default.
        target_clinic: bookingForm.dataset.clinic || '',
        page_language: getLang(),
        source_page: location.pathname
      };
      submitLead(payload, { form: bookingForm, inModal: false });
    });
  }

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

      // GET MATCHED: primary_concern is required (front-end rule; the
      // Worker deliberately accepts an absent concern, so this must live
      // here). Never enforced in Request Appointment mode.
      if (leadIsMatchMode && !payload.primary_concern) {
        leadOptional.classList.add('show');
        leadExpandBtn.classList.add('expanded');
        const sel = leadForm.querySelector('select[name="primary_concern"]');
        const group = sel ? sel.closest('.form-group') : null;
        showConnectMessage(group || sel, connectT().concernRequired, 'error');
        if (sel) sel.focus();
        return;
      }

      leadSubmitBtn.classList.add('loading');
      submitLead(payload, { form: leadForm, inModal: true });
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
      // No auto-close: the patient should read the outcome.
    };

    const showFailure = () => {
      // Lead NOT durably stored: honest failure, no redirect (10-B).
      if (ctx.inModal) {
        showConnectMessage(leadSubmitBtn.parentElement, t.failure, 'error');
      } else {
        showConnectMessage(ctx.form, t.failure, 'error');
      }
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
        leadExpandBtn.classList.add('expanded');
      }
      const group = el ? (el.closest('.form-group') || el) : null;
      showConnectMessage(group || (ctx.inModal ? leadSubmitBtn.parentElement : form),
        t.fieldError, 'error');
      if (el) el.focus();
      return;
    }

    if (!resp.ok || !data || data.ok !== true) {
      showFailure();
      return;
    }

    // Stored. Branch on the Worker's authoritative next_step.
    const nextStep = data.next_step;
    const clinic = data.clinic || null;

    if (nextStep === 'booking' && clinic && clinic.redirect_url) {
      if (ctx.inModal) {
        // Keep the page's own localized "redirecting…" success text.
        leadForm.style.display = 'none';
        leadSuccess.style.display = '';
        setTimeout(() => {
          window.open(clinic.redirect_url, '_blank');
          closeLeadModal();
        }, 1500);
      } else {
        window.open(clinic.redirect_url, '_blank');
      }
      return;
    }

    if (nextStep === 'clinic_will_contact') {
      const text = t.clinicContact + (clinic && clinic.phone ? ' ' + clinic.phone : '');
      if (ctx.inModal) showModalOutcome(text);
      else showConnectMessage(ctx.form, text, 'info');
      return;
    }

    // hpa_will_follow_up (clinic: null) — and any stored-but-unroutable
    // shape defaults here rather than faking a booking.
    if (ctx.inModal) showModalOutcome(t.followUp);
    else showConnectMessage(ctx.form, t.followUp, 'info');
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
