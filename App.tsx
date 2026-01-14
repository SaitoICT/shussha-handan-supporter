
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  Home, 
  Building2, 
  Stethoscope, 
  ChevronRight, 
  ChevronLeft, 
  Info,
  Thermometer,
  CloudLightning,
  Brain,
  MessageSquare,
  Copy,
  Check,
  Send,
  HelpCircle,
  X,
  Heart,
  Moon,
  ZapOff,
  History as HistoryIcon,
  TrendingUp,
  User,
  Trash2
} from 'lucide-react';
import { Symptoms, WorkContext, Assessment, DecisionResult, SymptomSeverity, HistoryEntry, Gender } from './types';
import { getAIAssessment } from './services/geminiService';

const SEVERITY_OPTIONS: { label: string; value: SymptomSeverity }[] = [
  { label: 'なし', value: 'none' },
  { label: '軽い', value: 'mild' },
  { label: '中程度', value: 'moderate' },
  { label: '重い', value: 'severe' },
];

const SYMPTOM_GUIDE: Record<string, Record<SymptomSeverity, string>> = {
  cough: {
    none: '症状はありません。',
    mild: '時々出る程度で、会話やデスクワークに支障はありません。',
    moderate: '頻繁に出て、少し息苦しさや会話のしづらさを感じます。',
    severe: '激しい咳が続き、呼吸が苦しい、または胸の痛みがあります。'
  },
  fatigue: {
    none: '症状はありません。',
    mild: '体が少し重く感じますが、日常生活は問題なく送れます。',
    moderate: '動くのが億劫で、集中力が低下し、座っているのがやっとです。',
    severe: '非常に体が重く、起き上がって活動を続けるのが困難な状態です。'
  },
  headache: {
    none: '症状はありません。',
    mild: '頭に違和感がある程度で、薬を飲まずに過ごせます。',
    moderate: '痛みで仕事に集中できず、鎮痛剤が必要な状態です。',
    severe: '激しい痛みがあり、吐き気やめまいを伴う、または動けません。'
  },
  soreThroat: {
    none: '症状はありません。',
    mild: '喉に少し違和感やイガイガ感がありますが、食事は普通に取れます。',
    moderate: '飲み込む時に痛みがあり、固形物の食事が少し辛い状態です。',
    severe: '唾を飲み込むのも激痛が走り、声が出しにくい状態です。'
  },
  mentalStress: {
    none: '特に感じていません。',
    mild: '少しプレッシャーを感じますが、コントロール可能です。',
    moderate: '常に緊張感や不安があり、リラックスするのが難しいです。',
    severe: '極度の重圧を感じ、パニックや強い拒絶感があります。'
  },
  moodDepression: {
    none: '安定しています。',
    mild: '少し気分が沈むことがありますが、切り替え可能です。',
    moderate: '何に対しても意欲が湧かず、理由なく涙が出たり塞ぎ込んだりします。',
    severe: '絶望感や強い無気力感があり、全く動くことができません。'
  },
  sleepQuality: {
    none: 'よく眠れています。',
    mild: '寝つきが少し悪かったり、夜中に一度目が覚める程度です。',
    moderate: '何度も目が覚める、または短時間しか眠れず日中も眠気が強いです。',
    severe: 'ほとんど眠れない、または悪夢で何度も起き、著しく消耗しています。'
  }
};

