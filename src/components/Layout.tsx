import {
  BookOpen,
  BookX,
  Camera,
  Home,
  LogOut,
  User,
} from 'lucide-react';
import React from 'react';
import { AuthUser, ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user: AuthUser;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Layout({ currentView, onChangeView, user, onLogout, children }: LayoutProps) {
  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'practice', label: '练习', icon: BookOpen },
    { id: 'camera', label: '搜题', icon: Camera },
    { id: 'mistakes', label: '错题本', icon: BookX },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-50 flex justify-between items-center w-full px-4 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-primary">笔试AI助手</span>
        </div>
        <button
          onClick={onLogout}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-primary"
          title="退出登录"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-outline-variant/30 bg-surface-container-lowest shrink-0 z-40">
        <div className="p-10 flex items-center gap-3">
          <span className="text-2xl font-bold text-primary">笔试AI助手</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-container">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary truncate">{user.displayName}</p>
              <p className="text-xs text-on-surface-variant truncate">{user.email ?? '已登录'}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        <div className="flex-1 w-full">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 rounded-t-2xl bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center px-4 pb-6 pt-3">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${
                  isActive
                    ? 'text-on-primary bg-primary rounded-2xl px-5 py-2 shadow-sm transform -translate-y-2'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-xl'
                }`}
              >
                <item.icon className={`w-5 h-5 mb-1`} />
                <span className={`text-[10px] sm:text-xs ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
