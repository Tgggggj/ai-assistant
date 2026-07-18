import { BookOpen, BrainCircuit, Play, Search, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DashboardData, Profile, ViewState } from '../types';

interface DashboardViewProps {
  onChangeView: (view: ViewState) => void;
  onProfileChange?: (profile: Profile) => void;
}

export function DashboardView({ onChangeView, onProfileChange }: DashboardViewProps) {
  const [startingCourse, setStartingCourse] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(() => api.getDashboardSnapshot());
  const [userName, setUserName] = useState(() => api.getDashboardSnapshot().profile.displayName);
  const [error, setError] = useState<string | null>(null);
  const progressCircle = 251.2;
  const progress = dashboard?.progress.completion ?? 0;

  useEffect(() => {
    let ignore = false;

    api
      .getDashboard()
      .then((data) => {
        if (ignore) return;
        setDashboard(data);
        setUserName(data.profile.displayName);
        setError(null);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleStartCourse = () => {
    setStartingCourse(true);
    setTimeout(() => {
      setStartingCourse(false);
      onChangeView('practice');
    }, 600);
  };

  const handleSaveName = () => {
    const nextName = userName.trim();
    if (!nextName || nextName === dashboard?.profile.displayName) return;

    api
      .updateProfile(nextName)
      .then((profile) => {
        setDashboard((current) => (current ? { ...current, profile } : current));
        onProfileChange?.(profile);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 23) return '晚上好';
    return '夜深了';
  };

  if (!dashboard && !error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-on-surface-variant">
          正在从后端加载学习数据...
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-error-container border border-error/20 rounded-2xl p-8 text-on-error-container">
          {error ?? '无法加载仪表盘数据'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 md:py-8">
      {error && (
        <div className="mb-4 bg-error-container border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      <section className="mb-8 md:mb-12">
        <div className="flex items-center mb-2 flex-wrap">
          <h2 className="text-3xl font-bold text-primary whitespace-nowrap">{getGreeting()}，</h2>
          <div className="relative group flex items-center">
            <input
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="text-3xl font-bold text-primary bg-transparent border-b-2 border-transparent hover:border-outline-variant/50 focus:border-primary focus:outline-none transition-colors max-w-[180px]"
              placeholder="输入你的名字"
            />
          </div>
          <h2 className="text-3xl font-bold text-primary">。</h2>
        </div>
        <p className="text-on-surface-variant text-base md:text-lg">
          准备好今天攻克你的学习目标了吗？
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
        <div className="md:col-span-8 flex flex-col gap-5 md:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-tertiary-fixed rounded-full opacity-50 blur-3xl"></div>
              <span className="text-sm font-medium text-on-surface-variant uppercase tracking-wider mb-2 z-10">
                {dashboard.exam.title}
              </span>
              <div className="flex items-baseline gap-2 z-10">
                <span className="text-5xl font-bold text-primary">{dashboard.exam.daysLeft}</span>
                <span className="text-xl text-on-surface-variant font-medium">天</span>
              </div>
              <p className="text-sm text-primary mt-3 flex items-center gap-1 z-10">
                <TrendingUp className="w-4 h-4" /> 继续保持势头！
              </p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-primary mb-1">{dashboard.progress.label}</h3>
              <p className="text-on-surface-variant text-sm mb-4">总体完成度</p>

              <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 mb-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <g transform="rotate(-90 50 50)">
                    <circle
                      className="text-surface-variant stroke-current"
                      strokeWidth="8"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                    ></circle>
                    <circle
                      className="text-secondary stroke-current"
                      strokeWidth="8"
                      strokeLinecap="round"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      strokeDasharray={progressCircle}
                      strokeDashoffset={progressCircle - progressCircle * (progress / 100)}
                    ></circle>
                  </g>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl md:text-2xl font-bold text-primary">{progress}%</span>
                </div>
              </div>

              <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-medium">
                {dashboard.progress.status}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              快速操作
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <button
                onClick={() => onChangeView('practice')}
                className="bg-surface-container-lowest border border-outline-variant/30 p-5 rounded-2xl flex flex-col items-start gap-3 hover:bg-surface-container-high transition-colors text-left group shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-primary mb-1">
                    AI 模拟测试
                  </span>
                  <span className="text-xs text-on-surface-variant">自适应评估</span>
                </div>
              </button>

              <button
                onClick={() => onChangeView('practice')}
                className="bg-surface-container-lowest border border-outline-variant/30 p-5 rounded-2xl flex flex-col items-start gap-3 hover:bg-surface-container-high transition-colors text-left group shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-primary mb-1">
                    专项练习
                  </span>
                  <span className="text-xs text-on-surface-variant">专注特定领域</span>
                </div>
              </button>

              <button
                onClick={() => onChangeView('mistakes')}
                className="bg-surface-container-lowest border border-outline-variant/30 p-5 rounded-2xl flex flex-col items-start gap-3 hover:bg-surface-container-high transition-colors text-left group shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-on-error-container group-hover:scale-110 transition-transform">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-primary mb-1">
                    弱点分析
                  </span>
                  <span className="text-xs text-on-surface-variant">回顾近期错题</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-primary mb-4">最近活动</h3>
            <div className="flex flex-col gap-3">
              {dashboard.recentActivities.length === 0 ? (
                <p className="text-sm text-on-surface-variant">暂无活动记录。</p>
              ) : (
                dashboard.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 border border-outline-variant/30 rounded-xl bg-surface"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-outline" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{activity.title}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{activity.subtitle}</p>
                      </div>
                    </div>
                    {activity.score !== null && (
                      <span className="text-base font-bold text-secondary">{activity.score}%</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-4 h-full">
          <aside className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 h-full flex flex-col shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BrainCircuit className="text-tertiary w-6 h-6" />
              <h3 className="text-xl font-bold bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">
                {dashboard.insight.title}
              </h3>
            </div>

            <div className="flex-grow flex flex-col gap-6">
              <div className="bg-surface rounded-xl p-5 border border-outline-variant/20 relative mt-2">
                <div className="absolute -top-4 -left-3 text-tertiary bg-surface-container-lowest rounded-full p-2 border border-outline-variant/20 shadow-sm">
                  <span className="font-serif text-2xl leading-none">"</span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed pt-2">
                  {dashboard.insight.text}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dashboard.insight.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-surface-container-high rounded-md text-on-surface-variant font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4">
                <p className="text-xs text-on-surface-variant mb-3 text-center font-medium">今日建议操作</p>
                <button
                  onClick={handleStartCourse}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {startingCourse ? '加载中...' : dashboard.insight.suggestedAction}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
