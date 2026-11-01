-- X STORE CUSTOMER SUPPORT CHAT: run in Supabase SQL Editor
create table if not exists public.support_conversations (
 id uuid primary key default gen_random_uuid(), visitor_token uuid not null,
 customer_name text not null, customer_phone text not null,
 status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_message_at timestamptz not null default now()
);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.support_conversations(id) on delete cascade,
 sender_role text not null check(sender_role in ('customer','admin')),
 message text not null check(char_length(message) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists support_messages_conversation_created_idx on public.support_messages(conversation_id,created_at);
create index if not exists support_conversations_last_message_idx on public.support_conversations(last_message_at desc);
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
drop policy if exists "Support admins read conversations" on public.support_conversations;
create policy "Support admins read conversations" on public.support_conversations for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Support admins update conversations" on public.support_conversations;
create policy "Support admins update conversations" on public.support_conversations for update to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Support admins read messages" on public.support_messages;
create policy "Support admins read messages" on public.support_messages for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Support admins reply" on public.support_messages;
create policy "Support admins reply" on public.support_messages for insert to authenticated with check(sender_role='admin' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
grant select,update on public.support_conversations to authenticated;
grant select,insert on public.support_messages to authenticated;
grant usage on schema public to anon,authenticated;
create or replace function public.support_create_conversation(p_customer_name text,p_customer_phone text,p_message text,p_visitor_token uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if length(trim(coalesce(p_customer_name,''))) not between 1 and 80 or length(trim(coalesce(p_customer_phone,''))) not between 7 and 20 or length(trim(coalesce(p_message,''))) not between 1 and 1500 or p_visitor_token is null then raise exception 'Please provide valid name, phone and message.'; end if;
 insert into support_conversations(visitor_token,customer_name,customer_phone) values(p_visitor_token,trim(p_customer_name),trim(p_customer_phone)) returning id into v_id;
 insert into support_messages(conversation_id,sender_role,message) values(v_id,'customer',trim(p_message));
 return v_id;
end $$;
create or replace function public.support_send_message(p_conversation_id uuid,p_visitor_token uuid,p_message text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if length(trim(coalesce(p_message,''))) not between 1 and 1500 then raise exception 'Message must be between 1 and 1500 characters.'; end if;
 if not exists(select 1 from support_conversations where id=p_conversation_id and visitor_token=p_visitor_token and status='open') then raise exception 'Conversation not found or closed.'; end if;
 insert into support_messages(conversation_id,sender_role,message) values(p_conversation_id,'customer',trim(p_message));
 update support_conversations set last_message_at=now(),updated_at=now() where id=p_conversation_id;
 return true;
end $$;
create or replace function public.support_get_messages(p_conversation_id uuid,p_visitor_token uuid) returns table(id uuid,sender_role text,message text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from support_conversations where id=p_conversation_id and visitor_token=p_visitor_token) then raise exception 'Conversation not found.'; end if;
 return query select m.id,m.sender_role,m.message,m.created_at from support_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end $$;
revoke all on function public.support_create_conversation(text,text,text,uuid) from public;
revoke all on function public.support_send_message(uuid,uuid,text) from public;
revoke all on function public.support_get_messages(uuid,uuid) from public;
grant execute on function public.support_create_conversation(text,text,text,uuid) to anon,authenticated;
grant execute on function public.support_send_message(uuid,uuid,text) to anon,authenticated;
grant execute on function public.support_get_messages(uuid,uuid) to anon,authenticated;
