import express, { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = Number(process.env.PORT ?? 8787);
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';
const DEFAULT_TOTAL_QUESTIONS = 20;
const DEFAULT_TIME_LEFT_SECONDS = 765;
const QUESTION_COUNT_CACHE_TTL_MS = 60_000; // 1 分钟内复用，避免每次取题都 COUNT

let cachedQuestionCount: { count: number; timestamp: number } | null = null;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncRoute(route: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    route(req, res, next).catch(next);
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function mapProfile(row: any) {
  return {
    id: row.id,
    displayName: row.display_name,
  };
}

function mapQuestion(row: any) {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    difficulty: row.difficulty,
    options: row.options ?? [],
  };
}

function mapMistake(row: any) {
  return {
    id: row.id,
    subject: row.subject,
    date: formatDate(row.created_at),
    question: row.question,
    userAnswer: row.user_answer,
    correctAnswer: row.correct_answer,
    hasAiExplanation: Boolean(row.ai_explanation),
  };
}

function mapWeakPoint(row: any) {
  return {
    id: row.id,
    topic: row.topic,
    accuracy: Number(row.accuracy),
    note: row.note,
    color: row.color ?? 'primary',
  };
}

function mapCameraAnalysis(row: any) {
  return {
    id: row.id,
    imageUrl: row.image_url,
    category: row.category,
    recognizedText: row.recognized_text,
    solutionSteps: row.solution_steps ?? [],
    tags: row.tags ?? [],
  };
}

function mapPracticeSession(row: any) {
  return {
    id: row.id,
    currentIndex: row.current_index,
    totalQuestions: row.total_questions,
    score: row.score,
    timeLeftSeconds: row.time_left_seconds,
    status: row.status ?? 'active',
  };
}

function buildPracticeSummary(params: {
  answeredCount: number;
  totalQuestions: number;
  score: number;
  timeLeftSeconds: number;
}) {
  return {
    answeredCount: params.answeredCount,
    totalQuestions: params.totalQuestions,
    score: params.score,
    accuracy: Math.round((params.score / Math.max(params.totalQuestions, 1)) * 100),
    timeLeftSeconds: params.timeLeftSeconds,
  };
}

async function ensureProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', DEMO_USER_ID)
    .maybeSingle();

  if (error) throw error;
  if (data) return mapProfile(data);

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({ id: DEMO_USER_ID, display_name: 'Alex' })
    .select('id, display_name')
    .single();

  if (createError) throw createError;
  return mapProfile(created);
}

async function ensurePracticeSession() {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', DEMO_USER_ID)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    // 修复旧 session 可能存在的 totalQuestions 异常（曾出现过 675 的情况）
    if (data.total_questions !== DEFAULT_TOTAL_QUESTIONS) {
      const { error: fixError } = await supabase
        .from('practice_sessions')
        .update({ total_questions: DEFAULT_TOTAL_QUESTIONS })
        .eq('id', data.id);
      if (fixError) throw fixError;
      data.total_questions = DEFAULT_TOTAL_QUESTIONS;
    }
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: DEMO_USER_ID,
      total_questions: DEFAULT_TOTAL_QUESTIONS,
      current_index: 1,
      score: 0,
      time_left_seconds: DEFAULT_TIME_LEFT_SECONDS,
      status: 'active',
      completed_at: null,
    })
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

async function getQuestionCount() {
  const now = Date.now();
  if (cachedQuestionCount && now - cachedQuestionCount.timestamp < QUESTION_COUNT_CACHE_TTL_MS) {
    return cachedQuestionCount.count;
  }

  const { count, error } = await supabase.from('questions').select('id', {
    count: 'exact',
    head: true,
  });

  if (error) throw error;
  cachedQuestionCount = { count: count ?? 0, timestamp: now };
  return count ?? 0;
}

async function getQuestionAtIndex(index: number) {
  const questionCount = await getQuestionCount();
  if (questionCount === 0) {
    throw new Error('Supabase 中没有题目数据，请先执行 supabase/schema.sql。');
  }

  const offset = ((Math.max(index, 1) - 1) % questionCount + questionCount) % questionCount;
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: true })
    .range(offset, offset)
    .single();

  if (error) throw error;
  return data;
}

function getSelectedAnswerText(question: any, selectedOption: string) {
  const options = Array.isArray(question.options) ? question.options : [];
  const option = options.find((item: any) => item.id === selectedOption);
  return option ? `${selectedOption}. ${option.value}` : selectedOption;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: 'supabase',
  });
});

