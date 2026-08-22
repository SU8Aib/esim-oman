(() => {
  const cfg = window.ESIM_CONFIG || {};

  const FALLBACK_PACKAGES = [
    {id:'d1', type:'data', label:'1GB', duration:'3 أيام', price:0.200, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], sort_order:10, active:true},
    {id:'d2', type:'data', label:'3GB', duration:'شهر كامل', price:0.900, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], sort_order:20, active:true},
    {id:'d3', type:'data', label:'5GB', duration:'15 يوم', price:1.100, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], sort_order:30, active:true},
    {id:'d4', type:'data', label:'5GB', duration:'30 يوم', price:1.500, tagline:'بداية اقتصادية', perks:['يكفي للاستخدام اليومي','تفعيل سريع','دعم طوال المدة'], sort_order:40, active:true},
    {id:'d5', type:'data', label:'10GB', duration:'30 يوم', price:2.500, tagline:'الأكثر طلباً', perks:['أفضل قيمة مقابل السعر','مناسبة للتصفح والتطبيقات','دعم طوال المدة'], sort_order:50, active:true},
    {id:'d6', type:'data', label:'20GB', duration:'شهر كامل', price:4.100, tagline:'', perks:['تفعيل سريع','دعم طوال المدة'], sort_order:60, active:true},
    {id:'u1', type:'unlimited', label:'غير محدود', duration:'يوم واحد', price:0.500, tagline:'', perks:['إنترنت غير محدود','تفعيل سريع'], sort_order:70, active:true},
    {id:'u2', type:'unlimited', label:'غير محدود', duration:'14 يوم', price:6.100, tagline:'', perks:['إنترنت غير محدود','استخدام مكثف'], sort_order:80, active:true},
    {id:'u3', type:'unlimited', label:'غير محدود', duration:'30 يوم', price:10.500, tagline:'بلا حدود', perks:['إنترنت غير محدود بالكامل','مثالية للاستخدام المكثف','دعم طوال المدة'], sort_order:90, active:true}
  ];

  const FALLBACK_HOME_CARDS = [
    {slot:1,display_name:'Oman eSIM',icon_value:'eSIM',tagline:'باقات بيانات مرنة وسريعة',target_type:'esim',linked_service_id:null,availability_status:'available'},
    {slot:2,display_name:'Netflix',icon_value:'N',tagline:'قسم اشتراكات رقمية',target_type:'digital',linked_service_id:null,legacy_slug:'netflix',availability_status:'soon'},
    {slot:3,display_name:'ChatGPT',icon_value:'AI',tagline:'خدمات اشتراك رقمية',target_type:'digital',linked_service_id:null,legacy_slug:'chatgpt',availability_status:'soon'}
  ];

  let whatsapp = String(cfg.DEFAULT_WHATSAPP_NUMBER || '96876746977').replace(/\D/g,'');
  let transferNumber = '91772654';
  let packages = FALLBACK_PACKAGES;
  let digitalProducts = [];
  let digitalServices = [];
  let serviceFields = [];
  let featuredSelection = [];
  let homepageQuickLinks = [];
  let homepageCards = [];
  let supabaseClient = null;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  if(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase){
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function money(v){ const n=Number(v); return Number.isFinite(n)?n.toFixed(3):'0.000'; }
  function safeAccent(v){
    const x=String(v||'').trim();
    return /^#[0-9a-f]{6}$/i.test(x)?x:'#55E6D0';
  }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function waLink(text='مرحبًا 👋، أبغى أعرف أكثر عن خدمات eSIM.OM.'){
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }
  function pkgMessage(p){
    return `مرحبًا 👋\nأرغب في طلب باقة eSIM:\n📶 ${p.label} | ${p.duration} | ${money(p.price)} ر.ع\n\n💳 التحويل عبر بنك مسقط\n📱 رقم التحويل: ${transferNumber}\n\nيرجى تأكيد الطلب وإرسال خطوات التفعيل. شكرًا لكم.`;
  }

  function serviceById(id){ return digitalServices.find(s=>s.id===id)||null; }
  function serviceBySlug(slug){ return digitalServices.find(s=>s.slug===slug)||null; }
  function serviceForProduct(p){ return (p.service_id&&serviceById(p.service_id)) || serviceBySlug(p.service_slug) || null; }
  function fieldsForService(serviceId){
    return serviceFields.filter(f=>f.service_id===serviceId && f.status!=='archived').sort((a,b)=>Number(a.sort_order||100)-Number(b.sort_order||100));
  }
  function productsForService(svc){
    return digitalProducts.filter(p=>p.service_id===svc.id || (!p.service_id && p.service_slug===svc.slug));
  }
  function serviceIcon(svc){
    const icon=svc?.icon&&typeof svc.icon==='object'?svc.icon:{};
    return String(icon.value||svc?.name||'S').slice(0,4);
  }
  function fieldValue(product, field){
    let value = field.storage==='attributes'
      ? (product.attributes&&typeof product.attributes==='object'?product.attributes[field.field_key]:undefined)
      : product[field.field_key];
    // Legacy Netflix safety: old products still use physical columns.
    if((value===undefined||value===null||value==='') && ['screens','quality'].includes(field.field_key)) value=product[field.field_key];
    return value;
  }
  function displayValue(value){
    if(Array.isArray(value)) return value.join('، ');
    if(value===null||value===undefined) return '';
    return String(value);
  }

  function effectiveFields(svc){
    const existing=fieldsForService(svc.id);
    if(existing.length) return existing;
    // Legacy fallback if SQL migration has not been run yet.
    if(svc.slug==='netflix') return [
      {field_key:'name',label:'اسم الاشتراك',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'🎫',sort_order:10},
      {field_key:'duration',label:'المدة',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'⏳',sort_order:20},
      {field_key:'price',label:'السعر',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'💰',sort_order:30},
      {field_key:'subscription_type',label:'النوع',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'📦',sort_order:40},
      {field_key:'screens',label:'الأجهزة/الشاشات',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'🖥',sort_order:50},
      {field_key:'quality',label:'الجودة',storage:'column',show_on_card:true,show_on_whatsapp:true,whatsapp_icon:'✨',sort_order:60},
      {field_key:'delivery_method',label:'التسليم',storage:'column',show_on_card:false,show_on_whatsapp:true,whatsapp_icon:'🚚',sort_order:90}
    ];
    return [];
  }

  function digitalMessage(product, svc){
    const fields=effectiveFields(svc).filter(f=>f.show_on_whatsapp);
    const lines=[];
    for(const f of fields){
      const raw=fieldValue(product,f);
      const value=displayValue(raw);
      if(!value) continue;
      if(f.field_key==='price') lines.push(`${f.whatsapp_icon||'💰'} ${f.label}: ${money(raw)} ر.ع`);
      else lines.push(`${f.whatsapp_icon||'•'} ${f.label}: ${value}`);
    }
    if(!lines.length){
      lines.push(`🎫 ${product.name||''}`);
      if(product.duration) lines.push(`⏳ المدة: ${product.duration}`);
      lines.push(`💰 السعر: ${money(product.price)} ر.ع`);
    }
    const intro=(svc.whatsapp_intro||`مرحبًا 👋\nأرغب في طلب اشتراك ${svc.name}:`).trim();
    return `${intro}\n${lines.join('\n')}\n\n💳 التحويل عبر بنك مسقط\n📱 رقم التحويل: ${transferNumber}\n\nيرجى تأكيد الطلب وإرسال تفاصيل الاستلام. شكرًا لكم.`;
  }

  function packageRow(p){
    return `<article class="package-row"><div><b>${escapeHtml(p.label)}</b><span>${escapeHtml(p.duration)}</span></div><div><strong>${money(p.price)} ر.ع</strong><a href="${waLink(pkgMessage(p))}" target="_blank" rel="noopener">اطلب</a></div></article>`;
  }

  function resolveFeatured(row){
    if(row.source_type==='esim'){
      const p=packages.find(x=>x.id===row.product_id); if(!p||p.active===false)return null;
      return {service:'eSIM',name:p.label,duration:p.duration,price:p.price,description:p.tagline||(p.type==='unlimited'?'إنترنت غير محدود':'باقة eSIM'),perks:Array.isArray(p.perks)?p.perks:[],best_value:Boolean(row.best_value),orderUrl:waLink(pkgMessage(p)),cta:'اطلب الباقة'};
    }
    const p=digitalProducts.find(x=>x.id===row.product_id); if(!p||p.active===false)return null;
    const svc=serviceForProduct(p);
    if(!svc || svc.status!=='published') return null;
    const fields=effectiveFields(svc);
    const perks=fields.filter(f=>f.show_on_card&&!['name','duration','price'].includes(f.field_key)).map(f=>displayValue(fieldValue(p,f))).filter(Boolean).slice(0,3);
    if(!perks.length) perks.push(p.subscription_type,p.quality,...(Array.isArray(p.features)?p.features:[]));
    return {service:svc.name,name:p.name,duration:p.duration,price:p.price,description:p.description||p.subscription_type||'اشتراك رقمي',perks:perks.filter(Boolean).slice(0,3),best_value:Boolean(row.best_value),orderUrl:waLink(digitalMessage(p,svc)),cta:'اطلب الاشتراك'};
  }

  function featuredCard(p){
    return `<article class="package-card ${p.best_value?'best-value':''}">${p.best_value?'<span class="best-badge">★ أفضل قيمة</span>':''}<div class="package-label">${escapeHtml(p.service)}${p.description?` • ${escapeHtml(p.description)}`:''}</div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.duration||'')}</p><div class="price"><b>${money(p.price)}</b><span>ر.ع</span></div><ul>${(p.perks||[]).length?(p.perks||[]).slice(0,3).map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join(''):'<li>✓ طلب سريع</li><li>✓ دعم بعد الشراء</li>'}</ul><a class="btn btn-block" href="${p.orderUrl}" target="_blank" rel="noopener">${escapeHtml(p.cta)}</a></article>`;
  }

  function orderedFeatured(){
    const items=featuredSelection.map(resolveFeatured).filter(Boolean).slice(0,3);
    const best=items.find(x=>x.best_value); if(!best)return items;
    const others=items.filter(x=>x!==best); return [others[0],best,others[1]].filter(Boolean);
  }

  function legacyNetflixCard(product,svc){
    const fields=effectiveFields(svc);
    const visibleKeys=new Set(fields.filter(f=>f.show_on_card).map(f=>f.field_key));
    const quality=visibleKeys.has('quality')?displayValue(product.quality):'';
    const featureList=Array.isArray(product.features)?product.features:[];
    const compact=[];
    if(visibleKeys.has('subscription_type') && product.subscription_type) compact.push(product.subscription_type);
    if(visibleKeys.has('screens') && product.screens) compact.push(product.screens);
    for(const x of featureList){
      if(compact.length>=2) break;
      if(x) compact.push(x);
    }
    const note=(visibleKeys.has('note') && product.note)?String(product.note).trim():'';
    return `<article class="netflix-product-card ${note?'has-note':'no-note'}">
      <div class="netflix-card-head">
        <span class="netflix-logo">N</span>
        <div class="netflix-title-wrap">
          <h3>${escapeHtml(product.name||'')}</h3>
          ${quality?`<span class="netflix-quality">${escapeHtml(quality)}</span>`:''}
        </div>
      </div>
      ${compact.length?`<ul class="netflix-compact-features">${compact.slice(0,2).map(x=>`<li><span>✓</span>${escapeHtml(x)}</li>`).join('')}</ul>`:''}
      ${note?`<div class="digital-note">⚠ ${escapeHtml(note)}</div>`:''}
      <div class="netflix-card-bottom">
        <div class="netflix-price-wrap"><small>${escapeHtml(product.duration||'')}</small><strong>${money(product.price)} <span>ر.ع</span></strong></div>
        <a class="netflix-order-btn" href="${waLink(digitalMessage(product,svc))}" target="_blank" rel="noopener">اطلب</a>
      </div>
    </article>`;
  }

  function digitalCard(product, svc){
    if(svc.slug==='netflix') return legacyNetflixCard(product,svc);
    const fields=effectiveFields(svc);
    const visible=fields.filter(f=>f.show_on_card&&!['name','duration','price','features','note'].includes(f.field_key));
    const features=Array.isArray(product.features)&&product.features.length?product.features:(Array.isArray(svc.default_features)?svc.default_features:[]);
    const meta=visible.map(f=>({label:f.label,value:displayValue(fieldValue(product,f))})).filter(x=>x.value).slice(0,3);
    const compact=[...meta.map(x=>x.value),...features].filter(Boolean).slice(0,3);
    const note=product.note?String(product.note).trim():'';
    const accent=safeAccent(svc.accent_color);
    const netflix=svc.slug==='netflix';
    return `<article class="digital-product-card ${netflix?'service-netflix-card':''} ${note?'has-note':'no-note'}" style="--service-accent:${escapeHtml(accent)}">
      <div class="digital-card-head"><span class="digital-service-logo ${netflix?'netflix-logo':''}">${escapeHtml(serviceIcon(svc))}</span><div class="digital-title-wrap"><h3>${escapeHtml(product.name||'')}</h3>${meta[0]?`<span class="digital-primary-tag">${escapeHtml(meta[0].value)}</span>`:''}</div></div>
      ${compact.length?`<ul class="digital-compact-features">${compact.map(x=>`<li><span>✓</span>${escapeHtml(x)}</li>`).join('')}</ul>`:''}
      ${note?`<div class="digital-note">⚠ ${escapeHtml(note)}</div>`:''}
      <div class="digital-card-bottom"><div class="digital-price-wrap"><small>${escapeHtml(product.duration||'')}</small><strong>${money(product.price)} <span>ر.ع</span></strong></div><a class="digital-order-btn" href="${waLink(digitalMessage(product,svc))}" target="_blank" rel="noopener">اطلب</a></div>
    </article>`;
  }

  function renderDigitalServices(){
    const root=$('#digitalServicesRoot'); if(!root)return;
    const published=[...digitalServices].filter(s=>s.status==='published').sort((a,b)=>Number(a.sort_order||100)-Number(b.sort_order||100));
    root.innerHTML=published.map(svc=>{
      const products=productsForService(svc).filter(p=>p.active!==false).sort((a,b)=>Number(a.sort_order||100)-Number(b.sort_order||100)||String(a.created_at||'').localeCompare(String(b.created_at||'')));
      const icon=serviceIcon(svc);
      const body=products.length?products.map(p=>digitalCard(p,svc)).join(''):`<div class="digital-empty"><span class="digital-service-logo ${svc.slug==='netflix'?'netflix-logo':''}" style="--service-accent:${escapeHtml(safeAccent(svc.accent_color))}">${escapeHtml(icon)}</span><div><b>لا توجد اشتراكات ${escapeHtml(svc.name)} متاحة حالياً</b><p>ستظهر المنتجات هنا عند تفعيلها.</p></div></div>`;
      return `<section class="section-space digital-service-section ${svc.slug==='netflix'?'netflix-section':''}" id="service-${escapeHtml(svc.slug)}" data-digital-service-id="${escapeHtml(svc.id)}" style="--service-accent:${escapeHtml(safeAccent(svc.accent_color))}"><div class="container"><div class="section-head digital-service-head ${svc.slug==='netflix'?'netflix-section-head':''}"><span class="eyebrow">${escapeHtml(svc.name.toUpperCase())}</span><h2>${escapeHtml(svc.public_title||svc.name)}</h2>${svc.description?`<p>${escapeHtml(svc.description)}</p>`:''}</div><div class="digital-service-grid ${svc.slug==='netflix'?'netflix-grid':''}">${body}</div></div></section>`;
    }).join('');
  }

  function homeTarget(card){
    if(card.target_type==='esim') return {valid:true,href:'#packages'};
    const svc=card.linked_service_id?serviceById(card.linked_service_id):(card.legacy_slug?serviceBySlug(card.legacy_slug):null);
    if(!svc || svc.status!=='published') return {valid:false,href:'#available'};
    return {valid:true,href:`#service-${svc.slug}`};
  }
  function statusLabel(s){return ({available:'متوفر',unavailable:'غير متوفر',sold_out:'سولد اوت',soon:'قريباً'})[s]||'قريباً';}
  function homeCardMarkup(card,kind='available'){
    const t=homeTarget(card);const disabled=!t.valid;const cls=kind==='hero'?'service-line':'available-card';
    return `<article class="${cls} ${disabled?'disabled-service':''} homepage-service-card" data-home-target="${escapeHtml(t.href)}" data-home-clickable="${t.valid?'1':'0'}"><div class="service-info"><span class="service-icon home-dynamic-icon">${escapeHtml(card.icon_value||'•')}</span><span><b>${escapeHtml(card.display_name||'')}</b><small>${escapeHtml(card.tagline||'')}</small></span></div><span class="service-status home-status-${escapeHtml(card.availability_status||'soon')}"><i></i>${escapeHtml(statusLabel(card.availability_status))}</span></article>`;
  }
  function renderHomepageCards(){
    const cards=(homepageCards.length?homepageCards:FALLBACK_HOME_CARDS).slice().sort((a,b)=>Number(a.slot)-Number(b.slot)).slice(0,3);
    const hero=$('#heroServiceStack'); if(hero)hero.innerHTML=cards.map(c=>homeCardMarkup(c,'hero')).join('');
    const grid=$('#availabilityGrid'); if(grid)grid.innerHTML=cards.map(c=>homeCardMarkup(c,'available')).join('');
  }
  function renderQuickLinks(){
    const root=$('#homepageQuickLinks');if(!root)return;
    let links=homepageQuickLinks.filter(x=>x.active!==false).sort((a,b)=>Number(a.sort_order||100)-Number(b.sort_order||100));
    if(!links.length){
      links=[{label:'eSIM',target_type:'esim',linked_service_id:null},...digitalServices.filter(s=>s.status==='published').slice(0,3).map(s=>({label:s.name,target_type:'digital',linked_service_id:s.id}))];
    }
    links=links.filter(x=>x.target_type==='esim'||(x.linked_service_id&&serviceById(x.linked_service_id)?.status==='published'));
    root.innerHTML=links.map(x=>{const target=x.target_type==='esim'?'#packages':`#service-${serviceById(x.linked_service_id)?.slug||''}`;return `<button class="service-filter homepage-quick-link" type="button" data-scroll-target="${escapeHtml(target)}">${escapeHtml(x.label)}</button>`}).join('');
  }

  function setWhatsAppLinks(){ $$('.js-generic-wa').forEach(a=>a.href=waLink()); }
  function render(){
    const active=packages.filter(p=>p.active!==false).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
    const featuredGrid=$('#featuredGrid'); if(featuredGrid){const f=orderedFeatured();featuredGrid.innerHTML=f.length?f.map(featuredCard).join(''):'<div class="micro-note">لا توجد منتجات في الأكثر طلباً حالياً.</div>';}
    const dataGrid=$('#dataGrid'); if(dataGrid)dataGrid.innerHTML=active.filter(p=>p.type==='data').map(packageRow).join('');
    const unlimitedGrid=$('#unlimitedGrid'); if(unlimitedGrid)unlimitedGrid.innerHTML=active.filter(p=>p.type==='unlimited').map(packageRow).join('');
    renderDigitalServices();renderHomepageCards();renderQuickLinks();setWhatsAppLinks();
  }

  async function loadRemote(){
    if(!supabaseClient){ render(); return; }
    const requests={
      packages:supabaseClient.from('packages').select('*').order('sort_order',{ascending:true}),
      settings:supabaseClient.from('site_settings').select('*'),
      products:supabaseClient.from('digital_products').select('*').order('sort_order',{ascending:true}),
      featured:supabaseClient.from('featured_selection').select('*').order('created_at',{ascending:true}),
      services:supabaseClient.from('digital_services').select('*').order('sort_order',{ascending:true}),
      fields:supabaseClient.from('service_fields').select('*').order('sort_order',{ascending:true}),
      quick:supabaseClient.from('homepage_quick_links').select('*').order('sort_order',{ascending:true}),
      cards:supabaseClient.from('homepage_availability_cards').select('*').order('slot',{ascending:true})
    };
    const keys=Object.keys(requests);
    const results=await Promise.all(keys.map(k=>requests[k].then(r=>({k,...r})).catch(error=>({k,error,data:null}))));
    const by=Object.fromEntries(results.map(r=>[r.k,r]));
    if(!by.packages.error&&Array.isArray(by.packages.data)&&by.packages.data.length)packages=by.packages.data;
    if(!by.products.error&&Array.isArray(by.products.data))digitalProducts=by.products.data;
    if(!by.featured.error&&Array.isArray(by.featured.data))featuredSelection=by.featured.data;
    if(!by.services.error&&Array.isArray(by.services.data))digitalServices=by.services.data;
    if(!by.fields.error&&Array.isArray(by.fields.data))serviceFields=by.fields.data;
    if(!by.quick.error&&Array.isArray(by.quick.data))homepageQuickLinks=by.quick.data;
    if(!by.cards.error&&Array.isArray(by.cards.data))homepageCards=by.cards.data;
    if(!by.settings.error&&Array.isArray(by.settings.data)){
      const wa=by.settings.data.find(x=>x.key==='whatsapp_number');const tr=by.settings.data.find(x=>x.key==='bank_transfer_number');if(wa?.value)whatsapp=String(wa.value).replace(/\D/g,'');if(tr?.value)transferNumber=String(tr.value).replace(/\D/g,'');
    }
    // If metadata migration is not installed yet, keep legacy Netflix visible.
    if(!digitalServices.length && digitalProducts.some(p=>p.service_slug==='netflix')){
      digitalServices=[{id:'legacy-netflix',slug:'netflix',name:'Netflix',public_title:'اختر اشتراك Netflix المناسب لك',description:'اسم المنتج، المدة، السعر، نوع الاشتراك، الأجهزة والجودة تظهر لك بوضوح قبل الطلب.',icon:{type:'text',value:'N'},accent_color:'#e50914',status:'published',sort_order:200,whatsapp_intro:'مرحبًا 👋\nأرغب في طلب اشتراك Netflix:'}];
    }
    render();
  }

  // eSIM package tabs
  $$('.segment').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.segment').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',b===btn?'true':'false')});
    $$('.package-list').forEach(p=>p.classList.toggle('active',p.dataset.panel===btn.dataset.tab));
  }));

  // Homepage navigation generated from CMS.
  document.addEventListener('click',e=>{
    const q=e.target.closest('[data-scroll-target]');
    const c=e.target.closest('[data-home-target]');
    const target=q?.dataset.scrollTarget || (c?.dataset.homeClickable==='1'?c.dataset.homeTarget:null);
    if(target&&target!=='#'){e.preventDefault();document.querySelector(target)?.scrollIntoView({behavior:'smooth',block:'start'});}
  });

  const menuToggle=$('#menuToggle'),mobileNav=$('#mobileNav');
  menuToggle?.addEventListener('click',()=>{const open=mobileNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',open?'true':'false')});
  mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false')}));

  const root=document.documentElement;const savedTheme=localStorage.getItem('esim-theme');if(savedTheme==='light'||savedTheme==='dark')root.dataset.theme=savedTheme;
  $('#themeToggle')?.addEventListener('click',()=>{const next=root.dataset.theme==='light'?'dark':'light';root.dataset.theme=next;localStorage.setItem('esim-theme',next)});

  loadRemote().catch(e=>{console.warn('CMS load failed, using fallback.',e);render()});
})();
