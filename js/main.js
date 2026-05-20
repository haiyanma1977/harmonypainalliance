/* ============================================
   Harmony Pain Alliance — Main JavaScript v5.0
   Hamburger menu, language switching,
   FAQ accordion, lead capture, form handling
   ============================================ */

/* --- Clinic Configuration (add new clinics here) --- */
const HPA_CLINICS = {
  "lei-acupuncture": {
    id: "lei-acupuncture",
    name: { en: "Lei's Acupuncture", es: "Lei's Acupuncture", zh: "Lei's Acupuncture（磊医师针灸）" },
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
  const langBtns = document.querySelectorAll('.lang-switch button');
  const setLang = (lang) => {
    document.body.className = `lang-${lang}`;
    langBtns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    try { localStorage.setItem('hpa-lang', lang); } catch(e) {}
  };

  // Language detection priority:
  // 1. URL hash (?lang=en/es/zh)
  // 2. localStorage (user's previous manual choice)
  // 3. Browser language (navigator.language)
  // 4. Default: English
  const detectLang = () => {
    const hashMatch = location.hash.match(/lang=(en|es|zh)/);
    if (hashMatch) return hashMatch[1];
    const saved = (() => { try { return localStorage.getItem('hpa-lang'); } catch(e) { return null; } })();
    if (saved && ['en', 'es', 'zh'].includes(saved)) return saved;
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('zh')) return 'zh';
    return 'en';
  };
  setLang(detectLang());
  langBtns.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));

  // --- Hamburger Menu ---
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navOverlay = document.querySelector('.nav-overlay');

  const toggleMenu = (open) => {
    const isOpen = open !== undefined ? open : !navMenu.classList.contains('open');
    hamburger.classList.toggle('open', isOpen);
    navMenu.classList.toggle('open', isOpen);
    navOverlay.classList.toggle('show', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggleMenu());
  navOverlay.addEventListener('click', () => toggleMenu(false));
  navMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => toggleMenu(false));
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

  // --- Partnership Form Submission (clinic + tech forms, mailto) ---
  const handlePartnerFormSubmit = (form, subject) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      let body = '';
      for (const [key, value] of data.entries()) {
        if (value) body += `${key}: ${value}\n`;
      }
      const mailtoLink = `mailto:${HPA_FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
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
  const openLeadModal = (source, clinicId) => {
    leadSource.value = source || 'unknown';
    leadClinic.value = clinicId || getDefaultClinic().id;
    leadForm.style.display = '';
    leadSuccess.style.display = 'none';
    leadForm.reset();
    leadOptional.classList.remove('show');
    leadExpandBtn.classList.remove('expanded');
    leadSubmitBtn.classList.remove('loading');
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
      openLeadModal(btn.dataset.leadSource, btn.dataset.clinic);
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
      }
    }
  });

});