app.get(
  '/api/dashboard',
  asyncRoute(async (_req, res) => {
    const [
      profile,
      { data: activities, error: activitiesError },
      { data: insight, error: insightError },
      { count: questionCount, error: questionCountError },
      { data: attempts, error: attemptsError },
    ] = await Promise.all([
      ensureProfile(),
      supabase
        .from('activities')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('daily_insights')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('answer_attempts')
        .select('is_correct')
        .eq('user_id', DEMO_USER_ID),
    ]);

    if (activitiesError) throw activitiesError;
    if (insightError) throw insightError;
    if (questionCountError) throw questionCountError;
    if (attemptsError) throw attemptsError;

    const completionBase = questionCount ?? 20;
    const completion =
      attempts && attempts.length > 0
        ? clamp(Math.round((attempts.length / Math.max(completionBase, 1)) * 100), 1, 100)
        : 75;

    res.json({
      profile,
      exam: {
        title: process.env.EXAM_TITLE ?? '全国统考',
        daysLeft: Number(process.env.EXAM_DAYS_LEFT ?? 15),
      },
      progress: {
        label: '考试大纲',
        completion,
        status: completion >= 70 ? '进度正常' : '需要加速',
      },
      recentActivities: (activities ?? []).map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        subtitle: activity.subtitle,
        score: activity.score,
      })),
      insight: {
        title: insight?.title ?? '每日 AI 洞察',
        text:
          insight?.body ??
          '我注意到你在上次练习中对动态规划感到吃力。在编写代码之前将问题分解为较小的子问题通常会有所帮助。',
        tags: insight?.tags ?? ['算法', '动态规划'],
        suggestedAction: insight?.suggested_action ?? '开始动态规划微课',
      },
    });
  }),
);

app.patch(
  '/api/profile',
  asyncRoute(async (req, res) => {
    const displayName = String(req.body?.displayName ?? '').trim();
    if (!displayName) {
      res.status(400).json({ error: '请输入用户名。' });
      return;
    }

    await ensureProfile();
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', DEMO_USER_ID)
      .select('id, display_name')
      .single();

    if (error) throw error;
    res.json(mapProfile(data));
  }),
);

app.get(
  '/api/practice/session',
  asyncRoute(async (_req, res) => {
    // 不调用 ensureProfile — profile 由 seed SQL 保证存在，且 ensurePracticeSession 创建时的 FK 约束自动兜底
    const session = await ensurePracticeSession();
    const question = await getQuestionAtIndex(session.current_index);

    res.json({
      session: mapPracticeSession(session),
      question: mapQuestion(question),
    });
  }),
);

app.post(
  '/api/practice/submit',
  asyncRoute(async (req, res) => {
    const questionId = String(req.body?.questionId ?? '');
    const selectedOption = String(req.body?.selectedOption ?? '');
    const scratchpad = String(req.body?.scratchpad ?? '');
    const isMarked = Boolean(req.body?.isMarked);
    const timeLeftSeconds = Number(req.body?.timeLeftSeconds ?? 0);

    if (!selectedOption) {
      res.status(400).json({ error: '缺少答案。' });
      return;
    }

    const session = await ensurePracticeSession();
    const question = await getQuestionAtIndex(session.current_index);

    // 服务端校验：确保提交的 questionId 确实是当前 session 的题目
    if (questionId && questionId !== question.id) {
      res.status(400).json({ error: '提交的题目与当前会话不匹配，请刷新后重试。' });
      return;
    }

    const isCorrect = selectedOption === question.correct_option;
    const userAnswer = getSelectedAnswerText(question, selectedOption);

    const { error: attemptError } = await supabase.from('answer_attempts').insert({
      user_id: DEMO_USER_ID,
      question_id: question.id,
      selected_option: selectedOption,
      scratchpad,
      is_correct: isCorrect,
      is_marked: isMarked,
      time_spent_seconds: Math.max(0, session.time_left_seconds - timeLeftSeconds),
    });
    if (attemptError) throw attemptError;

    if (!isCorrect) {
      const { error: mistakeError } = await supabase.from('mistakes').insert({
        user_id: DEMO_USER_ID,
        question_id: question.id,
        subject: question.subject,
        question: question.body,
        user_answer: userAnswer,
        correct_answer: `${question.correct_option}. ${question.correct_answer}`,
        ai_explanation: question.explanation_steps ?? [],
        tags: question.tags ?? [],
        source: 'practice',
      });
      if (mistakeError) throw mistakeError;
    }

    const isSetComplete = session.current_index >= session.total_questions;
    const nextIndex = isSetComplete ? session.current_index : session.current_index + 1;
    const nextScore = session.score + (isCorrect ? 1 : 0);

    const { error: sessionError } = await supabase
      .from('practice_sessions')
      .update({
        current_index: nextIndex,
        score: nextScore,
        time_left_seconds: timeLeftSeconds,
        status: isSetComplete ? 'completed' : 'active',
        completed_at: isSetComplete ? new Date().toISOString() : null,
      })
      .eq('id', session.id);
    if (sessionError) throw sessionError;

    const { error: activityError } = await supabase.from('activities').insert({
      user_id: DEMO_USER_ID,
      type: 'practice',
      title: `${question.subject}练习`,
      subtitle: `刚刚完成第 ${session.current_index} 题`,
      score: Math.round((nextScore / session.total_questions) * 100),
    });
    if (activityError) throw activityError;

    res.json({
      isCorrect,
      correctOption: question.correct_option,
      correctAnswer: question.correct_answer,
      explanationSteps: question.explanation_steps ?? [],
      score: nextScore,
      currentIndex: nextIndex,
      totalQuestions: session.total_questions,
      isSetComplete,
      summary: isSetComplete
        ? buildPracticeSummary({
            answeredCount: session.total_questions,
            totalQuestions: session.total_questions,
            score: nextScore,
            timeLeftSeconds,
          })
        : undefined,
    });
  }),
);

