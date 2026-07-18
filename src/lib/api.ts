import type {
  AuthSession,
  AuthUser,
  CameraAnalysis,
  DashboardData,
  MistakeItem,
  MistakesData,
  PracticeQuestion,
  PracticeSessionData,
  SimilarQuestion,
  SubmitAnswerResult,
  WeakPoint,
} from '../types';

const importMeta = import.meta as unknown as {
  env?: {
    VITE_API_BASE_URL?: string;
    VITE_API_TIMEOUT_MS?: string;
    VITE_ENABLE_LOCAL_FALLBACK?: string;
  };
};
const API_BASE_URL = importMeta.env?.VITE_API_BASE_URL ?? '/api';
const API_TIMEOUT_MS = Number(importMeta.env?.VITE_API_TIMEOUT_MS ?? 25000);
const ENABLE_LOCAL_FALLBACK = importMeta.env?.VITE_ENABLE_LOCAL_FALLBACK !== 'false';
const AUTH_STORAGE_KEY = 'practice-ai-auth-session';
const GUEST_SESSION: AuthSession = {
  user: {
    id: 'guest-user',
    email: null,
    displayName: '游客',
  },
  accessToken: '',
  refreshToken: null,
  expiresAt: null,
  isGuest: true,
};

type LocalQuestion = PracticeQuestion & {
  correctOption: string;
  correctAnswer: string;
  explanationSteps: string[];
};

type SubmitAnswerPayload = {
  questionId: string;
  selectedOption: string;
  scratchpad: string;
  isMarked: boolean;
  timeLeftSeconds: number;
};

const localQuestions: LocalQuestion[] = [
  {
    id: 'local-question-1',
    subject: '数学',
    title: '概率基础',
    body: '袋中有 5 个红球、4 个蓝球、3 个绿球。从中无放回抽取 2 个球，两个都是红球的概率是多少？',
    imageUrl: null,
    difficulty: '中等',
    options: [
      { id: 'A', value: '25/144' },
      { id: 'B', value: '5/33' },
      { id: 'C', value: '1/6' },
      { id: 'D', value: '2/11' },
    ],
    correctOption: 'B',
    correctAnswer: '5/33',
    explanationSteps: [
      '总球数为 12，抽取 2 个球的组合数为 C(12,2)。',
      '抽出 2 个红球的组合数为 C(5,2)。',
      '概率为 C(5,2) / C(12,2) = 10 / 66 = 5/33。',
    ],
  },
  {
    id: 'local-question-2',
    subject: '逻辑',
    title: '三段论推理',
    body: '所有部件都是零件。有些零件是小工具。因此，有些部件必定是小工具。这个结论在逻辑上是否有效？',
    imageUrl: null,
    difficulty: '中等',
    options: [
      { id: 'A', value: '有效' },
      { id: 'B', value: '无效' },
      { id: 'C', value: '无法判断' },
      { id: 'D', value: '部分有效' },
    ],
    correctOption: 'B',
    correctAnswer: '无效',
    explanationSteps: [
      '前提只说明部件属于零件集合。',
      '另一个前提说明零件集合中有一部分是小工具。',
      '两个部分集合不一定相交，因此不能推出“有些部件必定是小工具”。',
    ],
  },
  {
    id: 'local-question-3',
    subject: '英语',
    title: '词汇辨析',
    body: 'Choose the best word: The manager was known for his ___ stance, refusing to compromise even on minor details.',
    imageUrl: null,
    difficulty: '中等',
    options: [
      { id: 'A', value: 'pragmatic' },
      { id: 'B', value: 'intransigent' },
      { id: 'C', value: 'amiable' },
      { id: 'D', value: 'tentative' },
    ],
    correctOption: 'B',
    correctAnswer: 'intransigent',
    explanationSteps: [
      '句子强调“拒绝妥协”。',
      'intransigent 表示不妥协的、固执坚持立场的。',
      'pragmatic 是务实的，不能表达拒绝妥协。',
    ],
  },
  {
    id: 'local-question-4',
    subject: '定量推理',
    title: '方程求解',
    body: '一家工厂生产 A、B 两类部件。A 类每件成本为 12 元，B 类每件成本为 8 元。若某批次总成本为 820 元，且 A 类部件数量为 15 件，那么 B 类部件生产了多少件？',
    imageUrl: null,
    difficulty: '困难',
    options: [
      { id: 'A', value: '50' },
      { id: 'B', value: '60' },
      { id: 'C', value: '80' },
      { id: 'D', value: '100' },
    ],
    correctOption: 'C',
    correctAnswer: '80',
    explanationSteps: [
      'A 类部件成本为 15 x 12 = 180 元。',
      '剩余成本为 820 - 180 = 640 元。',
      'B 类每件 8 元，所以 640 / 8 = 80。',
    ],
  },
];

