(() => {
  const cfg = window.ESIM_CONFIG || {};
  const configured = Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.ADMIN_EMAIL &&
    window.supabase
  );

  const sb = configured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let packages = [];
  let whatsapp = cfg.DEFAULT_WHATSAPP_NUMBER || '';
  let currentView = 'overview';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const loginView = $('#loginView');
  const dashboardView = $('#dashboardView');
  const setupWarning = $('#setupWarning');
  const dialog = $('#packageDialog');

  setupWarning.hidden = configured;

  const viewMeta = {
    overview: ['Dashboard', 'نظرة عامة'],
    packages: ['Packages', 'إدارة الباقات'],
    settings: ['Settings', 'الإعدادات']
  };

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  }

  function money(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3) : '0.000';
  }

  function msg(el, text = '', type = '') {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message' + (type ? ` ${type}` : '');
  }

  function toast(text, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = text;
    $('#toastStack').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function setBusy(btn, busy, busyText = 'جاري الحفظ...') {
    if (!btn) return;
    if (busy) {
      btn.dataset.original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = busyText;
      btn.style.opacity = '.7';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.original || btn.innerHTML;
      btn.style.opacity = '';
    }
  }

  // ---------- THEME ----------
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('esim-admin-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

  function updateThemeButtons() {
    const icon = root.dataset.theme === 'light' ? '☀' : '☾';
    ['#themeBtn', '#loginThemeBtn'].forEach(id => {
      const el = $(id);
      if (el) el.textContent = icon;
    });
  }

  function toggleTheme() {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('esim-admin-theme', root.dataset.theme);
    updateThemeButtons();
  }

  $('#themeBtn')?.addEventListener('click', toggleTheme);
  $('#loginThemeBtn')?.addEventListener('click', toggleTheme);
  updateThemeButtons();

  // ---------- AUTH ----------
  async function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    $('#adminEmailText').textContent = cfg.ADMIN_EMAIL;
    $('#systemAdminEmail').textContent = cfg.ADMIN_EMAIL;
    await loadAll();
  }

  async function checkSession() {
    if (!sb) return;
    const { data, error } = await sb.auth.getSession();
    if (error) return;
    if (data.session) showDashboard();
  }

  $('#togglePassword')?.addEventListener('click', () => {
    const input = $('#password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    if (!sb) {
      msg($('#loginMessage'), 'Supabase غير مربوط. تحقق من config.js.', 'error');
      return;
    }

    const btn = $('#loginBtn');
    setBusy(btn, true, 'جاري التحقق...');
    msg($('#loginMessage'), '');

    const { error } = await sb.auth.signInWithPassword({
      email: cfg.ADMIN_EMAIL,
      password: $('#password').value
    });

    if (error) {
      setBusy(btn, false);
      msg($('#loginMessage'), 'كلمة المرور غير صحيحة أو الحساب غير مكتمل.', 'error');
      return;
    }

    msg($('#loginMessage'), 'تم تسجيل الدخول بنجاح.', 'success');
    setBusy(btn, false);
    await showDashboard();
  });

  $('#logoutBtn')?.addEventListener('click', async () => {
    await sb?.auth.signOut();
    location.reload();
  });

  // ---------- LOAD ----------
  async function loadAll() {
    await Promise.all([loadPackages(), loadSettings()]);
    renderEverything();
  }

  async function loadPackages() {
    if (!sb) return;
    const { data, error } = await sb
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast(`تعذر تحميل الباقات: ${error.message}`, 'error');
      return;
    }

    packages = Array.isArray(data) ? data : [];
  }

  async function loadSettings() {
    if (!sb) return;
    const { data, error } = await sb.from('site_settings').select('*');

    if (error) {
      toast(`تعذر تحميل الإعدادات: ${error.message}`, 'error');
      return;
    }

    const wa = (data || []).find(x => x.key === 'whatsapp_number');
    whatsapp = wa?.value || cfg.DEFAULT_WHATSAPP_NUMBER || '';
    $('#whatsappSetting').value = whatsapp;
  }

  $('#refreshBtn')?.addEventListener('click', async () => {
    const btn = $('#refreshBtn');
    btn.style.transform = 'rotate(180deg)';
    await loadAll();
    setTimeout(() => btn.style.transform = '', 250);
    toast('تم تحديث البيانات.');
  });

  // ---------- NAV ----------
  function switchView(view) {
    if (!viewMeta[view]) return;
    currentView = view;

    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $$('.view').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));

    $('#pageEyebrow').textContent = viewMeta[view][0];
    $('#pageTitle').textContent = viewMeta[view][1];

    closeSidebar();
  }

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  $$('[data-jump-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.jumpView));
  });

  // ---------- SIDEBAR MOBILE ----------
  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#sidebarBackdrop').classList.add('show');
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebarBackdrop').classList.remove('show');
  }

  $('#sidebarOpen')?.addEventListener('click', openSidebar);
  $('#sidebarClose')?.addEventListener('click', closeSidebar);
  $('#sidebarBackdrop')?.addEventListener('click', closeSidebar);

  // ---------- RENDER ----------
  function renderEverything() {
    renderStats();
    renderFeaturedPreview();
    renderPackageList();
  }

  function renderStats() {
    $('#countAll').textContent = packages.length;
    $('#countActive').textContent = packages.filter(p => p.active).length;
    $('#countFeatured').textContent = packages.filter(p => p.featured).length;
    $('#countUnlimited').textContent = packages.filter(p => p.type === 'unlimited').length;
    $('#sidebarPackageCount').textContent = packages.length;
  }

  function renderFeaturedPreview() {
    const list = packages
      .filter(p => p.featured)
      .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0,3);

    $('#featuredPreview').innerHTML = list.length
      ? list.map(p => `
          <article class="mini-featured ${p.best_value ? 'best' : ''}">
            ${p.best_value ? '<span class="star">★</span>' : ''}
            <span>${esc(p.tagline || (p.type === 'unlimited' ? 'غير محدود' : 'باقة مميزة'))}</span>
            <b>${esc(p.label)}</b>
            <strong>${money(p.price)} ر.ع</strong>
          </article>
        `).join('')
      : '<div class="empty-state"><b>لا توجد باقات مميزة</b><span>اختر حتى 3 باقات كـ الأكثر طلباً.</span></div>';
  }

  function filteredPackages() {
    const q = ($('#packageSearch')?.value || '').trim().toLowerCase();
    const type = $('#typeFilter')?.value || 'all';
    const status = $('#statusFilter')?.value || 'all';
    const sort = $('#sortFilter')?.value || 'sort';

    let list = [...packages];

    if (q) {
      list = list.filter(p =>
        [p.label, p.duration, p.tagline, ...(Array.isArray(p.perks) ? p.perks : [])]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (type !== 'all') list = list.filter(p => p.type === type);

    if (status === 'active') list = list.filter(p => p.active);
    if (status === 'inactive') list = list.filter(p => !p.active);
    if (status === 'featured') list = list.filter(p => p.featured);

    if (sort === 'price-asc') list.sort((a,b) => Number(a.price) - Number(b.price));
    else if (sort === 'price-desc') list.sort((a,b) => Number(b.price) - Number(a.price));
    else if (sort === 'name') list.sort((a,b) => String(a.label).localeCompare(String(b.label), 'ar'));
    else list.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

    return list;
  }

  function renderPackageList() {
    const list = filteredPackages();
    $('#resultsCount').textContent = `${list.length} باقة`;

    $('#adminPackageList').innerHTML = list.length
      ? list.map(p => `
        <article class="package-row-admin" data-id="${esc(p.id)}">
          <div class="pkg-main">
            <div class="pkg-avatar">${p.type === 'unlimited' ? '∞' : esc(p.label)}</div>
            <div class="pkg-info">
              <b>${esc(p.label)} ${p.best_value ? '⭐' : ''}</b>
              <span>${esc(p.duration)}${p.tagline ? ` • ${esc(p.tagline)}` : ''}</span>
            </div>
          </div>

          <div class="pkg-price">${money(p.price)} ر.ع</div>

          <div>
            <button class="status-pill ${p.active ? 'active' : 'inactive'}" data-action="toggle-active" data-id="${esc(p.id)}">
              ${p.active ? '● نشطة' : '○ مخفية'}
            </button>
          </div>

          <div>
            ${p.best_value
              ? `<button class="feature-pill best" data-action="unset-best" data-id="${esc(p.id)}">★ الأفضل قيمة</button>`
              : p.featured
                ? `<button class="feature-pill featured" data-action="toggle-featured" data-id="${esc(p.id)}">★ الأكثر طلباً</button>`
                : `<button class="feature-pill" data-action="toggle-featured" data-id="${esc(p.id)}">＋ تمييز</button>`
            }
          </div>

          <div class="row-actions">
            ${!p.best_value ? `<button class="mini-action" data-action="set-best" data-id="${esc(p.id)}">أفضل قيمة</button>` : ''}
            <button class="mini-action" data-action="duplicate" data-id="${esc(p.id)}">نسخ</button>
            <button class="mini-action" data-action="edit" data-id="${esc(p.id)}">تعديل</button>
            <button class="mini-action danger" data-action="delete" data-id="${esc(p.id)}">حذف</button>
          </div>
        </article>
      `).join('')
      : '<div class="empty-state"><b>لا توجد نتائج</b><span>جرّب تغيير البحث أو الفلاتر.</span></div>';
  }

  ['#packageSearch', '#typeFilter', '#statusFilter', '#sortFilter'].forEach(sel => {
    $(sel)?.addEventListener(sel === '#packageSearch' ? 'input' : 'change', renderPackageList);
  });

  // ---------- QUICK ACTIONS ----------
  function openNewPackage() {
    switchView('packages');
    openDialog();
  }

  ['#topAddPackageBtn', '#heroAddPackageBtn', '#quickAddBtn', '#newPackageBtn'].forEach(sel => {
    $(sel)?.addEventListener('click', openNewPackage);
  });

  $('#exportBtn')?.addEventListener('click', () => {
    const payload = {
      exported_at: new Date().toISOString(),
      whatsapp_number: whatsapp,
      packages
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esim-oman-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تنزيل النسخة الاحتياطية.');
  });

  // ---------- PACKAGE ACTIONS ----------
  $('#adminPackageList')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = btn.dataset.id;
    const p = packages.find(x => x.id === id);
    if (!p) return;

    const action = btn.dataset.action;

    if (action === 'edit') openDialog(p);
    if (action === 'delete') await deletePackage(p);
    if (action === 'duplicate') await duplicatePackage(p);
    if (action === 'toggle-active') await updateOne(p.id, { active: !p.active }, 'تم تحديث حالة الباقة.');
    if (action === 'toggle-featured') await toggleFeatured(p);
    if (action === 'set-best') await setBestValue(p);
    if (action === 'unset-best') await updateOne(p.id, { best_value: false }, 'تم إلغاء الأفضل قيمة.');
  });

  async function updateOne(id, payload, successText) {
    const { error } = await sb.from('packages').update(payload).eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return false;
    }
    await loadPackages();
    renderEverything();
    toast(successText);
    return true;
  }

  async function toggleFeatured(p) {
    if (!p.featured && packages.filter(x => x.featured && x.id !== p.id).length >= 3) {
      toast('يمكن اختيار 3 باقات فقط ضمن الأكثر طلباً.', 'error');
      return;
    }

    const nextFeatured = !p.featured;
    const payload = {
      featured: nextFeatured,
      best_value: nextFeatured ? p.best_value : false
    };
    await updateOne(p.id, payload, nextFeatured ? 'تمت إضافة الباقة للأكثر طلباً.' : 'تمت إزالة الباقة من الأكثر طلباً.');
  }

  async function setBestValue(p) {
    const featuredCountWithout = packages.filter(x => x.featured && x.id !== p.id).length;
    if (!p.featured && featuredCountWithout >= 3) {
      toast('لكي تصبح الأفضل قيمة يجب أن تكون ضمن الأكثر طلباً. أزل باقة مميزة أولاً.', 'error');
      return;
    }

    const { error: resetError } = await sb
      .from('packages')
      .update({ best_value: false })
      .neq('id', p.id);

    if (resetError) {
      toast(resetError.message, 'error');
      return;
    }

    const { error } = await sb
      .from('packages')
      .update({ best_value: true, featured: true })
      .eq('id', p.id);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    await loadPackages();
    renderEverything();
    toast('تم تحديد الباقة كأفضل قيمة.');
  }

  async function duplicatePackage(p) {
    const payload = {
      type: p.type,
      label: `${p.label}`,
      duration: p.duration,
      price: Number(p.price),
      tagline: p.tagline ? `${p.tagline} - نسخة` : 'نسخة',
      perks: Array.isArray(p.perks) ? p.perks : [],
      featured: false,
      best_value: false,
      sort_order: Number(p.sort_order || 100) + 1,
      active: false
    };

    const { error } = await sb.from('packages').insert(payload);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    await loadPackages();
    renderEverything();
    toast('تم إنشاء نسخة من الباقة وهي مخفية حالياً.');
  }

  async function deletePackage(p) {
    const ok = confirm(`هل تريد حذف باقة "${p.label}" نهائياً؟`);
    if (!ok) return;

    const { error } = await sb.from('packages').delete().eq('id', p.id);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    await loadPackages();
    renderEverything();
    toast('تم حذف الباقة.');
  }

  // ---------- DIALOG ----------
  function openDialog(p = null) {
    $('#dialogTitle').textContent = p ? 'تعديل الباقة' : 'إضافة باقة جديدة';
    $('#pkgId').value = p?.id || '';
    $('#pkgType').value = p?.type || 'data';
    $('#pkgLabel').value = p?.label || '';
    $('#pkgDuration').value = p?.duration || '';
    $('#pkgPrice').value = p ? money(p.price) : '';
    $('#pkgTagline').value = p?.tagline || '';
    $('#pkgPerks').value = Array.isArray(p?.perks) ? p.perks.join('\n') : '';
    $('#pkgSort').value = p?.sort_order ?? nextSortOrder();
    $('#pkgActive').checked = p?.active ?? true;
    $('#pkgFeatured').checked = p?.featured ?? false;
    $('#pkgBest').checked = p?.best_value ?? false;

    msg($('#packageMessage'));
    updatePreview();

    dialog.showModal();
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  function nextSortOrder() {
    const max = packages.reduce((m,p) => Math.max(m, Number(p.sort_order || 0)), 0);
    return max + 10;
  }

  $('#dialogClose')?.addEventListener('click', closeDialog);
  $('#cancelDialog')?.addEventListener('click', closeDialog);

  dialog?.addEventListener('click', e => {
    if (e.target === dialog) closeDialog();
  });

  const previewInputs = ['#pkgType','#pkgLabel','#pkgDuration','#pkgPrice','#pkgTagline','#pkgPerks','#pkgBest'];
  previewInputs.forEach(sel => $(sel)?.addEventListener('input', updatePreview));
  ['#pkgType','#pkgBest'].forEach(sel => $(sel)?.addEventListener('change', updatePreview));

  $('#pkgBest')?.addEventListener('change', e => {
    if (e.target.checked) $('#pkgFeatured').checked = true;
  });

  $('#pkgFeatured')?.addEventListener('change', e => {
    if (!e.target.checked) $('#pkgBest').checked = false;
    updatePreview();
  });

  function updatePreview() {
    const type = $('#pkgType')?.value || 'data';
    const label = $('#pkgLabel')?.value.trim() || (type === 'unlimited' ? 'غير محدود' : '10GB');
    const duration = $('#pkgDuration')?.value.trim() || '30 يوم';
    const price = money($('#pkgPrice')?.value || 0);
    const tagline = $('#pkgTagline')?.value.trim() || (type === 'unlimited' ? 'بلا حدود' : 'باقة مختارة');
    const perks = ($('#pkgPerks')?.value || '')
      .split('\n').map(x => x.trim()).filter(Boolean);
    const best = $('#pkgBest')?.checked;

    $('#previewLabel').textContent = label;
    $('#previewDuration').textContent = duration;
    $('#previewPrice').textContent = price;
    $('#previewTagline').textContent = tagline;
    $('#previewBadge').hidden = !best;
    $('#previewPerks').innerHTML = (perks.length ? perks : ['تفعيل سريع'])
      .slice(0,4).map(x => `<li>✓ ${esc(x)}</li>`).join('');
  }

  $('#packageForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const id = $('#pkgId').value;
    const payload = {
      type: $('#pkgType').value,
      label: $('#pkgLabel').value.trim(),
      duration: $('#pkgDuration').value.trim(),
      price: Number($('#pkgPrice').value),
      tagline: $('#pkgTagline').value.trim(),
      perks: $('#pkgPerks').value.split('\n').map(x => x.trim()).filter(Boolean),
      sort_order: Number($('#pkgSort').value || 100),
      active: $('#pkgActive').checked,
      featured: $('#pkgFeatured').checked,
      best_value: $('#pkgBest').checked
    };

    if (!payload.label || !payload.duration || !Number.isFinite(payload.price)) {
      msg($('#packageMessage'), 'أكمل اسم الباقة والمدة والسعر.', 'error');
      return;
    }

    if (payload.best_value) payload.featured = true;

    const featuredWithoutCurrent = packages.filter(x => x.featured && x.id !== id).length;
    if (payload.featured && featuredWithoutCurrent >= 3) {
      msg($('#packageMessage'), 'يمكن اختيار 3 باقات فقط ضمن الأكثر طلباً. أزل واحدة أولاً.', 'error');
      return;
    }

    const btn = $('#savePackageBtn');
    setBusy(btn, true);
    msg($('#packageMessage'));

    if (payload.best_value) {
      const { error: resetErr } = await sb
        .from('packages')
        .update({ best_value: false })
        .neq('id', id || '00000000-0000-0000-0000-000000000000');

      if (resetErr) {
        setBusy(btn, false);
        msg($('#packageMessage'), resetErr.message, 'error');
        return;
      }
    }

    const result = id
      ? await sb.from('packages').update(payload).eq('id', id)
      : await sb.from('packages').insert(payload);

    if (result.error) {
      setBusy(btn, false);
      msg($('#packageMessage'), result.error.message, 'error');
      return;
    }

    await loadPackages();
    renderEverything();

    setBusy(btn, false);
    msg($('#packageMessage'), id ? 'تم تحديث الباقة.' : 'تمت إضافة الباقة.', 'success');
    toast(id ? 'تم تحديث الباقة بنجاح.' : 'تمت إضافة الباقة بنجاح.');

    setTimeout(closeDialog, 400);
  });

  // ---------- SETTINGS ----------
  $('#settingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const value = $('#whatsappSetting').value.replace(/\D/g, '');
    if (!value) {
      msg($('#settingsMessage'), 'أدخل رقم واتساب.', 'error');
      return;
    }

    const btn = e.submitter;
    setBusy(btn, true);

    const { error } = await sb
      .from('site_settings')
      .upsert({ key: 'whatsapp_number', value }, { onConflict: 'key' });

    setBusy(btn, false);

    if (error) {
      msg($('#settingsMessage'), error.message, 'error');
      return;
    }

    whatsapp = value;
    msg($('#settingsMessage'), 'تم حفظ رقم واتساب.', 'success');
    toast('تم تحديث رقم واتساب في الموقع.');
  });

  checkSession();
})();