app.post(
  '/api/practice/next-set',
  asyncRoute(async (_req, res) => {
    await ensureProfile();

    const now = new Date().toISOString();
    const { error: closeError } = await supabase
      .from('practice_sessions')
      .update({ status: 'completed', completed_at: now })
      .eq('user_id', DEMO_USER_ID)
      .eq('status', 'active');
    if (closeError) throw closeError;

    const { data: session, error: createError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: DEMO_USER_ID,
        total_questions: DEFAULT_TOTAL_QUESTIONS,
        current_index: 1,
        score: 0,
        time_left_seconds: DEFAULT_TIME_LEFT_SECONDS,
        status: 'active',
        completed_at: null,
      })
      .select('*')
      .single();
    if (createError) throw createError;

    const question = await getQuestionAtIndex(1);

    res.json({
      session: mapPracticeSession(session),
      question: mapQuestion(question),
    });
  }),
);

app.get(
  '/api/mistakes',
  asyncRoute(async (req, res) => {
    const subject = String(req.query.subject ?? '全部错题');
    const search = String(req.query.search ?? '').trim().toLowerCase();
    const offset = clamp(Number(req.query.offset ?? 0), 0, 10000);
    const limit = clamp(Number(req.query.limit ?? 10), 1, 50);

    const [{ data: mistakes, error: mistakesError }, { data: weakPoints, error: weakPointsError }] =
      await Promise.all([
        supabase
          .from('mistakes')
          .select('*')
          .eq('user_id', DEMO_USER_ID)
          .order('created_at', { ascending: false }),
        supabase
          .from('topic_stats')
          .select('*')
          .eq('user_id', DEMO_USER_ID)
          .order('accuracy', { ascending: true }),
      ]);

    if (mistakesError) throw mistakesError;
    if (weakPointsError) throw weakPointsError;

    const filtered = (mistakes ?? []).filter((item: any) => {
      const matchesSubject = subject === '全部错题' || item.subject === subject;
      const haystack = `${item.subject} ${item.question} ${item.correct_answer} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesSubject && matchesSearch;
    });

    const subjects = Array.from(new Set((mistakes ?? []).map((item: any) => item.subject).filter(Boolean)));

    res.json({
      tabs: ['全部错题', ...subjects],
      mistakes: filtered.slice(offset, offset + limit).map(mapMistake),
      weakPoints: (weakPoints ?? []).map(mapWeakPoint),
    });
  }),
);

app.get(
  '/api/camera/analysis',
  asyncRoute(async (_req, res) => {
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: '没有拍照识别结果，请先执行 supabase/schema.sql。' });
      return;
    }

    res.json(mapCameraAnalysis(data));
  }),
);

app.post(
  '/api/mistakes/from-scan',
  asyncRoute(async (req, res) => {
    const analysisId = String(req.body?.analysisId ?? '');
    const query = supabase.from('scan_results').select('*').eq('user_id', DEMO_USER_ID);
    const { data, error } = analysisId
      ? await query.eq('id', analysisId).single()
      : await query.order('created_at', { ascending: false }).limit(1).single();

    if (error) throw error;

    const { data: created, error: createError } = await supabase
      .from('mistakes')
      .insert({
        user_id: DEMO_USER_ID,
        subject: '数学',
        question: data.recognized_text,
        user_answer: '拍照搜题收录',
        correct_answer: '见 AI 解析',
        ai_explanation: data.solution_steps ?? [],
        tags: data.tags ?? [],
        source: 'scan',
      })
      .select('id')
      .single();

    if (createError) throw createError;
    res.json({ mistakeId: created.id });
  }),
);

app.post(
  '/api/camera/search-similar',
  asyncRoute(async (_req, res) => {
    const { data, error } = await supabase
      .from('questions')
      .select('id, subject, body, correct_answer')
      .order('created_at', { ascending: true })
      .limit(3);

    if (error) throw error;

    res.json({
      items: (data ?? []).map((item: any) => ({
        id: item.id,
        subject: item.subject,
        question: item.body,
        correctAnswer: item.correct_answer,
      })),
    });
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : '服务器内部错误';
  console.error(error);
  res.status(500).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

export { app };
