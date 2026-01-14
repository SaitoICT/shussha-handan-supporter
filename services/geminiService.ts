
import { GoogleGenAI, Type } from "@google/genai";
import { Symptoms, WorkContext, Assessment, DecisionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIAssessment = async (symptoms: Symptoms, context: WorkContext): Promise<Assessment> => {
  const prompt = `
    以下の体調（身体的・精神的）と仕事の状況に基づいて、出社・リモート・休養のいずれかを客観的に判断してください。
    
    【基本情報】
    - 性別: ${symptoms.gender === 'male' ? '男性' : symptoms.gender === 'female' ? '女性' : 'その他/未回答'}
    
    【フィジカルデータ】
    - 体温: ${symptoms.fever}度
    - 咳: ${symptoms.cough}
    - 倦怠感: ${symptoms.fatigue}
    - 頭痛: ${symptoms.headache}
    - 喉の痛み: ${symptoms.soreThroat}
    
    【メンタルデータ】
    - ストレス/重圧: ${symptoms.mentalStress}
    - 気分の落ち込み: ${symptoms.moodDepression}
    - 睡眠の質（悪さ）: ${symptoms.sleepQuality}
    
    【仕事の背景】
    - リモートワーク可能環境: ${context.canRemote ? "あり" : "なし"}
    - 代替のきかない重要な会議: ${context.hasUrgentMeeting ? "あり" : "なし"}
    - 部署の繁忙状況: ${context.isPeakPeriod ? "繁忙期" : "通常期"}

    ---
    
    【判断の指針】
    - 性別に応じた特有の体調の変化（ホルモンバランスや生理周期に伴う不調など）の可能性も考慮に入れ、特にメンタルや倦怠感については柔軟に判断してください。
    - 身体症状（発熱等）がなくても、メンタル症状が「重い(severe)」または「中程度(moderate)」が複数ある場合は、バーンアウト防止のため「REST」を優先的に検討してください。

    【出力項目】
    1. decision & reason: 判断の根拠を、性別による特性や身体・心の両面から論理的に説明。
    2. aiAdvice: 具体的でパーソナライズされたケア方法。
    3. reportDraft: 上長へそのまま送れる丁寧なビジネス敬語。
    4. score: 総合的な不調指数 (0-100)。

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
            description: 'DecisionResult enum value',
          },
          reason: {
            type: Type.STRING,
            description: 'Reason in Japanese.',
          },
          aiAdvice: {
            type: Type.STRING,
            description: 'Care advice in Japanese.',
          },
          reportDraft: {
            type: Type.STRING,
            description: 'Business message in Japanese.',
          },
          score: {
            type: Type.NUMBER,
            description: 'Severity score.',
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
      reason: "解析に失敗しましたが、不調を考慮し休養を推奨します。",
      aiAdvice: "心身ともにゆっくり休める環境を整えてください。",
      reportDraft: "お疲れ様です。体調不良のため、本日はお休みをいただけますでしょうか。よろしくお願いいたします。",
      score: 50
    };
  }
};
