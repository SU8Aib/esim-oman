(() => {
  const cfg = window.ESIM_CONFIG || {};
  const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.ADMIN_EMAIL && window.supabase);
  const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY) : null;
  let packages = [];
  const $ = s=>document.querySelector(s);
  const $$ = s=>[...document.querySelectorAll(s)];
  const loginView=$('#loginView'),dashboard=$('#dashboardView'),setup=$('#setupWarning');
  setup.hidden=configured;

  function msg(el,text,type=''){el.textContent=text;el.className='form-message'+(type?' '+type:'')}
  function money(v){return Number(v).toFixed(3)}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  async function showDashboard(){loginView.hidden=true;dashboard.hidden=false;await Promise.all([loadPackages(),loadSettings()]);}
  async function checkSession(){if(!sb)return;const {data}=await sb.auth.getSession();if(data.session)showDashboard();}
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!sb){msg($('#loginMessage'),'اربط Supabase أولاً من config.js وملف SQL.','error');return}msg($('#loginMessage'),'جاري التحقق...');const {error}=await sb.auth.signInWithPassword({email:cfg.ADMIN_EMAIL,password:$('#password').value});if(error){msg($('#loginMessage'),'كلمة المرور غير صحيحة أو إعداد الحساب غير مكتمل.','error');return}msg($('#loginMessage'),'تم الدخول.','success');showDashboard()});
  $('#logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});

  async function loadPackages(){const {data,error}=await sb.from('packages').select('*').order('sort_order',{ascending:true});if(error){alert('تعذر تحميل الباقات: '+error.message);return}packages=data||[];renderPackages()}
  function renderPackages(){
    $('#countAll').textContent=packages.length;$('#countActive').textContent=packages.filter(x=>x.active).length;$('#countFeatured').textContent=packages.filter(x=>x.featured).length;
    $('#adminPackageList').innerHTML=packages.length?packages.map(p=>`<article class="admin-package">
      <div class="admin-package-main"><span class="status-dot ${p.active?'on':''}"></span><span class="package-type-pill">${p.type==='data'?'محددة':'غير محدود'}</span><div class="admin-package-info"><b>${esc(p.label)} — ${money(p.price)} ر.ع ${p.best_value?'⭐':''}</b><span>${esc(p.duration)} ${p.featured?'• الأكثر طلباً':''}</span></div></div>
      <div class="admin-package-actions"><button class="mini-btn" data-edit="${p.id}">تعديل</button><button class="mini-btn danger" data-delete="${p.id}">حذف</button></div></article>`).join(''):'<div class="empty-state">لا توجد باقات. اضغط “إضافة باقة”.</div>';
    $$('[data-edit]').forEach(b=>b.addEventListener('click',()=>openDialog(packages.find(x=>x.id===b.dataset.edit))));
    $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>removePackage(b.dataset.delete)));
  }

  const dialog=$('#packageDialog');
  $('#newPackageBtn').addEventListener('click',()=>openDialog());$('#cancelDialog').addEventListener('click',()=>dialog.close());
  function openDialog(p=null){
    $('#dialogTitle').textContent=p?'تعديل الباقة':'إضافة باقة';$('#pkgId').value=p?.id||'';$('#pkgType').value=p?.type||'data';$('#pkgLabel').value=p?.label||'';$('#pkgDuration').value=p?.duration||'';$('#pkgPrice').value=p?money(p.price):'';$('#pkgTagline').value=p?.tagline||'';$('#pkgPerks').value=Array.isArray(p?.perks)?p.perks.join('\n'):'';$('#pkgSort').value=p?.sort_order??100;$('#pkgActive').checked=p?.active??true;$('#pkgFeatured').checked=p?.featured??false;$('#pkgBest').checked=p?.best_value??false;msg($('#packageMessage'),'');dialog.showModal();
  }
  $('#packageForm').addEventListener('submit',async e=>{
    e.preventDefault();const id=$('#pkgId').value;const payload={type:$('#pkgType').value,label:$('#pkgLabel').value.trim(),duration:$('#pkgDuration').value.trim(),price:Number($('#pkgPrice').value),tagline:$('#pkgTagline').value.trim(),perks:$('#pkgPerks').value.split('\n').map(x=>x.trim()).filter(Boolean),sort_order:Number($('#pkgSort').value||100),active:$('#pkgActive').checked,featured:$('#pkgFeatured').checked,best_value:$('#pkgBest').checked};
    if(payload.best_value) payload.featured=true;
    const featuredWithoutCurrent=packages.filter(x=>x.featured && x.id!==id).length;
    if(payload.featured && featuredWithoutCurrent>=3){msg($('#packageMessage'),'يمكن اختيار 3 باقات فقط ضمن الأكثر طلباً. أزل واحدة أولاً.','error');return}
    msg($('#packageMessage'),'جاري الحفظ...');
    if(payload.best_value){const {error:resetErr}=await sb.from('packages').update({best_value:false}).neq('id',id||'00000000-0000-0000-0000-000000000000');if(resetErr){msg($('#packageMessage'),resetErr.message,'error');return}}
    const result=id?await sb.from('packages').update(payload).eq('id',id):await sb.from('packages').insert(payload);
    if(result.error){msg($('#packageMessage'),result.error.message,'error');return}msg($('#packageMessage'),'تم الحفظ.','success');await loadPackages();setTimeout(()=>dialog.close(),350)
  });
  async function removePackage(id){if(!confirm('حذف هذه الباقة نهائياً؟'))return;const {error}=await sb.from('packages').delete().eq('id',id);if(error){alert(error.message);return}await loadPackages()}

  async function loadSettings(){const {data,error}=await sb.from('site_settings').select('*');if(error)return;const wa=(data||[]).find(x=>x.key==='whatsapp_number');$('#whatsappSetting').value=wa?.value||cfg.DEFAULT_WHATSAPP_NUMBER||''}
  $('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const value=$('#whatsappSetting').value.replace(/\D/g,'');if(!value){msg($('#settingsMessage'),'أدخل الرقم.','error');return}const {error}=await sb.from('site_settings').upsert({key:'whatsapp_number',value},{onConflict:'key'});if(error){msg($('#settingsMessage'),error.message,'error');return}msg($('#settingsMessage'),'تم الحفظ وسيظهر الرقم الجديد للزوار.','success')});

  $$('.admin-nav').forEach(b=>b.addEventListener('click',()=>{$$('.admin-nav').forEach(x=>x.classList.toggle('active',x===b));$$('.admin-view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===b.dataset.view))}));
  checkSession();
})();
