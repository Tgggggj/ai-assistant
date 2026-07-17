import { BrainCircuit, Check, ChevronDown, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MistakeItem, MistakesData, WeakPoint } from '../types';

const PAGE_SIZE = 10;

function subjectClass(subject: string) {
  if (subject === '数学') return 'bg-error-container text-on-error-container';
  if (subject === '逻辑') return 'bg-tertiary-fixed text-on-tertiary-fixed';
  return 'bg-primary-fixed text-on-primary-fixed';
}

function weakPointColorClass(point: WeakPoint) {
  if (point.color === 'error') return 'text-error';
  if (point.color === 'tertiary') return 'text-tertiary';
  if (point.color === 'secondary') return 'text-secondary';
  return 'text-primary';
}

function weakPointBarClass(point: WeakPoint) {
  if (point.color === 'error') return 'bg-error';
  if (point.color === 'tertiary') return 'bg-tertiary';
  if (point.color === 'secondary') return 'bg-secondary';
  return 'bg-primary';
}

export function MistakesView() {
  const [activeTab, setActiveTab] = useState('全部错题');
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<MistakesData | null>(null);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMistakes = (nextOffset = 0, append = false) => {
    setIsLoading(true);
    api
      .getMistakes({
        subject: activeTab,
        search: searchText,
        offset: nextOffset,
        limit: PAGE_SIZE,
      })
      .then((nextData) => {
        setData((current) =>
          append && current
            ? {
                ...nextData,
                mistakes: [...current.mistakes, ...nextData.mistakes],
              }
            : nextData,
        );
        setOffset(nextOffset);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadMistakes(0, false);
  }, [activeTab, searchText]);

  const mistakes = data?.mistakes ?? [];
  const tabs = data?.tabs ?? ['全部错题'];
  const weakPoints = data?.weakPoints ?? [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 md:py-8 flex flex-col gap-6">
      {error && (
        <div className="bg-error-container border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">错题本</h2>
          <p className="text-sm text-on-surface-variant mt-1">AI 提炼的知识盲区，针对性复习。</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索题目、主题或标签..."
            className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant/50 rounded-full text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
      </section>

      <section className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
              activeTab === tab
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {tab}
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-tertiary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">AI 诊断</h3>
                <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">刚刚更新</p>
              </div>
            </div>

            <div className="space-y-6">
              {weakPoints.length === 0 ? (
                <p className="text-sm text-on-surface-variant">暂无弱点统计。</p>
              ) : (
                weakPoints.map((point) => (
                  <div key={point.id}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-on-surface">{point.topic}</span>
                      <span className={`text-xs font-bold ${weakPointColorClass(point)}`}>
                        正确率 {point.accuracy}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full relative ${weakPointBarClass(point)}`}
                        style={{ width: `${point.accuracy}%` }}
                      ></div>
                    </div>
                    {point.note && (
                      <p className="text-xs text-on-surface-variant mt-2">{point.note}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => loadMistakes(0, false)}
              className="w-full mt-8 py-3.5 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              重新生成 AI 诊断
            </button>
          </div>
        </aside>

        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-primary">近期错题</h3>
            <button className="flex items-center gap-1 text-xs font-bold text-outline hover:text-primary transition-colors">
              排序：按时间
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {isLoading && mistakes.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 text-sm text-on-surface-variant">
              正在加载错题...
            </div>
          ) : mistakes.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 text-sm text-on-surface-variant">
              没有匹配的错题记录。
            </div>
          ) : (
            mistakes.map((item: MistakeItem, index) => (
              <div
                key={item.id}
                className={`bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${index > 2 ? 'opacity-90' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${subjectClass(item.subject)}`}>
                      {item.subject}
                    </span>
                    {item.hasAiExplanation && (
                      <span className="px-2.5 py-1 bg-surface-container text-on-surface-variant rounded text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI 解析
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-outline">{item.date}</span>
                </div>

                <h4 className="text-sm text-on-surface leading-relaxed font-medium mb-4 group-hover:text-primary transition-colors line-clamp-2">
                  {item.question}
                </h4>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  <div className="flex items-center gap-2 flex-1">
                    <X className="w-4 h-4 text-error shrink-0" />
                    <span className="text-xs text-on-surface-variant line-clamp-1">
                      <span className="font-bold mr-1">你的答案:</span> {item.userAnswer}
                    </span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-outline-variant/50"></div>
                  <div className="flex items-center gap-2 flex-1">
                    <Check className="w-4 h-4 text-secondary shrink-0" />
                    <span className="text-xs text-on-surface-variant line-clamp-1">
                      <span className="font-bold mr-1">正确答案:</span> {item.correctAnswer}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="pt-6 pb-8 flex justify-center">
            <button
              onClick={() => loadMistakes(offset + PAGE_SIZE, true)}
              disabled={isLoading}
              className="px-8 py-3.5 border-2 border-outline-variant/40 rounded-full text-sm font-bold text-primary hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              {isLoading ? '加载中...' : '加载更多错题'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