const SimpleLineChart: React.FC<{ data: HistoryEntry[] }> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.slice(-7).map(d => d.assessment.score);
  }, [data]);

  if (chartData.length < 2) return <p className="text-center text-gray-400 text-xs py-4">データが不足しています（2件以上必要です）</p>;

  const width = 300;
  const height = 100;
  const padding = 10;
  const points = chartData.map((score, i) => {
    const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((score / 100) * (height - padding * 2) + padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Horizontal Lines */}
        {[0, 25, 50, 75, 100].map(val => {
          const y = height - ((val / 100) * (height - padding * 2) + padding);
          return <line key={val} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeDasharray="4 2" />;
        })}
        {/* Path */}
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Dots */}
        {chartData.map((score, i) => {
          const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
          const y = height - ((score / 100) * (height - padding * 2) + padding);
          return <circle key={i} cx={x} cy={y} r="4" fill="#4f46e5" />;
        })}
      </svg>
      <div className="w-full flex justify-between px-2 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <span>Oldest</span>
        <span>Latest (Trend)</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState(1); // 1: Symptoms, 2: Context, 3: Result, 4: History
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [symptoms, setSymptoms] = useState<Symptoms>({
    gender: 'unspecified',
    fever: 36.5,
    cough: 'none',
    fatigue: 'none',
    headache: 'none',
    soreThroat: 'none',
    mentalStress: 'none',
    moodDepression: 'none',
    sleepQuality: 'none',
    otherSymptoms: '',
  });

  const [workContext, setWorkContext] = useState<WorkContext>({
    canRemote: true,
    hasUrgentMeeting: false,
    isPeakPeriod: false,
  });

  // Load History
  useEffect(() => {
    const saved = localStorage.getItem('attendance_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  const handleAssessment = async () => {
    setLoading(true);
    try {
      const result = await getAIAssessment(symptoms, workContext);
      setAssessment(result);
      
      // Save to History
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('ja-JP'),
        assessment: result,
        symptoms: { ...symptoms }
      };
      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('attendance_history', JSON.stringify(updatedHistory));
      
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("判定中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("全ての履歴を削除しますか？")) {
      setHistory([]);
      localStorage.removeItem('attendance_history');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getResultColor = (decision: DecisionResult) => {
    switch (decision) {
      case DecisionResult.OFFICE: return 'bg-emerald-50 border-emerald-500 text-emerald-700';
      case DecisionResult.REMOTE: return 'bg-sky-50 border-sky-500 text-sky-700';
      case DecisionResult.REST: return 'bg-amber-50 border-amber-500 text-amber-700';
      case DecisionResult.HOSPITAL: return 'bg-rose-50 border-rose-500 text-rose-700';
      default: return 'bg-gray-50 border-gray-500 text-gray-700';
    }
  };

  const getResultIcon = (decision: DecisionResult, size: number = 16) => {
    const className = `w-${size} h-${size}`;
    switch (decision) {
      case DecisionResult.OFFICE: return <Building2 className={className} />;
      case DecisionResult.REMOTE: return <Home className={className} />;
      case DecisionResult.REST: return <AlertCircle className={className} />;
      case DecisionResult.HOSPITAL: return <Stethoscope className={className} />;
    }
  };

  const getResultTitle = (decision: DecisionResult) => {
    switch (decision) {
      case DecisionResult.OFFICE: return '通常通り出社';
      case DecisionResult.REMOTE: return 'リモートワーク推奨';
      case DecisionResult.REST: return '休暇・休養を推奨';
      case DecisionResult.HOSPITAL: return '医療機関への相談を推奨';
    }
  };

  const toggleHelp = (key: string) => {
    setActiveHelp(activeHelp === key ? null : key);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(1)}>
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <AlertCircle size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800">出社判断サポーター</h1>
          </div>
          <button 
            onClick={() => setStep(step === 4 ? 1 : 4)}
            className={`p-2 rounded-lg transition-colors ${step === 4 ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <HistoryIcon size={24} />
          </button>
        </div>
        <div className="w-full bg-gray-100 h-1">
          <div 
            className="bg-indigo-600 h-1 transition-all duration-300" 
            style={{ width: `${(Math.min(step, 3) / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {step === 4 ? (
          /* History View */
          <section className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <HistoryIcon className="text-indigo-600" />
                診断履歴・推移
              </h2>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-rose-500 hover:text-rose-700 p-2">
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-widest">
                    <TrendingUp size={16} /> 不調スコア推移（直近7件）
                  </h3>
                  <SimpleLineChart data={history} />
                </div>

                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${getResultColor(entry.assessment.decision)}`}>
                        {getResultIcon(entry.assessment.decision, 6)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{entry.date}</span>
                          <span className="text-xs font-black text-indigo-600">Score: {entry.assessment.score}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-700 truncate">{getResultTitle(entry.assessment.decision)}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1 italic">{entry.assessment.reason}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setAssessment(entry.assessment);
                          setSymptoms(entry.symptoms);
                          setStep(3);
                        }}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <HistoryIcon className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-400 font-medium">履歴がありません</p>
                <button onClick={() => setStep(1)} className="mt-4 text-indigo-600 font-bold text-sm">診断をはじめる</button>
              </div>
            )}
          </section>
        ) : step === 1 ? (
          <section className="space-y-6 animate-fadeIn">
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
              <Info className="text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 leading-relaxed">
                現在の症状を正直に入力してください。心と体の両面からチェックします。
              </p>
            </div>

            {/* Basic Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 border-b pb-2 mb-6">
                <User className="text-indigo-500" size={20} /> 基本情報
              </h2>
              <label className="text-sm font-bold text-gray-700 mb-3 block">性別</label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'other'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSymptoms({ ...symptoms, gender: g })}
                    className={`py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                      symptoms.gender === g 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
                    }`}
                  >
                    {g === 'male' ? '男性' : g === 'female' ? '女性' : 'その他'}
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Symptoms */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 border-b pb-2">
                <Thermometer className="text-orange-500" size={20} /> 身体的症状
              </h2>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                  体温
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="35" 
                    max="40" 
                    step="0.1" 
                    value={symptoms.fever}
                    onChange={(e) => setSymptoms({ ...symptoms, fever: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xl font-bold text-indigo-600 w-16 text-right">
                    {symptoms.fever.toFixed(1)}°
                  </span>
                </div>
              </div>

              {[
                { key: 'cough', label: '咳・呼吸器症状', icon: <CloudLightning size={16} /> },
                { key: 'fatigue', label: '全身の倦怠感', icon: <ZapOff size={16} /> },
                { key: 'headache', label: '頭痛', icon: <MessageSquare size={16} /> },
                { key: 'soreThroat', label: '喉の痛み', icon: <Info size={16} /> }
              ].map(({ key, label, icon }) => (
                <div key={key} className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      {icon} {label}
                    </label>
                    <button onClick={() => toggleHelp(key)} className="text-gray-400 hover:text-indigo-600"><HelpCircle size={18} /></button>
                  </div>

                  {activeHelp === key && (
                    <div className="absolute z-20 left-0 right-0 top-8 bg-white border border-indigo-100 shadow-xl rounded-xl p-4 animate-fadeIn">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-indigo-600">{label}の目安</span>
                        <X size={16} onClick={() => setActiveHelp(null)} className="cursor-pointer text-gray-400" />
                      </div>
                      <div className="space-y-1">
                        {SEVERITY_OPTIONS.map((opt) => (
                          <div key={opt.value} className="text-[10px]"><span className="font-bold">【{opt.label}】</span> {SYMPTOM_GUIDE[key][opt.value]}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSymptoms({ ...symptoms, [key as keyof Symptoms]: opt.value })}
                        className={`py-2 px-1 text-xs rounded-lg border transition-all ${
                          symptoms[key as keyof Symptoms] === opt.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 italic">{SYMPTOM_GUIDE[key][symptoms[key as keyof Symptoms] as SymptomSeverity]}</p>
                </div>
              ))}
            </div>

            {/* Mental Health Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 border-b pb-2">
                <Heart className="text-rose-500" size={20} /> メンタル・心理状態
              </h2>
              
              {[
                { key: 'mentalStress', label: 'ストレス・重圧', icon: <Brain size={16} /> },
                { key: 'moodDepression', label: '気分の落ち込み', icon: <CloudLightning size={16} /> },
                { key: 'sleepQuality', label: '睡眠の質', icon: <Moon size={16} /> }
              ].map(({ key, label, icon }) => (
                <div key={key} className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      {icon} {label}
                    </label>
                    <button onClick={() => toggleHelp(key)} className="text-gray-400 hover:text-rose-600"><HelpCircle size={18} /></button>
                  </div>

                  {activeHelp === key && (
                    <div className="absolute z-20 left-0 right-0 top-8 bg-white border border-rose-100 shadow-xl rounded-xl p-4 animate-fadeIn">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-rose-600">{label}の目安</span>
                        <X size={16} onClick={() => setActiveHelp(null)} className="cursor-pointer text-gray-400" />
                      </div>
                      <div className="space-y-1">
                        {SEVERITY_OPTIONS.map((opt) => (
                          <div key={opt.value} className="text-[10px]"><span className="font-bold">【{opt.label}】</span> {SYMPTOM_GUIDE[key][opt.value]}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSymptoms({ ...symptoms, [key as keyof Symptoms]: opt.value })}
                        className={`py-2 px-1 text-xs rounded-lg border transition-all ${
                          symptoms[key as keyof Symptoms] === opt.value ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 italic">{SYMPTOM_GUIDE[key][symptoms[key as keyof Symptoms] as SymptomSeverity]}</p>
                </div>
              ))}

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">その他（特記事項）</label>
                <textarea
                  placeholder="具体的なエピソードや身体症状の続きなど..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                  value={symptoms.otherSymptoms}
                  onChange={(e) => setSymptoms({ ...symptoms, otherSymptoms: e.target.value })}
                />
              </div>
            </div>
          </section>
        ) : step === 2 ? (
          <section className="space-y-6 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800">仕事の状況を確認</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              {[
                { key: 'canRemote', label: '自宅からリモートワークが可能' },
                { key: 'hasUrgentMeeting', label: '今日、代わりがきかない重要な会議がある' },
                { key: 'isPeakPeriod', label: '現在、部署全体が繁忙期である' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={workContext[key as keyof WorkContext] as boolean}
                    onChange={(e) => setWorkContext({ ...workContext, [key]: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded"
                  />
                </label>
              ))}
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 space-y-2">
              <p>※ 心身の健康は仕事よりも優先されるべきです。特にメンタル不調は「気のせい」と放置せず、早めの対処が重要です。</p>
              <p>※ 出社により感染を広げるリスクがある場合、会社やチームへの負の影響は大きくなります。重要な業務がある場合でも、まずは健康を第一に考えてください。</p>
              <div className="border-t border-amber-200 pt-2">
                <p className="font-bold mb-1">【免責事項】</p>
                <p className="leading-relaxed">本判定は医学的根拠に基づくものではなく、あくまで一般的なガイドラインとAIの推論による補助ツールです。最終的な判断は自身の責任において行うか、必要に応じて医療機関へ相談してください。</p>
              </div>
            </div>
          </section>
        ) : step === 3 && assessment ? (
          <section className="space-y-6 animate-fadeIn">
            <div className={`p-8 rounded-3xl border-2 text-center shadow-lg transition-all ${getResultColor(assessment.decision)}`}>
              <div className="flex justify-center mb-4">
                {getResultIcon(assessment.decision, 16)}
              </div>
              <h2 className="text-2xl font-black mb-2">{getResultTitle(assessment.decision)}</h2>
              <div className="inline-block px-3 py-1 bg-white bg-opacity-50 rounded-full text-xs font-bold mb-4">
                不調スコア: {assessment.score} / 100
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-90">{assessment.reason}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-indigo-600 font-bold mb-3">
                <Brain size={18} />
                <span>AIアドバイス</span>
              </div>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                "{assessment.aiAdvice}"
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <Send size={18} />
                  <span>報告用メッセージ案</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(assessment.reportDraft)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copied ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'コピーしました' : 'コピー'}
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border border-dashed border-gray-300">
                {assessment.reportDraft}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
               <button onClick={() => setStep(1)} className="w-full py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-colors">
                 最初からやり直す
               </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              免責事項: このツールは補助的なものであり、医学的・心理学的診断ではありません。
            </p>
          </section>
        ) : null}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white bg-opacity-80 backdrop-blur-md border-t flex justify-center z-10">
        <div className="max-w-2xl w-full flex gap-3">
          {step === 4 ? (
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
            >
              診断に戻る
            </button>
          ) : (
            <>
              {step > 1 && step < 3 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} /> 戻る
                </button>
              )}
              
              {step === 1 && (
                 <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
                >
                  次へ <ChevronRight size={20} />
                </button>
              )}

              {step === 2 && (
                 <button
                  onClick={handleAssessment}
                  disabled={loading}
                  className={`flex-1 py-4 px-6 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                    loading ? 'bg-gray-300 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AIが分析中...</span>
                    </div>
                  ) : (
                    <>判定する <ChevronRight size={20} /></>
                  )}
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-4 px-6 bg-indigo-50 text-indigo-600 font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  履歴を見る <HistoryIcon size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
