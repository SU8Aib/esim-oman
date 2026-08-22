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
  let digitalProducts = [];
  let featuredSelection = [];
  let supabaseClient = null;

  function configured(){
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  }

  if(configured()){
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function money(v){
    const n=Number(v);
    return Number.isFinite(n) ? n.toFixed(3) : '0.000';
  }

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>'"]/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  }

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

  function serviceName(slug){
    const map={
      netflix:'Netflix',
      chatgpt:'ChatGPT',
      claude:'Claude',
      spotify:'Spotify',
      youtube:'YouTube Premium'
    };
    return map[slug] || String(slug || 'خدمة رقمية')
      .replace(/[-_]+/g,' ')
      .replace(/\b\w/g,c=>c.toUpperCase());
  }

  function digitalMessage(p){
    const service=serviceName(p.service_slug);
    const details=[
      `🎫 ${p.name}`,
      p.duration ? `⏳ المدة: ${p.duration}` : '',
      `💰 السعر: ${money(p.price)} ر.ع`,
      p.subscription_type ? `📦 النوع: ${p.subscription_type}` : '',
      p.screens ? `🖥 الأجهزة/الشاشات: ${p.screens}` : '',
      p.quality ? `✨ الجودة: ${p.quality}` : '',
      p.delivery_method ? `🚚 التسليم: ${p.delivery_method}` : '',
      p.note ? `⚠️ ملاحظة: ${p.note}` : ''
    ].filter(Boolean).join('\n');

    return `مرحبًا 👋
أرغب في طلب اشتراك ${service}:
${details}

💳 التحويل عبر بنك مسقط
📱 رقم التحويل: ${transferNumber}

يرجى تأكيد الطلب وإرسال تفاصيل الاستلام. شكرًا لكم.`;
  }

  function netflixCard(p){
    const features=Array.isArray(p.features)?p.features:[];
    const featureItems=features.filter(Boolean).slice(0,2);
    const meta=[p.subscription_type,p.quality,p.screens].filter(Boolean);

    return `<article class="netflix-product-card ${p.note ? 'has-note' : 'no-note'}">
      <div class="netflix-card-head">
        <span class="netflix-logo" aria-hidden="true">N</span>

        <div class="netflix-title-wrap">
          <h3>${escapeHtml(p.name)}</h3>

          ${meta.length?`
            <div class="netflix-meta-chips">
              ${meta.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}
            </div>
          `:''}
        </div>
      </div>

      <div class="netflix-card-content">
        ${featureItems.length?`
          <div class="netflix-feature-row">
            ${featureItems.map(x=>`
              <span class="netflix-feature-item">
                <i>✓</i>${escapeHtml(x)}
              </span>
            `).join('')}
          </div>
        `:''}

        ${p.note?`
          <div class="netflix-product-note" role="note">
            <span class="netflix-note-icon">!</span>
            <p><b>ملاحظة:</b> ${escapeHtml(p.note)}</p>
          </div>
        `:''}
      </div>

      <div class="netflix-card-bottom">
        <div class="netflix-duration-wrap">
          <small>${escapeHtml(p.duration)}</small>
        </div>

        <div class="netflix-price-wrap">
          <strong>${money(p.price)}</strong>
          <span>ر.ع</span>
        </div>

        <a class="netflix-order-btn"
           href="${waLink(digitalMessage(p))}"
           target="_blank"
           rel="noopener">اطلب</a>
      </div>
    </article>`;
  }

  function renderNetflix(){
    const grid=document.getElementById('netflixGrid');
    if(!grid) return;

    const list=digitalProducts
      .filter(p=>p.service_slug==='netflix' && p.active!==false);

    grid.innerHTML=list.length
      ? list.map(netflixCard).join('')
      : `<div class="digital-empty">
          <span class="netflix-logo">N</span>
          <div>
            <b>لا توجد اشتراكات Netflix متاحة حالياً</b>
            <p>ستظهر الاشتراكات هنا عند تفعيلها.</p>
          </div>
        </div>`;
  }

  function packageRow(p){
    return `<article class="package-row">
      <div>
        <b>${escapeHtml(p.label)}</b>
        <span>${escapeHtml(p.duration)}</span>
      </div>
      <div>
        <strong>${money(p.price)} ر.ع</strong>
        <a href="${waLink(pkgMessage(p))}" target="_blank" rel="noopener">اطلب</a>
      </div>
    </article>`;
  }

  function resolveFeatured(row){
    if(row.source_type==='esim'){
      const p=packages.find(x=>x.id===row.product_id);
      if(!p || p.active===false) return null;

      return {
        source_type:'esim',
        service:'eSIM',
        name:p.label,
        duration:p.duration,
        price:p.price,
        description:p.tagline || (p.type==='unlimited'?'إنترنت غير محدود':'باقة eSIM'),
        perks:Array.isArray(p.perks)?p.perks:[],
        best_value:Boolean(row.best_value),
        orderUrl:waLink(pkgMessage(p)),
        cta:'اطلب الباقة'
      };
    }

    const p=digitalProducts.find(x=>x.id===row.product_id);
    if(!p || p.active===false) return null;

    return {
      source_type:'digital',
      service:serviceName(p.service_slug),
      name:p.name,
      duration:p.duration,
      price:p.price,
      description:p.description || p.subscription_type || 'اشتراك رقمي',
      perks:[
        p.subscription_type,
        p.quality,
        ...(Array.isArray(p.features)?p.features:[])
      ].filter(Boolean).slice(0,3),
      best_value:Boolean(row.best_value),
      orderUrl:waLink(digitalMessage(p)),
      cta:'اطلب الاشتراك'
    };
  }

  function legacyFeaturedFallback(){
    const active=packages
      .filter(p=>p.active!==false)
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    return active
      .filter(p=>p.featured)
      .slice(0,3)
      .map(p=>({
        source_type:'esim',
        service:'eSIM',
        name:p.label,
        duration:p.duration,
        price:p.price,
        description:p.tagline || (p.type==='unlimited'?'إنترنت غير محدود':'باقة eSIM'),
        perks:Array.isArray(p.perks)?p.perks:[],
        best_value:Boolean(p.best_value),
        orderUrl:waLink(pkgMessage(p)),
        cta:'اطلب الباقة'
      }));
  }

  function featuredCard(p){
    const perks=(p.perks||[]).slice(0,3);

    return `<article class="package-card ${p.best_value?'best-value':''}">
      ${p.best_value?'<span class="best-badge">★ أفضل قيمة</span>':''}
      <div class="package-label">${escapeHtml(p.service)}${p.description?` • ${escapeHtml(p.description)}`:''}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.duration)}</p>
      <div class="price">
        <b>${money(p.price)}</b>
        <span>ر.ع</span>
      </div>
      <ul>
        ${perks.length
          ? perks.map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join('')
          : '<li>✓ طلب سريع</li><li>✓ دعم بعد الشراء</li>'}
      </ul>
      <a class="btn btn-block"
         href="${p.orderUrl}"
         target="_blank"
         rel="noopener">${escapeHtml(p.cta)}</a>
    </article>`;
  }

  function orderedFeatured(){
    let items=featuredSelection
      .map(resolveFeatured)
      .filter(Boolean);

    if(!items.length){
      items=legacyFeaturedFallback();
    }

    items=items.slice(0,3);

    const best=items.find(x=>x.best_value);
    if(!best) return items;

    const others=items.filter(x=>x!==best);
    return [others[0],best,others[1]].filter(Boolean);
  }

  function setWhatsAppLinks(){
    document.querySelectorAll('.js-generic-wa')
      .forEach(a=>a.href=waLink());
  }

  function syncServiceAvailability(){
    const netflixAvailable=digitalProducts.some(
      p=>p.service_slug==='netflix' && p.active!==false
    );

    const heroNetflix=document.querySelector('.service-icon.netflix')?.closest('.service-line');
    if(heroNetflix){
      const status=heroNetflix.querySelector('.service-status');
      if(status){
        status.className=`service-status ${netflixAvailable?'live':'soon'}`;
        status.innerHTML=netflixAvailable?'<i></i> متوفر':'قريباً';
      }
    }

    const availableNetflix=document.querySelector('[data-service="netflix"]');
    if(availableNetflix){
      availableNetflix.classList.toggle('disabled-service',!netflixAvailable);
      const status=availableNetflix.querySelector('.service-status');
      if(status){
        status.className=`service-status ${netflixAvailable?'live':'soon'}`;
        status.innerHTML=netflixAvailable?'<i></i> متوفر':'قريباً';
      }
    }
  }

  function render(){
    const active=packages
      .filter(p=>p.active!==false)
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    const featuredGrid=document.getElementById('featuredGrid');
    const dataGrid=document.getElementById('dataGrid');
    const unlimitedGrid=document.getElementById('unlimitedGrid');

    if(featuredGrid){
      const featured=orderedFeatured();
      featuredGrid.innerHTML=featured.length
        ? featured.map(featuredCard).join('')
        : '<div class="micro-note">لا توجد منتجات في الأكثر طلباً حالياً.</div>';
    }

    if(dataGrid){
      dataGrid.innerHTML=active
        .filter(p=>p.type==='data')
        .map(packageRow)
        .join('');
    }

    if(unlimitedGrid){
      unlimitedGrid.innerHTML=active
        .filter(p=>p.type==='unlimited')
        .map(packageRow)
        .join('');
    }

    renderNetflix();
    syncServiceAvailability();
    setWhatsAppLinks();
  }

  async function loadRemote(){
    if(!supabaseClient){
      render();
      return;
    }

    try{
      const [
        {data:p,error:pe},
        {data:s,error:se},
        {data:d,error:de},
        {data:f,error:fe}
      ]=await Promise.all([
        supabaseClient.from('packages').select('*').order('sort_order',{ascending:true}),
        supabaseClient.from('site_settings').select('*'),
        supabaseClient.from('digital_products').select('*').order('created_at',{ascending:true}),
        supabaseClient.from('featured_selection').select('*').order('created_at',{ascending:true})
      ]);

      if(!pe && Array.isArray(p) && p.length) packages=p;
      if(!de && Array.isArray(d)) digitalProducts=d;
      if(!fe && Array.isArray(f)) featuredSelection=f;

      if(!se && Array.isArray(s)){
        const wa=s.find(x=>x.key==='whatsapp_number');
        const transfer=s.find(x=>x.key==='bank_transfer_number');

        if(wa?.value) whatsapp=String(wa.value).replace(/\D/g,'');
        if(transfer?.value) transferNumber=String(transfer.value).replace(/\D/g,'');
      }
    }catch(e){
      console.warn('Using local fallback data.',e);
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
    document.querySelectorAll('.service-filter')
      .forEach(b=>b.classList.toggle('active',b===btn));

    const filter=btn.dataset.serviceFilter;

    document.querySelectorAll('[data-service]').forEach(card=>{
      card.style.display=(filter==='all'||card.dataset.service===filter)?'flex':'none';
    });
  }));

  const menuToggle=document.getElementById('menuToggle');
  const mobileNav=document.getElementById('mobileNav');

  menuToggle?.addEventListener('click',()=>{
    const open=mobileNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded',open?'true':'false');
  });

  mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobileNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded','false');
  }));

  const root=document.documentElement;
  const savedTheme=localStorage.getItem('esim-theme');

  if(savedTheme==='light'||savedTheme==='dark'){
    root.dataset.theme=savedTheme;
  }

  document.getElementById('themeToggle')?.addEventListener('click',()=>{
    const next=root.dataset.theme==='light'?'dark':'light';
    root.dataset.theme=next;
    localStorage.setItem('esim-theme',next);
  });

  loadRemote();
})();
