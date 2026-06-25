alter table public.competitor_emails
  add column if not exists resend_inbound_id text;

create unique index if not exists competitor_emails_resend_inbound_id_key
  on public.competitor_emails (resend_inbound_id)
  where resend_inbound_id is not null;
