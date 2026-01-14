
import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { Symptoms, WorkContext, Assessment, DecisionResult, SymptomSeverity } from './types';
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
  }
};

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const [symptoms, setSymptoms] = useState<Symptoms>({
    fever: 36.5,
    cough: 'none',
    fatigue: 'none',
    headache: 'none',
    soreThroat: 'none',
    otherSymptoms: '',
  });

  const [workContext, setWorkContext] = useState<WorkContext>({
    canRemote: true,
    hasUrgentMeeting: false,
    isPeakPeriod: false,
  });

  const handleAssessment = async () => {
    setLoading(true);
    try {
      const result = await getAIAssessment(symptoms, workContext);
      setAssessment(result);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("判定中にエラーが発生しました。");
    } finally {
      setLoading(false);
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

  const getResultIcon = (decision: DecisionResult) => {
    switch (decision) {
      case DecisionResult.OFFICE: return <Building2 className="w-16 h-16" />;
      case DecisionResult.REMOTE: return <Home className="w-16 h-16" />;
      case DecisionResult.REST: return <AlertCircle className="w-16 h-16" />;
      case DecisionResult.HOSPITAL: return <Stethoscope className="w-16 h-16" />;
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
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <AlertCircle size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800">出社判断サポーター</h1>
          </div>
          <div className="text-sm font-medium text-gray-400">Step {step} / 3</div>
        </div>
        <div className="w-full bg-gray-100 h-1">
          <div 
            className="bg-indigo-600 h-1 transition-all duration-300" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {step === 1 && (
          <section className="space-y-6 animate-fadeIn">
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
              <Info className="text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 leading-relaxed">
                現在の症状を正直に入力してください。このツールは医療診断に代わるものではありません。
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                  <Thermometer className="w-4 h-4" /> 体温
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
                { key: 'fatigue', label: '全身の倦怠感', icon: <Brain size={16} /> },
                { key: 'headache', label: '頭痛', icon: <MessageSquare size={16} /> },
                { key: 'soreThroat', label: '喉の痛み', icon: <Info size={16} /> }
              ].map(({ key, label, icon }) => (
                <div key={key} className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      {icon} {label}
                    </label>
                    <button 
                      onClick={() => toggleHelp(key)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                      title="判定基準を見る"
                    >
                      <HelpCircle size={18} />
                    </button>
                  </div>

                  {/* Help Card */}
                  {activeHelp === key && (
                    <div className="absolute z-20 left-0 right-0 top-8 bg-white border border-indigo-100 shadow-xl rounded-xl p-4 animate-fadeIn scale-in-center">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-indigo-600">{label}の目安</span>
                        <button onClick={() => setActiveHelp(null)} className="text-gray-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {SEVERITY_OPTIONS.map((opt) => (
                          <div key={opt.value} className="text-[11px] leading-relaxed">
                            <span className="font-bold text-gray-600 mr-2">【{opt.label}】</span>
                            <span className="text-gray-500">{SYMPTOM_GUIDE[key][opt.value]}</span>
                          </div>
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
                          symptoms[key as keyof Symptoms] === opt.value
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Active Description */}
                  <div className="mt-2 min-h-[1.5rem]">
                    <p className="text-[11px] text-gray-400 italic leading-snug">
                      {SYMPTOM_GUIDE[key][symptoms[key as keyof Symptoms] as SymptomSeverity]}
                    </p>
                  </div>
                </div>
              ))}

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">その他気になる症状</label>
                <textarea
                  placeholder="鼻水、腹痛、発疹など..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                  value={symptoms.otherSymptoms}
                  onChange={(e) => setSymptoms({ ...symptoms, otherSymptoms: e.target.value })}
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
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

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
              ※ 出社により感染を広げるリスクがある場合、会社やチームへの負の影響は大きくなります。「代わりがきかない」場合でも、まずは上司に相談することをお勧めします。
            </div>
          </section>
        )}

        {step === 3 && assessment && (
          <section className="space-y-6 animate-fadeIn">
            <div className={`p-8 rounded-3xl border-2 text-center shadow-lg transition-all ${getResultColor(assessment.decision)}`}>
              <div className="flex justify-center mb-4">
                {getResultIcon(assessment.decision)}
              </div>
              <h2 className="text-2xl font-black mb-2">{getResultTitle(assessment.decision)}</h2>
              <div className="inline-block px-3 py-1 bg-white bg-opacity-50 rounded-full text-xs font-bold mb-4">
                症状スコア: {assessment.score} / 100
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
                    copied ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
               <button 
                onClick={() => setStep(1)}
                className="w-full py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-colors"
               >
                 最初からやり直す
               </button>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center">
              免責事項: この判定は医学的根拠に基づくものではなく、あくまで一般的なガイドラインとAIの推論による補助ツールです。最終的な判断は自身の責任または医師の指示に従ってください。
            </p>
          </section>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white bg-opacity-80 backdrop-blur-md border-t flex justify-center">
        <div className="max-w-2xl w-full flex gap-3">
          {step > 1 && step < 3 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
            >
              <ChevronLeft size={20} />
              戻る
            </button>
          )}
          
          {step === 1 && (
             <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              次へ
              <ChevronRight size={20} />
            </button>
          )}

          {step === 2 && (
             <button
              onClick={handleAssessment}
              disabled={loading}
              className={`flex-1 py-4 px-6 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                loading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AIが判定中...</span>
                </div>
              ) : (
                <>
                  判定する
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