const localWeakPoints: WeakPoint[] = [
  { id: 'local-weak-1', topic: '概率论', accuracy: 35, note: '条件概率与组合计数需要加强。', color: 'error' },
  { id: 'local-weak-2', topic: '资料分析', accuracy: 52, note: '读表速度和比值计算仍有提升空间。', color: 'tertiary' },
  { id: 'local-weak-3', topic: '三段论逻辑', accuracy: 68, note: '集合关系判断基本稳定。', color: 'secondary' },
];

let localMistakes: MistakeItem[] = [
  {
    id: 'local-mistake-1',
    subject: '数学',
    date: '5 天前',
    question: '袋中有 5 个红球、4 个蓝球、3 个绿球。从中无放回抽取 2 个球，两个都是红球的概率是多少？',
    userAnswer: 'A. 25/144',
    correctAnswer: 'B. 5/33',
    hasAiExplanation: true,
  },
  {
    id: 'local-mistake-2',
    subject: '逻辑',
    date: '3 天前',
    question: '所有部件都是零件。有些零件是小工具。因此，有些部件必定是小工具。这个结论在逻辑上是否有效？',
    userAnswer: 'A. 有效',
    correctAnswer: 'B. 无效',
    hasAiExplanation: true,
  },
  {
    id: 'local-mistake-3',
    subject: '英语',
    date: '1 天前',
    question: 'The manager was known for his ___ stance, refusing to compromise even on minor details.',
    userAnswer: 'A. pragmatic',
    correctAnswer: 'B. intransigent',
    hasAiExplanation: true,
  },
];

let localPracticeIndex = 4;
let localPracticeScore = 3;
let localPracticeTimeLeft = 765;
let localPracticeStatus: 'active' | 'completed' = 'active';

let localDashboardData: DashboardData = {
  profile: {
    id: 'local-demo-user',
    displayName: 'Alex',
  },
  exam: {
    title: '全国统考',
    daysLeft: 15,
  },
  progress: {
    label: '考试大纲',
    completion: 75,
    status: '进度正常',
  },
  recentActivities: [
    {
      id: 'local-activity-1',
      title: '数据结构测验',
      subtitle: '昨天，晚上 8:45',
      score: 92,
    },
    {
      id: 'local-activity-2',
      title: '概率论专项练习',
      subtitle: '3 天前',
      score: 78,
    },
  ],
  insight: {
    title: '每日 AI 洞察',
    text: '你最近在动态规划和条件概率题上耗时偏长。先把题目拆成状态、约束和目标，再写解法，会更容易稳定得分。',
    tags: ['算法', '概率论', '复盘'],
    suggestedAction: '开始专项练习',
  },
};

const localCameraImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
  <rect width="960" height="720" fill="#f7f9fc"/>
  <rect x="160" y="92" width="640" height="500" rx="22" fill="#fff" stroke="#d8dee9" stroke-width="6"/>
  <path d="M240 210h480M240 282h400M240 354h430M240 426h360" stroke="#52647a" stroke-width="22" stroke-linecap="round"/>
  <path d="M274 526c80-94 160-94 240 0 52-74 104-74 156 0" fill="none" stroke="#0057ff" stroke-width="20" stroke-linecap="round"/>
