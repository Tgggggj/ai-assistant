import { BookmarkPlus, BrainCircuit, Camera as CameraIcon, Edit2, Search, Image as ImageIcon, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CameraAnalysis, SimilarQuestion } from '../types';

export function CameraView() {
  const [analysis, setAnalysis] = useState<CameraAnalysis | null>(null);
  const [addedToMistakes, setAddedToMistakes] = useState(false);
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [showRetakeMenu, setShowRetakeMenu] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCameraAnalysis()
      .then((data) => {
        setAnalysis(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleAddMistake = () => {
    if (!analysis) return;

    api
      .addCameraAnalysisToMistakes(analysis.id)
      .then(() => {
        setAddedToMistakes(true);
        setError(null);
        setTimeout(() => setAddedToMistakes(false), 2000);
      })
      .catch((err: Error) => setError(err.message));
  };

  const handleSearchSimilar = () => {
    if (!analysis) return;

    setSearchingSimilar(true);
    api
      .searchSimilarQuestions(analysis.id)
      .then((data) => {
        setSimilarQuestions(data.items);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSearchingSimilar(false));
  };

  if (!analysis && !error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-on-surface-variant">
          正在从后端加载拍照识别结果...
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-error-container border border-error/20 rounded-2xl p-8 text-on-error-container">
          {error ?? '无法加载拍照识别结果'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 md:py-8 flex flex-col md:grid md:grid-cols-12 gap-6">
      {error && (
        <div className="md:col-span-12 bg-error-container border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      <div className="w-full flex flex-col gap-6 md:col-span-8">
        <section className="relative w-full rounded-2xl overflow-hidden bg-surface-container shadow-sm border border-outline-variant/30 aspect-[4/3] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-multiply"
            style={{
              backgroundImage: `url('${analysis.imageUrl}')`,
            }}
          ></div>

          <div className="absolute inset-0 pointer-events-none flex flex-col">
            <div className="w-full h-1 bg-primary/80 shadow-[0_0_8px_rgba(0,32,69,0.8)] animate-[pulse_2s_ease-in-out_infinite]"></div>
          </div>

          <div className="absolute inset-6 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between w-full h-10">
              <div className="w-10 border-t-4 border-l-4 border-primary/50 rounded-tl-xl"></div>
              <div className="w-10 border-t-4 border-r-4 border-primary/50 rounded-tr-xl"></div>
            </div>
            <div className="flex justify-between w-full h-10">
              <div className="w-10 border-b-4 border-l-4 border-primary/50 rounded-bl-xl"></div>
              <div className="w-10 border-b-4 border-r-4 border-primary/50 rounded-br-xl"></div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
            {showRetakeMenu && (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 flex flex-col min-w-[120px]">
                <button
                  className="px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container flex items-center gap-3 transition-colors text-left"
                  onClick={() => setShowRetakeMenu(false)}
                >
                  <CameraIcon className="w-4 h-4 text-on-surface-variant" />
                  拍照
                </button>
                <div className="h-px bg-outline-variant/30 w-full"></div>
                <button
                  className="px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container flex items-center gap-3 transition-colors text-left"
                  onClick={() => setShowRetakeMenu(false)}
                >
                  <ImageIcon className="w-4 h-4 text-on-surface-variant" />
                  上传图片
                </button>
              </div>
            )}
            <button
              onClick={() => setShowRetakeMenu(!showRetakeMenu)}
              className="bg-surface/90 backdrop-blur-sm text-primary rounded-full px-5 py-2.5 text-sm font-bold shadow-sm hover:bg-surface flex items-center gap-2 transition-transform hover:scale-105 border border-outline-variant/20"
            >
              <CameraIcon className="w-4 h-4" />
              重拍
              <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${showRetakeMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4" />
              识别结果
            </h2>
            <span className="bg-primary-container/20 text-primary-container px-3 py-1 rounded-md text-xs font-bold tracking-wide">
              {analysis.category}
            </span>
          </div>

          <div className="text-sm text-on-surface leading-relaxed p-5 bg-surface rounded-xl border border-surface-container-high relative group">
            <p>{analysis.recognizedText}</p>
            <button className="absolute top-2 right-2 p-2 rounded-lg text-outline hover:text-primary hover:bg-surface-container opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      <div className="w-full flex flex-col gap-6 md:col-span-4 md:sticky md:top-6 md:self-start">
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-tertiary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-primary">AI 解析</h2>
          </div>

          <div className="flex flex-col gap-5 relative z-10 border-l-2 border-surface-container-high ml-4 pl-6">
            {analysis.solutionSteps.map((step, index) => (
              <div key={step.title} className="relative">
                <div
                  className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-surface-container-lowest ${
                    index < analysis.solutionSteps.length - 1
                      ? 'bg-primary'
                      : 'border-2 border-outline-variant bg-surface-container-lowest'
                  }`}
                ></div>
                <h3 className={`text-sm font-bold mb-1 ${index < analysis.solutionSteps.length - 1 ? 'text-primary' : 'text-on-surface'}`}>
                  {step.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2 relative z-10">
            {analysis.tags.map((tag) => (
              <span key={tag} className="px-3 py-1.5 bg-surface-container text-on-surface text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <div className="flex gap-4">
          <button
            onClick={handleAddMistake}
            className="flex-1 bg-primary text-on-primary text-sm font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
          >
            <BookmarkPlus className="w-4 h-4" />
            {addedToMistakes ? '已加入' : '加入错题本'}
          </button>
          <button
            onClick={handleSearchSimilar}
            className="flex-1 bg-surface-container-lowest text-on-surface text-sm font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors shadow-sm border border-outline-variant/30"
          >
            <Search className="w-4 h-4" />
            {searchingSimilar ? '搜索中...' : '相似题型'}
          </button>
        </div>

        {similarQuestions.length > 0 && (
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-primary mb-3">相似题型</h3>
            <div className="space-y-3">
              {similarQuestions.map((item) => (
                <div key={item.id} className="border border-outline-variant/20 rounded-xl p-3 bg-surface">
                  <div className="text-[10px] font-bold text-outline mb-1">{item.subject}</div>
                  <p className="text-xs text-on-surface-variant line-clamp-2">{item.question}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
