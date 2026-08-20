(() => {
  const cfg = window.ESIM_CONFIG || {};

  const FALLBACK = [
    {id:'d1', type:'data', label:'1GB', duration:'3 أيام', price:0.200, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], featured:false, best_value:false, sort_order:10, active:true},
    {id:'d2', type:'data', label:'3GB', duration:'شهر كامل', price:0.900, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], featured:false, best_value:false, sort_order:20, active:true},
    {id:'d3', type:'data', label:'5GB', duration:'15 يوم', price:1.100, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], featured:false, best_value:false, sort_order:30, active:true},
    {id:'d4', type:'data', label:'5GB', duration:'30 يوم', price:1.500, tagline:'بداية اقتصادية', perks:['يكفي للاستخدام اليومي','تفعيل سريع','دعم طوال المدة'], featured:true, best_value:false, sort_order:40, active:true},
    {id:'d5', type:'data', label:'10GB', duration:'30 يوم', price:2.500, tagline:'الأكثر طلباً', perks:['أفضل قيمة مقابل السعر','مناسبة للتصفح والتطبيقات','دعم طوال المدة'], featured:true, best_value:true, sort_order:50, active:true},
    {id:'d6', type:'data', label:'20GB', duration:'شهر كامل', price:4.100, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], featured:false, best_value:false, sort_order:60, active:true},
    {id:'u1', type:'unlimited', label:'غير محدود', duration:'يوم واحد', price:0.500, tagline:'', perks:['إنترنت غير محدود','تفعيل سريع'], featured:false, best_value:false, sort_order:70, active:true},
    {id:'u2', type:'unlimited', label:'غير محدود', duration:'14 يوم', price:6.100, tagline:'', perks:['إنترنت غير محدود','استخدام مكثف'], featured:false, best_value:false, sort_order:80, active:true},
    {id:'u3', type:'unlimited', label:'غير محدود', duration:'30 يوم', price:10.500, tagline:'بلا حدود', perks:['إنترنت غير محدود بالكامل','مثالية للاستخدام المكثف','دعم طوال المدة'], featured:true, best_value:false, sort_order:90, active:true}
  ];

  let whatsapp = String(cfg.DEFAULT_WHATSAPP_NUMBER || '96876746977').replace(/\D/g,'');
  let transferNumber = '91772654';
  let packages = FALLBACK;
  let supabaseClient = null;

  function configured(){
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  }

  if(configured()){
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function money(v){ return Number(v).toFixed(3); }

  function waLink(text='مرحبًا 👋، أبغى أعرف أكثر عن خدمات eSIM.OM.'){
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function pkgMessage(p){
    return `مرحبًا 👋
أرغب في طلب باقة eSIM:
📶 ${p.label} | ${p.duration} | ${money(p.price)} ر.ع

💳 التحويل عبر بنك مسقط
📱 رقم التحويل: ${transferNumber}

يرجى تأكيد الطلب وإرسال خطوات التفعيل. شكرًا لكم.`;
  }

  function setWhatsAppLinks(){
    document.querySelectorAll('.js-generic-wa').forEach(a => a.href = waLink());
  }

  function card(p){
    const perks = Array.isArray(p.perks) ? p.perks : [];
    const badge = p.best_value ? '<span class="best-badge">★ الأكثر طلباً</span>' : '';
    const label = p.best_value ? 'أفضل قيمة' : (p.tagline || (p.type==='unlimited' ? 'بلا حدود' : 'باقة مختارة'));

    return `<article class="package-card ${p.best_value ? 'best-value' : ''}">
      ${badge}
      <div class="package-label">${escapeHtml(label)}</div>
      <h3>${escapeHtml(p.label)}</h3>
      <p>${escapeHtml(p.duration)}</p>
      <div class="price"><b>${money(p.price)}</b><span>ر.ع</span></div>
      <ul>${perks.map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join('')}</ul>
      <a class="btn btn-block" href="${waLink(pkgMessage(p))}" target="_blank" rel="noopener">اطلب الباقة</a>
    </article>`;
  }

  function row(p){
    return `<article class="package-row">
      <div><b>${escapeHtml(p.label)}</b><span>${escapeHtml(p.duration)}</span></div>
      <div><strong>${money(p.price)} ر.ع</strong><a href="${waLink(pkgMessage(p))}" target="_blank" rel="noopener">اطلب</a></div>
    </article>`;
  }

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>'"]/g, c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  }

  function render(){
    const active = packages
      .filter(p=>p.active!==false)
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    const featured = active.filter(p=>p.featured).slice(0,3);
    const best = featured.find(p=>p.best_value) || active.find(p=>p.best_value && p.featured);

    let ordered = [...featured];
    if(best && ordered.includes(best)){
      ordered = ordered.filter(p=>p!==best);
      ordered = [ordered[0], best, ordered[1]].filter(Boolean);
    }

    const featuredGrid = document.getElementById('featuredGrid');
    const dataGrid = document.getElementById('dataGrid');
    const unlimitedGrid = document.getElementById('unlimitedGrid');

    if(featuredGrid){
      featuredGrid.innerHTML = ordered.length
        ? ordered.map(card).join('')
        : '<div class="micro-note">لا توجد باقات مميزة حالياً.</div>';
    }

    if(dataGrid){
      dataGrid.innerHTML = active.filter(p=>p.type==='data').map(row).join('');
    }

    if(unlimitedGrid){
      unlimitedGrid.innerHTML = active.filter(p=>p.type==='unlimited').map(row).join('');
    }

    setWhatsAppLinks();
  }

  async function loadRemote(){
    if(!supabaseClient){
      render();
      return;
    }

    try{
      const [{data:p,error:pe},{data:s,error:se}] = await Promise.all([
        supabaseClient.from('packages').select('*').order('sort_order',{ascending:true}),
        supabaseClient.from('site_settings').select('*')
      ]);

      if(!pe && Array.isArray(p) && p.length){
        packages = p;
      }

      if(!se && Array.isArray(s)){
        const wa = s.find(x=>x.key==='whatsapp_number');
        const transfer = s.find(x=>x.key==='bank_transfer_number');

        if(wa?.value) whatsapp = String(wa.value).replace(/\D/g,'');
        if(transfer?.value) transferNumber = String(transfer.value).replace(/\D/g,'');
      }
    }catch(e){
      console.warn('Using local fallback data.', e);
    }

    render();
  }

  document.querySelectorAll('.segment').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.segment').forEach(b=>{
      b.classList.toggle('active',b===btn);
      b.setAttribute('aria-selected',b===btn?'true':'false');
    });

    document.querySelectorAll('.package-list').forEach(p=>{
      p.classList.toggle('active',p.dataset.panel===btn.dataset.tab);
    });
  }));

  document.querySelectorAll('.service-filter').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.service-filter').forEach(b=>b.classList.toggle('active',b===btn));
    const filter = btn.dataset.serviceFilter;

    document.querySelectorAll('[data-service]').forEach(card=>{
      card.style.display = (filter==='all' || card.dataset.service===filter) ? 'flex' : 'none';
    });
  }));

  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');

  menuToggle?.addEventListener('click',()=>{
    const open = mobileNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded',open?'true':'false');
  });

  mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobileNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded','false');
  }));

  const root = document.documentElement;
  const savedTheme = localStorage.getItem('esim-theme');

  if(savedTheme==='light' || savedTheme==='dark'){
    root.dataset.theme = savedTheme;
  }

  document.getElementById('themeToggle')?.addEventListener('click',()=>{
    const next = root.dataset.theme==='light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('esim-theme',next);
  });

  loadRemote();
})();
