import { ArrowRight, BrainCircuit, CheckCircle2, Edit3, Flag, RotateCcw, Send, Timer, Trophy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PracticeSessionData, SubmitAnswerResult } from '../types';

interface PracticeViewProps {
  onCompleteSet: () => void;
}

export function PracticeView({ onCompleteSet }: PracticeViewProps) {
  const [sessionData, setSessionData] = useState<PracticeSessionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [scratchpad, setScratchpad] = useState('');
  const [isMarked, setIsMarked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingNextSet, setIsStartingNextSet] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(765);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySessionData = (data: PracticeSessionData) => {
    setSessionData(data);
    setTimeLeft(data.session.timeLeftSeconds);
    setSelectedOption(null);
    setScratchpad('');
    setIsSubmitted(false);
    setResult(null);
    setAnsweredIndex(null);
    setIsMarked(false);
    setError(null);
  };

  const loadSession = () => {
    api
      .getPracticeSession()
      .then(applySessionData)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!sessionData || isSubmitted || timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [isSubmitted, sessionData, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (!sessionData) return;

    if (isSubmitted) {
      if (result?.isSetComplete) return;
      loadSession();
      return;
    }

    if (!selectedOption) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
      return;
    }

    setIsSubmitting(true);
    api
      .submitAnswer({
        questionId: sessionData.question.id,
        selectedOption,
        scratchpad,
        isMarked,
        timeLeftSeconds: timeLeft,
      })
      .then((data) => {
        setResult(data);
        setAnsweredIndex(sessionData.session.currentIndex);
        setIsSubmitted(true);
        setSessionData((current) =>
          current
            ? {
                ...current,
                session: {
                  ...current.session,
                  score: data.score,
                  currentIndex: data.currentIndex,
                  totalQuestions: data.totalQuestions,
                  status: data.isSetComplete ? 'completed' : 'active',
                },
              }
            : current,
        );
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsSubmitting(false));
  };

  const handleStartNextSet = () => {
    setIsStartingNextSet(true);
    api
      .startNextPracticeSet()
      .then(applySessionData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsStartingNextSet(false));
  };

  if (!sessionData && !error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-on-surface-variant">
          正在从后端加载练习题...
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <div className="bg-error-container border border-error/20 rounded-2xl p-8 text-on-error-container">
          {error ?? '无法加载练习题'}
        </div>
      </div>
    );
  }

  const question = sessionData.question;
  const session = sessionData.session;
  const score = result?.score ?? session.score;
  const displayIndex = isSubmitted && answeredIndex ? answeredIndex : session.currentIndex;
  const isSetComplete = Boolean(result?.isSetComplete);
  const summary = result?.summary;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 md:py-8 flex flex-col md:flex-row gap-6 relative">
      <div className="flex-1 flex flex-col gap-6">
        {error && (
          <div className="bg-error-container border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        )}

        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-xs font-medium text-outline uppercase tracking-wider block mb-1">
              {question.subject}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">
              第 {displayIndex} 题，共 {session.totalQuestions} 题
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full border border-outline-variant/30">
            <Timer className="w-5 h-5 text-tertiary" />
            <span className="text-sm font-bold text-primary">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 bg-tertiary text-on-tertiary text-sm px-4 py-1.5 rounded-bl-xl font-bold shadow-sm">
            {question.difficulty}
          </div>

          <div className="text-base text-on-surface leading-relaxed mb-6 mt-4 flex-grow">
            <p className="mb-6">{question.body}</p>

            {question.imageUrl && (
              <div className="w-full h-48 md:h-64 bg-surface-container rounded-xl flex items-center justify-center border border-outline-variant/30 overflow-hidden relative shadow-inner group">
                <img
                  src={question.imageUrl}
                  alt="题目配图"
                  className="object-cover w-full h-full opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium text-on-surface bg-surface-container-lowest/90 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
                    题目图表
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-4">选择答案</h3>
          <div className="grid grid-cols-2 gap-4">
            {question.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrect = result?.correctOption === opt.id;

              let containerClass = 'flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all duration-200 ';
              let labelClass = 'text-2xl mb-2 ';
              let valueClass = 'text-base ';

              if (isSubmitted) {
                if (isCorrect) {
                  containerClass += 'border-secondary bg-secondary/10';
                  labelClass += 'text-secondary font-bold';
                  valueClass += 'text-secondary font-bold';
                } else if (isSelected) {
                  containerClass += 'border-error bg-error/10';
                  labelClass += 'text-error font-bold';
                  valueClass += 'text-error font-bold';
                } else {
                  containerClass += 'border-surface-variant opacity-50';
                  labelClass += 'text-on-surface-variant';
                  valueClass += 'text-on-surface-variant';
                }
              } else if (isSelected) {
                containerClass += 'border-primary bg-primary/5 shadow-sm cursor-pointer';
                labelClass += 'text-primary font-bold';
                valueClass += 'text-primary font-bold';
              } else {
                containerClass += 'border-surface-variant hover:border-primary/40 hover:bg-surface-container cursor-pointer';
                labelClass += 'text-primary';
                valueClass += 'text-on-surface';
              }

              return (
                <label key={opt.id} className={containerClass}>
                  <input
                    type="radio"
                    name="practice-question"
                    value={opt.id}
                    className="hidden"
                    checked={isSelected}
                    disabled={isSubmitted}
                    onChange={() => !isSubmitted && setSelectedOption(opt.id)}
                  />
                  <span className={labelClass}>{opt.id}</span>
                  <span className={valueClass}>{opt.value}</span>
                </label>
              );
            })}
          </div>
        </div>

        {isSubmitted && result && (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm flex flex-col items-center animate-in fade-in slide-in-from-top-4">
            {result.isSetComplete ? (
              <>
                <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-primary">本套练习完成</h3>
                <p className="text-sm text-on-surface-variant mb-6 text-center">
                  已完成 {summary?.answeredCount ?? result.totalQuestions} / {summary?.totalQuestions ?? result.totalQuestions} 题
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
                  <div className="bg-surface rounded-xl border border-outline-variant/20 p-4 text-center">
                    <p className="text-xs text-on-surface-variant mb-1">本套得分</p>
                    <p className="text-2xl font-bold text-primary">{summary?.score ?? score}</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-outline-variant/20 p-4 text-center">
                    <p className="text-xs text-on-surface-variant mb-1">正确率</p>
                    <p className="text-2xl font-bold text-secondary">{summary?.accuracy ?? Math.round((score / result.totalQuestions) * 100)}%</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-outline-variant/20 p-4 text-center">
                    <p className="text-xs text-on-surface-variant mb-1">剩余时间</p>
                    <p className="text-2xl font-bold text-tertiary">{formatTime(summary?.timeLeftSeconds ?? timeLeft)}</p>
                  </div>
                </div>

                <div className={`w-full rounded-xl border p-4 mb-4 ${result.isCorrect ? 'border-secondary/30 bg-secondary/10' : 'border-error/30 bg-error/10'}`}>
                  <p className={`text-sm font-bold flex items-center gap-2 ${result.isCorrect ? 'text-secondary' : 'text-error'}`}>
                    {result.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    第 {displayIndex} 题{result.isCorrect ? '回答正确' : '回答错误'}
                  </p>
                </div>

                {result.explanationSteps.length > 0 && (
                  <div className="w-full bg-surface rounded-xl border border-outline-variant/20 p-4 mb-6">
                    <p className="text-sm font-bold text-primary mb-2">解析</p>
                    <ul className="text-xs text-on-surface-variant space-y-2">
                      {result.explanationSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    onClick={onCompleteSet}
                    className="py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-primary text-on-primary hover:bg-primary-container transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    提交本套
                  </button>
                  <button
                    onClick={handleStartNextSet}
                    disabled={isStartingNextSet}
                    className="py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-surface-container-lowest text-primary border border-outline-variant/40 hover:bg-surface-container-low transition-colors disabled:opacity-60"
                  >
                    <RotateCcw className={`w-4 h-4 ${isStartingNextSet ? 'animate-spin' : ''}`} />
                    {isStartingNextSet ? '正在开启...' : '继续下一套'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${result.isCorrect ? 'text-secondary' : 'text-error'}`}>
                  {result.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" /> 回答正确！
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" /> 回答错误
                    </>
                  )}
                </h3>

                <div className="flex w-full items-center justify-around">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-on-surface-variant mb-1 uppercase tracking-wider">当前进度</span>
                    <span className="text-2xl font-bold text-primary">
                      {displayIndex} <span className="text-sm text-outline font-normal">/ {result.totalQuestions}</span>
                    </span>
                  </div>
                  <div className="w-px h-12 bg-outline-variant/30"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-on-surface-variant mb-1 uppercase tracking-wider">当前得分</span>
                    <span className="text-2xl font-bold text-primary">
                      {score} <span className="text-sm text-outline font-normal">分</span>
                    </span>
                  </div>
                  <div className="w-px h-12 bg-outline-variant/30"></div>
                  <div className="flex flex-col items-center relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      <circle className="text-surface-variant stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
                      <circle
                        className={`stroke-current transition-all duration-1000 ${result.isCorrect ? 'text-secondary' : 'text-primary'}`}
                        strokeWidth="8"
                        strokeLinecap="round"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - 251.2 * (score / result.totalQuestions)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{Math.round((score / result.totalQuestions) * 100)}%</span>
                    </div>
                  </div>
                </div>

                {result.explanationSteps.length > 0 && (
                  <div className="w-full mt-6 bg-surface rounded-xl border border-outline-variant/20 p-4">
                    <p className="text-sm font-bold text-primary mb-2">解析</p>
                    <ul className="text-xs text-on-surface-variant space-y-2">
                      {result.explanationSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isSubmitted && (
          <div className="flex-grow bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-tertiary" />
              解题思路
            </h3>
            <div className="flex-grow min-h-[160px] bg-surface-container border border-outline-variant/30 rounded-xl p-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <textarea
                value={scratchpad}
                onChange={(event) => setScratchpad(event.target.value)}
                className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm text-on-surface placeholder:text-outline/70"
                placeholder="在此记录你的解题思路或草稿..."
              ></textarea>
            </div>
          </div>
        )}

        {!isSetComplete && (
          <div className="flex justify-between items-center pt-2 relative">
            <button
              onClick={() => setIsMarked(!isMarked)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                isMarked
                  ? 'text-tertiary bg-surface-container'
                  : 'text-on-surface-variant hover:text-tertiary hover:bg-surface-container'
              }`}
            >
              <Flag className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
              {isMarked ? '已标记' : '标记以供复查'}
            </button>
            <div className="flex flex-col items-end relative">
              {showWarning && (
                <div className="absolute -top-10 bg-error text-on-error text-xs font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                  请先选择一个答案
                  <div className="absolute -bottom-1 right-8 w-2 h-2 bg-error rotate-45"></div>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`text-sm font-bold px-8 py-3 rounded-full shadow-md flex items-center gap-2 transform active:scale-95 transition-colors ${
                  !selectedOption && !isSubmitted
                    ? 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30'
                    : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
              >
                {isSubmitting ? '提交中...' : isSubmitted ? '继续下一题' : '提交答案'}
                {!isSubmitting && !isSubmitted && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="md:hidden fixed bottom-28 right-4 z-40 bg-tertiary text-on-tertiary p-4 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
        <BrainCircuit className="w-6 h-6" />
      </button>
    </div>
  );
}
