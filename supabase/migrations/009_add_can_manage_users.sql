-- Add can_manage_users permission field for delegated user management
alter table public.users add column if not exists can_manage_users boolean default false;

-- Grant owners implicit management permission
update public.users set can_manage_users = true where role = 'owner';
