export type ViewState = 'home' | 'practice' | 'camera' | 'mistakes';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  isGuest?: boolean;
}

export interface Profile {
  id: string;
  displayName: string;
}

export interface DashboardActivity {
  id: string;
  title: string;
  subtitle: string;
  score: number | null;
}

export interface DashboardInsight {
  title: string;
  text: string;
  tags: string[];
  suggestedAction: string;
}

export interface DashboardData {
  profile: Profile;
  exam: {
    title: string;
    daysLeft: number;
  };
  progress: {
    label: string;
    completion: number;
    status: string;
  };
  recentActivities: DashboardActivity[];
  insight: DashboardInsight;
}

export interface QuestionOption {
  id: string;
  value: string;
}

export interface PracticeQuestion {
  id: string;
  subject: string;
  title: string;
  body: string;
  imageUrl: string | null;
  difficulty: string;
  options: QuestionOption[];
}

export interface PracticeSessionData {
  session: {
    id: string;
    currentIndex: number;
    totalQuestions: number;
    score: number;
    timeLeftSeconds: number;
    status: 'active' | 'completed';
  };
  question: PracticeQuestion;
}

export interface PracticeSetSummary {
  answeredCount: number;
  totalQuestions: number;
  score: number;
  accuracy: number;
  timeLeftSeconds: number;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  correctOption: string;
  correctAnswer: string;
  explanationSteps: string[];
  score: number;
  currentIndex: number;
  totalQuestions: number;
  isSetComplete: boolean;
  summary?: PracticeSetSummary;
}

export interface MistakeItem {
  id: string;
  subject: string;
  date: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  hasAiExplanation: boolean;
}

export interface WeakPoint {
  id: string;
  topic: string;
  accuracy: number;
  note: string | null;
  color: 'error' | 'tertiary' | 'secondary' | 'primary';
}

export interface MistakesData {
  tabs: string[];
  mistakes: MistakeItem[];
  weakPoints: WeakPoint[];
}

export interface SolutionStep {
  title: string;
  text: string;
}

export interface CameraAnalysis {
  id: string;
  imageUrl: string;
  category: string;
  recognizedText: string;
  solutionSteps: SolutionStep[];
  tags: string[];
}

export interface SimilarQuestion {
  id: string;
  subject: string;
  question: string;
  correctAnswer: string;
}
