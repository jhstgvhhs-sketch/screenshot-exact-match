create table if not exists public.pix_transactions (
 order_id uuid primary key references public.orders(id),
 transaction_id text unique not null,
 amount_cents integer not null check(amount_cents>0),
 status text not null default 'pending',
 copy_paste text,
 qr_code_base64 text,
 created_at timestamptz not null default now()
);
alter table public.pix_transactions enable row level security;
revoke all on public.pix_transactions from anon, authenticated;
