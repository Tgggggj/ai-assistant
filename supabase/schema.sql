create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Alex',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  category text not null,
  title text not null,
  body text not null,
  image_url text,
  difficulty text not null default '中等',
  options jsonb not null default '[]'::jsonb,
  correct_option text not null,
  correct_answer text not null,
  explanation_steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_questions integer not null default 20,
  current_index integer not null default 1,
  score integer not null default 0,
  time_left_seconds integer not null default 765,
  status text not null default 'active',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.practice_sessions
  add column if not exists status text not null default 'active';

alter table if exists public.practice_sessions
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'practice_sessions_status_check'
      and conrelid = 'public.practice_sessions'::regclass
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_status_check check (status in ('active', 'completed'));
  end if;
end $$;

with ranked_active_sessions as (
  select
    id,
    row_number() over (partition by user_id order by updated_at desc, created_at desc, id desc) as active_rank
  from public.practice_sessions
  where status = 'active'
)
update public.practice_sessions
set
  status = 'completed',
  completed_at = coalesce(completed_at, now())
from ranked_active_sessions
where public.practice_sessions.id = ranked_active_sessions.id
  and ranked_active_sessions.active_rank > 1;

create unique index if not exists practice_sessions_one_active_per_user
on public.practice_sessions(user_id)
where status = 'active';

create table if not exists public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text not null,
  scratchpad text not null default '',
  is_correct boolean not null default false,
  is_marked boolean not null default false,
  time_spent_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  subject text not null,
  question text not null,
  user_answer text not null,
  correct_answer text not null,
  ai_explanation jsonb,
  tags text[] not null default '{}',
  source text not null default 'practice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  accuracy numeric(5,2) not null,
  note text,
  color text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  suggested_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  subtitle text not null,
  score integer,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  category text not null,
  recognized_text text not null,
  solution_steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists practice_sessions_set_updated_at on public.practice_sessions;
create trigger practice_sessions_set_updated_at before update on public.practice_sessions
for each row execute function public.set_updated_at();

drop trigger if exists mistakes_set_updated_at on public.mistakes;
create trigger mistakes_set_updated_at before update on public.mistakes
for each row execute function public.set_updated_at();

drop trigger if exists topic_stats_set_updated_at on public.topic_stats;
create trigger topic_stats_set_updated_at before update on public.topic_stats
for each row execute function public.set_updated_at();

drop trigger if exists daily_insights_set_updated_at on public.daily_insights;
create trigger daily_insights_set_updated_at before update on public.daily_insights
for each row execute function public.set_updated_at();

drop trigger if exists scan_results_set_updated_at on public.scan_results;
create trigger scan_results_set_updated_at before update on public.scan_results
for each row execute function public.set_updated_at();

insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Alex')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.questions (
  id, subject, category, title, body, image_url, difficulty, options,
  correct_option, correct_answer, explanation_steps, tags, created_at
)
values
(
  '10000000-0000-0000-0000-000000000001',
  '数学',
  '概率论',
  '第 1 题，共 20 题',
  '袋中有 5 个红球，4 个蓝球，3 个绿球。如果从中随机无放回地抽出 2 个球，两个都是红球的概率是多少？',
  null,
  '中等',
  '[{"id":"A","value":"25/144"},{"id":"B","value":"5/33"},{"id":"C","value":"1/6"},{"id":"D","value":"2/11"}]'::jsonb,
  'B',
  '5/33',
  '["总球数为 12，抽出 2 个球的组合数为 C(12,2)。","抽出 2 个红球的组合数为 C(5,2)。","概率为 C(5,2) / C(12,2) = 10 / 66 = 5/33。"]'::jsonb,
  array['概率论', '组合计数'],
  now() - interval '4 days'
),
(
  '10000000-0000-0000-0000-000000000002',
  '逻辑',
  '三段论逻辑',
  '第 2 题，共 20 题',
  '所有部件都是零件。有些零件是小工具。因此，有些部件必定是小工具。这个结论在逻辑上是否有效？',
  null,
  '中等',
  '[{"id":"A","value":"有效"},{"id":"B","value":"无效"},{"id":"C","value":"无法判断"},{"id":"D","value":"部分有效"}]'::jsonb,
  'B',
  '无效',
  '["前提只说明部件属于零件集合。","另一个前提说明零件集合中有一部分是小工具。","两部分集合不一定相交，因此无法推出有些部件必定是小工具。"]'::jsonb,
  array['逻辑', '三段论'],
  now() - interval '3 days'
),
(
  '10000000-0000-0000-0000-000000000003',
  '英语',
  '词汇辨析',
  '第 3 题，共 20 题',
  '选择最适合完成句子的单词：经理以他的____作风而闻名，即使在小细节上也经常拒绝妥协。',
  null,
  '中等',
  '[{"id":"A","value":"pragmatic"},{"id":"B","value":"intransigent"},{"id":"C","value":"amiable"},{"id":"D","value":"tentative"}]'::jsonb,
  'B',
  'intransigent',
  '["句子强调即使在小细节上也拒绝妥协。","intransigent 表示不妥协的、固执坚持立场的。","pragmatic 是务实的，不能表达拒绝妥协。"]'::jsonb,
  array['英语', '词汇'],
  now() - interval '2 days'
),
(
  '10000000-0000-0000-0000-000000000004',
  '定量推理',
  '方程求解',
  '第 4 题，共 20 题',
  '一家工厂生产 A、B 两类部件。A 类每件成本为 12 美元，B 类每件成本为 8 美元。如果某批次总成本为 820 美元，且 A 类部件数量为 15 件，那么 B 类部件生产了多少件？',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBWyVo4u_TwNPbsJIj4Xuefj7XpuGvSEY5r69L1SOr4_HKDcQtCA03Pmt8LSI9zcfsXJDIShE0GUE1RgbKyiG2chrzEnd25_GEOLwJJoalu6wK52doHeh2AnaV6ZsFLnIAbZ7SHD-hx05k5YPNbWykZs3tCnpah-e7D5BsUQYLOnMGj5l-wfzD15lbFYipF6xNRlJM5mXmREZnB2EBbFWlgj3FGiUDk0HTlkRN9l_3970v_tRz1RIz2hch--1xmELBEqSFgaEnwNro',
  '困难',
  '[{"id":"A","value":"50"},{"id":"B","value":"60"},{"id":"C","value":"80"},{"id":"D","value":"100"}]'::jsonb,
  'C',
  '80',
  '["A 类部件成本为 15 × 12 = 180 美元。","剩余成本为 820 - 180 = 640 美元。","B 类每件 8 美元，640 ÷ 8 = 80。"]'::jsonb,
  array['定量推理', '方程求解'],
  now() - interval '1 day'
)
on conflict (id) do update set
  subject = excluded.subject,
  category = excluded.category,
  title = excluded.title,
  body = excluded.body,
  image_url = excluded.image_url,
  difficulty = excluded.difficulty,
  options = excluded.options,
  correct_option = excluded.correct_option,
  correct_answer = excluded.correct_answer,
  explanation_steps = excluded.explanation_steps,
  tags = excluded.tags;

insert into public.practice_sessions (
  id, user_id, total_questions, current_index, score, time_left_seconds, status, completed_at
)
values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  20,
  4,
  3,
  765,
  'active',
  null
)
on conflict (id) do update set
  total_questions = excluded.total_questions,
  current_index = excluded.current_index,
  score = excluded.score,
  time_left_seconds = excluded.time_left_seconds,
  status = excluded.status,
  completed_at = excluded.completed_at;

