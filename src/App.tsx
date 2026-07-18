/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrainCircuit, Loader2, LogIn, Play, UserPlus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { CameraView } from './components/CameraView';
import { DashboardView } from './components/DashboardView';
import { Layout } from './components/Layout';
import { MistakesView } from './components/MistakesView';
import { PracticeView } from './components/PracticeView';
import { api } from './lib/api';
import { AuthSession, Profile, ViewState } from './types';

type AuthMode = 'login' | 'register';

function AuthView({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const action = isRegister
      ? api.register({ email, password, displayName: displayName.trim() || email.split('@')[0] || 'Alex' })
      : api.login({ email, password });

    action
      .then(onAuthenticated)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsSubmitting(false));
  };

  const handleGuest = () => {
    onAuthenticated(api.startGuestSession());
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">笔试AI助手</h1>
            <p className="text-sm text-on-surface-variant">{isRegister ? '创建你的学习账号' : '登录后继续练习'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2.5 rounded-lg text-sm font-bold transition-colors ${
              !isRegister ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2.5 rounded-lg text-sm font-bold transition-colors ${
              isRegister ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            注册
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-error-container border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <label className="block">
              <span className="block text-sm font-medium text-on-surface-variant mb-2">昵称</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="Alex"
                maxLength={30}
              />
            </label>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-on-surface-variant mb-2">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-on-surface-variant mb-2">密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
              placeholder="至少 6 位"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {isSubmitting ? '处理中...' : isRegister ? '创建账号' : '登录'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuest}
          disabled={isSubmitting}
          className="mt-4 w-full border border-outline-variant/50 text-primary rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-colors disabled:opacity-60"
        >
          <Play className="w-4 h-4" />
          游客体验
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => api.getAuthSessionSnapshot());
  const [isCheckingAuth, setIsCheckingAuth] = useState(() => Boolean(api.getAuthSessionSnapshot()));

  useEffect(() => {
    let ignore = false;
    if (!api.getAuthSessionSnapshot()) return;

    api
      .getCurrentUser()
      .then((user) => {
        if (ignore) return;
        const session = api.getAuthSessionSnapshot();
        setAuthSession(session && user ? { ...session, user } : null);
      })
      .catch(() => {
        api.clearAuthSession();
        if (!ignore) setAuthSession(null);
      })
      .finally(() => {
        if (!ignore) setIsCheckingAuth(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    setAuthSession(session);
    setCurrentView('home');
  };

  const handleLogout = () => {
    api.logout().finally(() => {
      setAuthSession(null);
      setCurrentView('home');
    });
  };

  const handleProfileChange = (profile: Profile) => {
    setAuthSession((current) =>
      current
        ? {
            ...current,
            user: {
              ...current.user,
              displayName: profile.displayName,
            },
          }
        : current,
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardView onChangeView={setCurrentView} onProfileChange={handleProfileChange} />;
      case 'practice':
        return <PracticeView onCompleteSet={() => setCurrentView('home')} />;
      case 'camera':
        return <CameraView />;
      case 'mistakes':
        return <MistakesView />;
      default:
        return <DashboardView onChangeView={setCurrentView} onProfileChange={handleProfileChange} />;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!authSession) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView} user={authSession.user} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
}
