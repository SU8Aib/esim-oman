-- eSIM.OM — نفّذ هذا الملف مرة واحدة في Supabase > SQL Editor.
-- مهم: غيّر admin@example.com إلى بريدك الإداري نفسه الموجود في config.js.

create extension if not exists pgcrypto;

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('data','unlimited')),
  label text not null,
  duration text not null,
  price numeric(10,3) not null check (price >= 0),
  tagline text default '',
  perks jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  best_value boolean not null default false,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null
);

alter table public.packages enable row level security;
alter table public.site_settings enable row level security;

-- القراءة عامة حتى يقدر الموقع العام يعرض الباقات والإعدادات.
drop policy if exists "public can read packages" on public.packages;
create policy "public can read packages" on public.packages for select using (true);

drop policy if exists "public can read settings" on public.site_settings;
create policy "public can read settings" on public.site_settings for select using (true);

-- الكتابة فقط للحساب الإداري المحدد.
-- غيّر البريد هنا قبل التنفيذ.
drop policy if exists "admin can insert packages" on public.packages;
create policy "admin can insert packages" on public.packages for insert to authenticated with check ((auth.jwt() ->> 'email') = 'admin@example.com');
drop policy if exists "admin can update packages" on public.packages;
create policy "admin can update packages" on public.packages for update to authenticated using ((auth.jwt() ->> 'email') = 'admin@example.com') with check ((auth.jwt() ->> 'email') = 'admin@example.com');
drop policy if exists "admin can delete packages" on public.packages;
create policy "admin can delete packages" on public.packages for delete to authenticated using ((auth.jwt() ->> 'email') = 'admin@example.com');

drop policy if exists "admin can insert settings" on public.site_settings;
create policy "admin can insert settings" on public.site_settings for insert to authenticated with check ((auth.jwt() ->> 'email') = 'admin@example.com');
drop policy if exists "admin can update settings" on public.site_settings;
create policy "admin can update settings" on public.site_settings for update to authenticated using ((auth.jwt() ->> 'email') = 'admin@example.com') with check ((auth.jwt() ->> 'email') = 'admin@example.com');

insert into public.site_settings(key,value) values ('whatsapp_number','96876746977') on conflict (key) do nothing;

insert into public.packages(type,label,duration,price,tagline,perks,featured,best_value,sort_order,active) values
('data','1GB','3 أيام',0.200,'','["تفعيل سريع","دعم طوال المدة"]',false,false,10,true),
('data','3GB','شهر كامل',0.900,'','["تفعيل سريع","دعم طوال المدة"]',false,false,20,true),
('data','5GB','15 يوم',1.100,'','["تفعيل سريع","دعم طوال المدة"]',false,false,30,true),
('data','5GB','30 يوم',1.500,'بداية اقتصادية','["يكفي للاستخدام اليومي","تفعيل سريع","دعم طوال المدة"]',true,false,40,true),
('data','10GB','30 يوم',2.500,'الأكثر طلباً','["أفضل قيمة مقابل السعر","مناسبة للتصفح والتطبيقات","دعم طوال المدة"]',true,true,50,true),
('data','20GB','شهر كامل',4.100,'','["تفعيل سريع","دعم طوال المدة"]',false,false,60,true),
('unlimited','غير محدود','يوم واحد',0.500,'','["إنترنت غير محدود","تفعيل سريع"]',false,false,70,true),
('unlimited','غير محدود','14 يوم',6.100,'','["إنترنت غير محدود","استخدام مكثف"]',false,false,80,true),
('unlimited','غير محدود','30 يوم',10.500,'بلا حدود','["إنترنت غير محدود بالكامل","مثالية للاستخدام المكثف","دعم طوال المدة"]',true,false,90,true);