insert into public.mistakes (
  id, user_id, question_id, subject, question, user_answer, correct_answer, ai_explanation, tags, source, created_at
)
values
(
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '数学',
  '袋中有 5 个红球，4 个蓝球，3 个绿球。如果从中随机无放回地抽出 2 个球，两个都是红球的概率是多少？',
  '25/144',
  '5/33',
  '["用组合数计算无放回抽样概率。"]'::jsonb,
  array['概率论', '组合计数'],
  'seed',
  now() - interval '5 days'
),
(
  '30000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '逻辑',
  '所有部件都是零件。有些零件是小工具。因此，有些部件必定是小工具。这个结论在逻辑上是否有效？',
  '有效',
  '无效',
  '["两个前提无法保证部件集合和小工具集合相交。"]'::jsonb,
  array['逻辑', '三段论'],
  'seed',
  now() - interval '3 days'
),
(
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  '英语',
  '选择最适合完成句子的单词：经理以他的____作风而闻名，即使在小细节上也经常拒绝妥协。',
  'pragmatic (务实的)',
  'intransigent (不妥协的)',
  '["intransigent 更贴合拒绝妥协的语义。"]'::jsonb,
  array['英语', '词汇'],
  'seed',
  now() - interval '1 day'
)
on conflict (id) do update set
  question = excluded.question,
  user_answer = excluded.user_answer,
  correct_answer = excluded.correct_answer,
  ai_explanation = excluded.ai_explanation,
  tags = excluded.tags;

insert into public.topic_stats (id, user_id, topic, accuracy, note, color)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '概率论', 35, '条件概率掌握薄弱。', 'error'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '资料分析', 52, '读表速度和比值计算需要加强。', 'tertiary'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '三段论逻辑', 68, '集合关系判断基本稳定。', 'secondary')
on conflict (id) do update set
  accuracy = excluded.accuracy,
  note = excluded.note,
  color = excluded.color;

insert into public.daily_insights (id, user_id, title, body, tags, suggested_action)
values (
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '每日 AI 洞察',
  '我注意到你在上次练习中对动态规划感到吃力。在编写代码之前将问题分解为较小的子问题通常会有所帮助。',
  array['算法', '动态规划'],
  '开始动态规划微课'
)
on conflict (id) do update set
  body = excluded.body,
  tags = excluded.tags,
  suggested_action = excluded.suggested_action;

insert into public.activities (id, user_id, type, title, subtitle, score, created_at)
values (
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'quiz',
  '数据结构测验',
  '昨天，晚上 8:45',
  92,
  now() - interval '1 day'
)
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  score = excluded.score;

insert into public.scan_results (
  id, user_id, image_url, category, recognized_text, solution_steps, tags
)
values (
  '70000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAKMG86gF4EFRSn03cLXqHynnFKSXyfJQZAKKI7jxRYXSbSmTYZhGyacqWaSw9YHKOkT5ZNDErY4Ixu_aPibvzQz8E__xD4TaCSrbd0yYbC1bn8xrbZhlrhmALk4nvEdmdSNJk1awKMSMCUTC_OjaYIXG-Lc0GQo_SgNAsh_v-vo5dg59xTpNbTBwRyusqDA87-KjDZ07x7811819TzfmdLqw15tDB_Lb-HxA0HCqqGRM343t76ZNc9ReNj1RgjujzqAvbbT1fbwTo',
  'MATH-CALC',
  '已知函数 f(x) = x³ - 3x² + 2x。求函数 f(x) 的极值点，并判断其是极大值还是极小值。',
  '[{"title":"第一步：求导数","text":"对原函数进行求导：f''(x) = 3x² - 6x + 2。"},{"title":"第二步：令导数为零","text":"解方程 3x² - 6x + 2 = 0，得到 x₁ = 1 + √3/3，x₂ = 1 - √3/3。"},{"title":"第三步：判断极值","text":"分析二阶导数 f''''(x) = 6x - 6，代入临界点判断凹凸性。"}]'::jsonb,
  array['一阶导数', '极值判定', '二次方程']
)
on conflict (id) do update set
  image_url = excluded.image_url,
  category = excluded.category,
  recognized_text = excluded.recognized_text,
  solution_steps = excluded.solution_steps,
  tags = excluded.tags;
