// ---------- mobile nav ----------
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');

navToggle.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- scroll reveal ----------
// Stagger siblings that reveal together (e.g. cards in a grid, rows in a list)
document.querySelectorAll('.spec-grid, .teaser-grid, .process-list, .stack-sheet').forEach(group => {
  Array.from(group.children).forEach((child, i) => {
    if (child.classList.contains('reveal')) {
      child.style.setProperty('--d', `${Math.min(i * 0.08, 0.4)}s`);
    }
  });
});

const revealTargets = document.querySelectorAll('.reveal, .section-head');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach(el => io.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('in-view'));
}

// Hero elements should reveal on load, not on scroll (they're already in view)
document.querySelectorAll('.hero .reveal, .page-header .reveal, .contact-intro.reveal, .work-order.reveal').forEach((el, i) => {
  el.style.setProperty('--d', `${i * 0.1}s`);
});

// ---------- contact form: real REST API call ----------
const form = document.getElementById('workOrderForm');
if (form) {
  const btn = form.querySelector('.wo-submit');
  const status = document.getElementById('woStatus');
  const woId = document.getElementById('woId');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      name: form.name.value.trim(),
      business: form.business.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };

    if (!data.name || !data.email || !data.message) {
      showStatus('error', 'Name, email and a message about the project are required.');
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;
    showStatus('', '');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Something went wrong sending that.');
      }

      const result = await res.json();
      woId.textContent = result.id ? `#WO-${String(result.id).padStart(4, '0')}` : 'RECEIVED';
      showStatus('success', "Work order received — we'll reply by email shortly.");
      form.reset();
    } catch (err) {
      showStatus('error', err.message || 'Could not send that just now. Try the email link instead.');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  function showStatus(kind, message) {
    status.textContent = message;
    status.className = 'wo-status' + (kind ? ` show ${kind}` : '');
  }
}

// ---------- admin: token-gated enquiry log ----------
const adminGate = document.getElementById('adminGate');
if (adminGate) {
  const tokenInput = document.getElementById('adminToken');
  const unlockBtn = document.getElementById('adminUnlock');
  const log = document.getElementById('adminLog');
  const table = document.getElementById('adminTable');
  const count = document.getElementById('adminCount');
  const refreshBtn = document.getElementById('adminRefresh');

  const saved = sessionStorage.getItem('pc_admin_token');
  if (saved) {
    tokenInput.value = saved;
    unlock();
  }

  unlockBtn.addEventListener('click', unlock);
  tokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
  refreshBtn?.addEventListener('click', () => loadEnquiries(tokenInput.value.trim()));

  async function unlock() {
    const token = tokenInput.value.trim();
    if (!token) return;
    const ok = await loadEnquiries(token);
    if (ok) {
      sessionStorage.setItem('pc_admin_token', token);
      adminGate.hidden = true;
      log.hidden = false;
    }
  }

  async function loadEnquiries(token) {
    table.innerHTML = '<div class="stack-row"><span>Loading…</span></div>';
    try {
      const res = await fetch('/api/enquiries', {
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token.' : 'Could not load enquiries.');
      const rows = await res.json();
      renderTable(rows);
      count.textContent = `${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'}`;
      return true;
    } catch (err) {
      table.innerHTML = `<div class="stack-row"><span>${err.message}</span></div>`;
      return false;
    }
  }

  function renderTable(rows) {
    table.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'stack-row stack-row-head';
    head.innerHTML = '<span>Name</span><span>Contact</span><span>Message</span><span>Status</span><span></span>';
    table.appendChild(head);

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'stack-row';
      empty.innerHTML = '<span>No enquiries yet.</span>';
      table.appendChild(empty);
      return;
    }

    rows.forEach(row => {
      const el = document.createElement('div');
      el.className = 'stack-row';
      const contact = [row.email, row.phone].filter(Boolean).join(' · ');
      const nextStatus = row.status === 'handled' ? 'new' : 'handled';
      el.innerHTML = `
        <span>${escapeHtml(row.name)}${row.business ? `<br><span style="color:var(--ink-dim);font-size:0.8em;">${escapeHtml(row.business)}</span>` : ''}</span>
        <span>${escapeHtml(contact)}</span>
        <span>${escapeHtml(row.message)}</span>
        <span><span class="status-pill ${row.status}">${row.status}</span></span>
        <span><button class="admin-row-btn" data-id="${row.id}" data-next="${nextStatus}">Mark ${nextStatus}</button></span>
      `;
      table.appendChild(el);
    });

    table.querySelectorAll('.admin-row-btn').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const next = b.dataset.next;
        b.disabled = true;
        try {
          await fetch(`/api/enquiries/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': tokenInput.value.trim() },
            body: JSON.stringify({ status: next }),
          });
          loadEnquiries(tokenInput.value.trim());
        } catch {
          b.disabled = false;
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}
