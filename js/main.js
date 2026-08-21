/* ============================================
   Harmony Pain Alliance — Main JavaScript v5.0
   Hamburger menu, language switching,
   FAQ accordion, lead capture, form handling
   ============================================ */

/* --- Clinic Configuration (add new clinics here) --- */
const HPA_CLINICS = {
  "lei-acupuncture": {
    id: "lei-acupuncture",
    name: { en: "Lei's Acupuncture", es: "Lei's Acupuncture", zh: "Lei's Acupuncture（磊氏针灸）" },
    city: "Winter Garden",
    state: "FL",
    address: "209 E Bay St, Winter Garden, FL 34787",
    phone: "561-403-6485",
    booking_type: "janeapp",
    booking_url: "https://leisacupuncture.janeapp.com",
    is_default: true,
    is_founding: true
  }
  // Future clinics: just add another entry here
};

const HPA_API_URL = '/api/lead';
const HPA_FALLBACK_EMAIL = 'founder@harmonypainalliance.com';

function getDefaultClinic() {
  return Object.values(HPA_CLINICS).find(c => c.is_default) || Object.values(HPA_CLINICS)[0];
}

function getClinic(id) {
  return HPA_CLINICS[id] || getDefaultClinic();
}

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
    mail.href = 'mailto:' + HPA_FALLBACK_EMAIL;
    mail.textContent = HPA_FALLBACK_EMAIL;
    p2.appendChild(mail);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline';
    btn.textContent = t.copy;
    btn.addEventListener('click', () => {
      const done = () => { btn.textContent = t.copied; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(done).catch(() => {
          window.prompt(HPA_FALLBACK_EMAIL, body);
        });
      } else {
        window.prompt(HPA_FALLBACK_EMAIL, body);
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
      const mailtoLink = `mailto:${HPA_FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

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
    leadClinic.value = clinicId || getDefaultClinic().id;
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

  // --- Booking Form (#bookingForm) also submits to Worker ---
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(bookingForm);
      const clinic = getClinic(bookingForm.dataset.clinic);
      const payload = {
        name: (fd.get('first_name') || '') + ' ' + (fd.get('last_name') || ''),
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        language: fd.get('language') || '',
        first_visit: fd.get('first_visit') || '',
        source_button: bookingForm.dataset.leadSource || 'booking-form',
        target_clinic: clinic.id,
        page_language: getLang()
      };
      submitLead(payload, clinic);
    });
  }

  // --- Lead Form submission ---
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      leadSubmitBtn.classList.add('loading');
      const fd = new FormData(leadForm);
      const clinic = getClinic(fd.get('target_clinic'));
      const payload = {};
      for (const [key, value] of fd.entries()) {
        if (value) payload[key] = value;
      }
      payload.page_language = getLang();
      submitLead(payload, clinic);
    });
  }

  // --- Submit lead to Worker API ---
  async function submitLead(payload, clinic) {
    const bookingUrl = clinic.booking_url;
    const isPhoneOnly = clinic.booking_type === 'phone-only';

    try {
      const resp = await fetch(HPA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error('API error ' + resp.status);

      // Success — show confirmation, then redirect
      if (leadModal.classList.contains('show')) {
        leadForm.style.display = 'none';
        leadSuccess.style.display = '';
        setTimeout(() => {
          if (!isPhoneOnly) {
            window.open(bookingUrl, '_blank');
          }
          closeLeadModal();
        }, 1500);
      } else {
        // From bookingForm inline
        if (!isPhoneOnly) {
          window.open(bookingUrl, '_blank');
        }
      }
    } catch (err) {
      console.warn('Lead API failed, using fallback:', err);
      // Fallback: mailto + direct redirect
      fallbackMailto(payload);
      if (!isPhoneOnly) {
        window.open(bookingUrl, '_blank');
      }
      if (leadModal.classList.contains('show')) {
        closeLeadModal();
      }
    }

    leadSubmitBtn.classList.remove('loading');
  }

  // --- Fallback mailto ---
  function fallbackMailto(payload) {
    let body = '';
    for (const [key, value] of Object.entries(payload)) {
      if (value) body += `${key}: ${value}\n`;
    }
    const subject = 'HPA Lead (fallback) — ' + (payload.name || 'Unknown');
    const mailtoLink = `mailto:${HPA_FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
