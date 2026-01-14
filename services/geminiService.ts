
import { GoogleGenAI, Type } from "@google/genai";
import { Symptoms, WorkContext, Assessment, DecisionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIAssessment = async (symptoms: Symptoms, context: WorkContext): Promise<Assessment> => {
  const prompt = `
    以下の体調と仕事の状況に基づいて、出社すべきか、リモートにすべきか、休むべきかを客観的に判断してください。
    
    【体調データ】
    - 体温: ${symptoms.fever}度
    - 咳: ${symptoms.cough} (${symptoms.cough === 'none' ? 'なし' : symptoms.cough === 'mild' ? '軽い' : symptoms.cough === 'moderate' ? '中程度' : '重い'})
    - 倦怠感: ${symptoms.fatigue}
    - 頭痛: ${symptoms.headache}
    - 喉の痛み: ${symptoms.soreThroat}
    - その他: ${symptoms.otherSymptoms || "特になし"}
    
    【仕事の背景】
    - リモートワーク可能環境: ${context.canRemote ? "あり" : "なし"}
    - 代替のきかない重要な会議: ${context.hasUrgentMeeting ? "あり" : "なし"}
    - 部署の繁忙状況: ${context.isPeakPeriod ? "繁忙期" : "通常期"}

    ---
    
    【出力項目1: 判断 (decision & reason)】
    - 37.5度以上の発熱や、激しい咳がある場合は周囲への影響を鑑み「REST」または「REMOTE」を強く推奨してください。
    - 症状が重篤（SEVERE）な場合は「HOSPITAL」を提案してください。
    - リモート可能であっても、倦怠感が強い場合は無理をせず「REST」とするよう判断してください。

    【出力項目2: パーソナライズされたアドバイス (aiAdvice)】
    - ユーザーが入力した具体的な症状に直結するセルフケア方法を提案してください。
      - 例: 喉の痛みがあるなら「加湿器の利用やハチミツ」、熱があるなら「太い血管が通る部位（首筋や脇下）の冷却」、頭痛なら「暗い部屋での安静」など。
    - 繁忙期や会議がある場合でも、健康を最優先にするよう優しく、かつ論理的に背中を押すメッセージにしてください。

    【出力項目3: 上長への報告文案 (reportDraft)】
    - 上長へSlackやメールでそのまま送れる、非常に丁寧でプロフェッショナルな日本ビジネス敬語の文章を作成してください。
    - 構成案:
      1. 挨拶（お疲れ様です。）
      2. 自身の現状（体温、具体的な症状を簡潔に報告）
      3. 本日の勤務形態の提案（「お休みをいただきたい」「在宅勤務に切り替えたい」など）
      4. 業務への影響と対応（予定されていた会議の欠席、緊急タスクの引き継ぎ依頼、または進捗への影響）
      5. 緊急時の連絡手段（Slackは確認できる、または緊急時はお電話ください、など）
      6. 締めの言葉

    出力は必ず以下のJSON形式で行ってください。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          decision: {
            type: Type.STRING,
            description: 'DecisionResult enum value: OFFICE, REMOTE, REST, HOSPITAL',
          },
          reason: {
            type: Type.STRING,
            description: 'Logical reason for the decision in Japanese.',
          },
          aiAdvice: {
            type: Type.STRING,
            description: 'Symptom-specific personalized self-care advice in Japanese.',
          },
          reportDraft: {
            type: Type.STRING,
            description: 'Professional business reporting message with impact details in Japanese.',
          },
          score: {
            type: Type.NUMBER,
            description: 'Severity score from 0 to 100.',
          }
        },
        required: ["decision", "reason", "aiAdvice", "reportDraft", "score"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    return result as Assessment;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      decision: DecisionResult.REST,
      reason: "解析に失敗しましたが、症状を考慮し大事をとって休養を推奨します。",
      aiAdvice: "水分を十分に摂り、暖かくして安静にしてください。症状が悪化する場合は早めの受診を検討してください。",
      reportDraft: "お疲れ様です。体調不良のため、本日はお休みをいただけますでしょうか。予定していた業務については、別途Slack等で共有させていただきます。ご迷惑をおかけし申し訳ございません。",
      score: 50
    };
  }
};