</svg>
`)}`;

const localCameraAnalysis: CameraAnalysis = {
  id: 'local-camera-analysis',
  imageUrl: localCameraImage,
  category: 'MATH-CALC',
  recognizedText: '已知函数 f(x) = x^3 - 3x^2 + 2x。求函数 f(x) 的极值点，并判断它是极大值还是极小值。',
  solutionSteps: [
    { title: '第一步：求导数', text: "对原函数求导，得到 f'(x) = 3x^2 - 6x + 2。" },
    { title: '第二步：令导数为零', text: "解方程 f'(x) = 0，得到两个临界点。" },
    { title: '第三步：判断极值', text: "结合二阶导数 f''(x) = 6x - 6 判断极大值和极小值。" },
  ],
  tags: ['一阶导数', '极值判断', '二次方程'],
};

interface ApiErrorBody {
  error?: string;
}

class ApiRequestError extends Error {
  readonly status?: number;
  readonly canUseFallback: boolean;

  constructor(message: string, options: { status?: number; canUseFallback: boolean; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.canUseFallback = options.canUseFallback;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback: number) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizeAuthSession(value: AuthSession): AuthSession {
  const raw = asRecord(value);
  const rawUser = asRecord(raw.user);
  const isGuest = raw.isGuest === true;
  const accessToken = asString(raw.accessToken, '');

  if (!isGuest && !accessToken) {
    throw new ApiRequestError('登录响应缺少访问令牌，请重试。', { canUseFallback: false });
  }

  return {
    user: {
      id: asString(rawUser.id, isGuest ? 'guest-user' : 'current-user'),
      email: asNullableString(rawUser.email),
      displayName: asString(rawUser.displayName, isGuest ? '游客' : '用户'),
    },
    accessToken,
    refreshToken: asNullableString(raw.refreshToken),
    expiresAt: raw.expiresAt === null || raw.expiresAt === undefined ? null : asNumber(raw.expiresAt, 0),
    isGuest: isGuest ? true : undefined,
  };
}

function normalizeDashboardData(value: DashboardData): DashboardData {
  const fallback = getLocalDashboardSnapshot();
  const raw = asRecord(value);
  const rawProfile = asRecord(raw.profile);
  const rawExam = asRecord(raw.exam);
  const rawProgress = asRecord(raw.progress);
  const rawInsight = asRecord(raw.insight);
  const rawActivities = Array.isArray(raw.recentActivities) ? raw.recentActivities : fallback.recentActivities;

  return {
    profile: {
      id: asString(rawProfile.id, fallback.profile.id),
      displayName: asString(rawProfile.displayName, fallback.profile.displayName),
    },
    exam: {
      title: asString(rawExam.title, fallback.exam.title),
      daysLeft: asNumber(rawExam.daysLeft, fallback.exam.daysLeft),
    },
    progress: {
      label: asString(rawProgress.label, fallback.progress.label),
      completion: Math.min(100, Math.max(0, asNumber(rawProgress.completion, fallback.progress.completion))),
      status: asString(rawProgress.status, fallback.progress.status),
    },
    recentActivities: rawActivities.map((activity, index) => {
      const rawActivity = asRecord(activity);
      const fallbackActivity = fallback.recentActivities[index] ?? fallback.recentActivities[0];
      const rawScore = rawActivity.score;

      return {
        id: asString(rawActivity.id, fallbackActivity?.id ?? `activity-${index}`),
        title: asString(rawActivity.title, fallbackActivity?.title ?? '学习活动'),
        subtitle: asString(rawActivity.subtitle, fallbackActivity?.subtitle ?? ''),
        score: rawScore === null || rawScore === undefined ? null : asNumber(rawScore, fallbackActivity?.score ?? 0),
      };
    }),
    insight: {
      title: asString(rawInsight.title, fallback.insight.title),
      text: asString(rawInsight.text, fallback.insight.text),
      tags: asStringArray(rawInsight.tags, fallback.insight.tags),
      suggestedAction: asString(rawInsight.suggestedAction, fallback.insight.suggestedAction),
    },
  };
}

function readStoredAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeAuthSession(JSON.parse(raw) as AuthSession);
    if (!parsed.user) return null;
    return parsed.isGuest || parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

let authSession: AuthSession | null = readStoredAuthSession();

function persistAuthSession(nextSession: AuthSession | null) {
  authSession = nextSession;
  if (typeof window === 'undefined') return;

  if (nextSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function getAuthHeaders(headers: Headers) {
  if (!authSession?.isGuest && authSession?.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authSession.accessToken}`);
  }
}

function getLocalDashboardSnapshot() {
  return clone(localDashboardData);
}

function getLocalQuestion(questionId?: string) {
  return localQuestions.find((question) => question.id === questionId) ?? localQuestions[(localPracticeIndex - 1) % localQuestions.length];
}

function getLocalPracticeSession(): PracticeSessionData {
  if (localPracticeStatus === 'completed') {
    return startLocalNextPracticeSet();
  }

  const { correctOption: _correctOption, correctAnswer: _correctAnswer, explanationSteps: _explanationSteps, ...question } =
    getLocalQuestion();

  return clone({
    session: {
      id: 'local-practice-session',
      currentIndex: localPracticeIndex,
      totalQuestions: 20,
      score: localPracticeScore,
      timeLeftSeconds: localPracticeTimeLeft,
      status: localPracticeStatus,
    },
    question,
  });
}

function startLocalNextPracticeSet(): PracticeSessionData {
  localPracticeIndex = 1;
  localPracticeScore = 0;
  localPracticeTimeLeft = 765;
  localPracticeStatus = 'active';
  return getLocalPracticeSession();
}

function getSelectedOptionText(question: LocalQuestion, selectedOption: string) {
  const option = question.options.find((item) => item.id === selectedOption);
  return option ? `${selectedOption}. ${option.value}` : selectedOption;
}

function addLocalMistake(question: LocalQuestion, selectedOption: string) {
  localMistakes = [
    {
      id: `local-mistake-${Date.now()}`,
      subject: question.subject,
      date: '刚刚',
      question: question.body,
      userAnswer: getSelectedOptionText(question, selectedOption),
      correctAnswer: `${question.correctOption}. ${question.correctAnswer}`,
      hasAiExplanation: question.explanationSteps.length > 0,
    },
    ...localMistakes,
  ];
}

function submitLocalAnswer(payload: SubmitAnswerPayload): SubmitAnswerResult {
  const question = getLocalQuestion(payload.questionId);
  const isCorrect = payload.selectedOption === question.correctOption;

  if (isCorrect) {
    localPracticeScore += 1;
  } else {
    addLocalMistake(question, payload.selectedOption);
  }

  const isSetComplete = localPracticeIndex >= 20;
  const answeredCount = isSetComplete ? 20 : localPracticeIndex;
  localPracticeIndex = isSetComplete ? localPracticeIndex : localPracticeIndex + 1;
  localPracticeTimeLeft = payload.timeLeftSeconds;
  localPracticeStatus = isSetComplete ? 'completed' : 'active';
  localDashboardData = {
    ...localDashboardData,
    progress: {
      ...localDashboardData.progress,
      completion: Math.min(100, Math.max(1, Math.round((answeredCount / 20) * 100))),
    },
    recentActivities: [
      {
        id: `local-activity-${Date.now()}`,
        title: `${question.subject}练习`,
        subtitle: '刚刚完成',
        score: Math.round((localPracticeScore / 20) * 100),
      },
      ...localDashboardData.recentActivities.slice(0, 4),
    ],
  };

  return clone({
    isCorrect,
    correctOption: question.correctOption,
    correctAnswer: question.correctAnswer,
    explanationSteps: question.explanationSteps,
    score: localPracticeScore,
    currentIndex: localPracticeIndex,
    totalQuestions: 20,
    isSetComplete,
    summary: isSetComplete
      ? {
          answeredCount: 20,
          totalQuestions: 20,
          score: localPracticeScore,
          accuracy: Math.round((localPracticeScore / 20) * 100),
          timeLeftSeconds: payload.timeLeftSeconds,
        }
      : undefined,
  });
}

function getLocalMistakes(params: { subject?: string; search?: string; offset?: number; limit?: number } = {}): MistakesData {
  const subject = params.subject ?? '全部错题';
  const search = (params.search ?? '').trim().toLowerCase();
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 10;
  const subjects = Array.from(new Set(localMistakes.map((item) => item.subject)));
  const filtered = localMistakes.filter((item) => {
    const matchesSubject = subject === '全部错题' || item.subject === subject;
    const haystack = `${item.subject} ${item.question} ${item.correctAnswer}`.toLowerCase();
    return matchesSubject && (!search || haystack.includes(search));
  });

  return clone({
    tabs: ['全部错题', ...subjects],
    mistakes: filtered.slice(offset, offset + limit),
    weakPoints: localWeakPoints,
  });
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  getAuthHeaders(headers);

  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  const abortFromCaller = () => controller.abort();

  try {
    if (init?.signal) {
      init.signal.addEventListener('abort', abortFromCaller, { once: true });
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `请求失败，HTTP ${response.status}`;
      try {
        const body = (await response.json()) as ApiErrorBody;
        if (body.error) message = body.error;
      } catch {
        // Keep the HTTP status message when the response is not JSON.
      }
      if (response.status === 401) persistAuthSession(null);
      throw new ApiRequestError(message, { status: response.status, canUseFallback: false });
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiRequestError('连接后端超时，已切换到本地快速数据。', {
        canUseFallback: true,
        cause: error,
      });
    }

    throw new ApiRequestError('连接后端失败，已切换到本地快速数据。', {
      canUseFallback: true,
      cause: error,
    });
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (init?.signal) init.signal.removeEventListener('abort', abortFromCaller);
  }
}

async function requestWithFallback<T>(
  path: string,
  init: RequestInit | undefined,
  fallback: () => T,
  timeoutMs = API_TIMEOUT_MS,
): Promise<T> {
  if (authSession?.isGuest) {
    return fallback();
  }

  try {
    return await request<T>(path, init, timeoutMs);
  } catch (error) {
    if (!ENABLE_LOCAL_FALLBACK) throw error;
    if (error instanceof ApiRequestError && !error.canUseFallback) throw error;
    console.warn(`[api] ${path} failed; using local fallback.`, error);
    return fallback();
  }
}

export const api = {
  getAuthSessionSnapshot() {
    return authSession;
  },

  clearAuthSession() {
    persistAuthSession(null);
  },

  startGuestSession() {
    const session = normalizeAuthSession(clone(GUEST_SESSION));
    persistAuthSession(session);
    return session;
  },

  async register(payload: { email: string; password: string; displayName: string }) {
    const session = normalizeAuthSession(await request<AuthSession>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      Math.max(API_TIMEOUT_MS, 5000),
    ));
    persistAuthSession(session);
    return session;
  },

  async login(payload: { email: string; password: string }) {
    const session = normalizeAuthSession(await request<AuthSession>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      Math.max(API_TIMEOUT_MS, 5000),
    ));
    persistAuthSession(session);
    return session;
  },

  async refreshAuthSession() {
    if (!authSession?.refreshToken) return null;

    const session = normalizeAuthSession(await request<AuthSession>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: authSession.refreshToken }),
        headers: {
          Authorization: `Bearer ${authSession.accessToken}`,
        },
      },
      Math.max(API_TIMEOUT_MS, 5000),
    ));
    persistAuthSession(session);
    return session;
  },

  async getCurrentUser() {
    if (!authSession) return null;
    if (authSession.isGuest) return authSession.user;

    const user = await request<AuthUser>('/auth/me', undefined, Math.max(API_TIMEOUT_MS, 5000));
    authSession = {
      ...authSession,
      user,
    };
    persistAuthSession(authSession);
    return user;
  },

  async logout() {
    const session = authSession;
    persistAuthSession(null);

    if (!session?.accessToken || session.isGuest) return;

    try {
      await request<{ ok: boolean }>(
        '/auth/logout',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
        Math.max(API_TIMEOUT_MS, 3000),
      );
    } catch {
      // Local logout already happened; server logout is best-effort.
    }
  },

  getDashboardSnapshot: getLocalDashboardSnapshot,

  getDashboard() {
    return requestWithFallback<DashboardData>(
      '/dashboard',
      undefined,
      getLocalDashboardSnapshot,
      Math.max(API_TIMEOUT_MS, 3000),
    ).then(normalizeDashboardData);
  },

  updateProfile(displayName: string) {
    return requestWithFallback<DashboardData['profile']>(
      '/profile',
      {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      },
      () => {
        localDashboardData = {
          ...localDashboardData,
          profile: {
            ...localDashboardData.profile,
            displayName,
          },
        };
        if (authSession?.isGuest) {
          persistAuthSession({
            ...authSession,
            user: {
              ...authSession.user,
              displayName,
            },
          });
        }
        return clone(localDashboardData.profile);
      },
      Math.max(API_TIMEOUT_MS, 2500),
    );
  },

  getPracticeSession() {
    return requestWithFallback<PracticeSessionData>('/practice/session', undefined, getLocalPracticeSession);
  },

  submitAnswer(payload: SubmitAnswerPayload) {
    return requestWithFallback<SubmitAnswerResult>(
      '/practice/submit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => submitLocalAnswer(payload),
      Math.max(API_TIMEOUT_MS, 2500),
    );
  },

  startNextPracticeSet() {
    return requestWithFallback<PracticeSessionData>(
      '/practice/next-set',
      {
        method: 'POST',
      },
      startLocalNextPracticeSet,
      Math.max(API_TIMEOUT_MS, 2500),
    );
  },

  getMistakes(params: { subject?: string; search?: string; offset?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.subject) query.set('subject', params.subject);
    if (params.search) query.set('search', params.search);
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return requestWithFallback<MistakesData>(`/mistakes${suffix}`, undefined, () => getLocalMistakes(params));
  },

  getCameraAnalysis() {
    return requestWithFallback<CameraAnalysis>('/camera/analysis', undefined, () => clone(localCameraAnalysis));
  },

  addCameraAnalysisToMistakes(analysisId: string) {
    return requestWithFallback<{ mistakeId: string }>(
      '/mistakes/from-scan',
      {
        method: 'POST',
        body: JSON.stringify({ analysisId }),
      },
      () => {
        const mistakeId = `local-scan-mistake-${Date.now()}`;
        localMistakes = [
          {
            id: mistakeId,
            subject: '数学',
            date: '刚刚',
            question: localCameraAnalysis.recognizedText,
            userAnswer: '拍照搜题收录',
            correctAnswer: '见 AI 解析',
            hasAiExplanation: true,
          },
          ...localMistakes,
        ];
        return { mistakeId };
      },
      Math.max(API_TIMEOUT_MS, 2500),
    );
  },

  searchSimilarQuestions(analysisId: string) {
    return requestWithFallback<{ items: SimilarQuestion[] }>(
      '/camera/search-similar',
      {
        method: 'POST',
        body: JSON.stringify({ analysisId }),
      },
      () => ({
        items: localQuestions.slice(0, 3).map((question) => ({
          id: question.id,
          subject: question.subject,
          question: question.body,
          correctAnswer: question.correctAnswer,
        })),
      }),
      Math.max(API_TIMEOUT_MS, 2500),
    );
  },
};
