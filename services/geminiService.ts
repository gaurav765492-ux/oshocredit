import { GoogleGenAI } from "@google/genai";
import { Party } from "../types";

/**
 * We declare process as a global variable so TypeScript doesn't complain.
 * Vite's 'define' config will replace 'process.env.API_KEY' with the actual value.
 */
declare global {
  interface Window {
    process: {
      env: {
        API_KEY?: string;
      };
    };
  }
}
const processEnv = (typeof process !== 'undefined' ? process : { env: { API_KEY: '' } });

export const getBusinessSummary = async (parties: Party[]) => {
  const apiKey = processEnv.env.API_KEY;
  
  if (!apiKey) {
    return "API Key missing. Please set API_KEY in your environment variables and redeploy.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const dataString = parties.map(p => ({
    name: p.name,
    balance: p.transactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? t.amount : -t.amount), 0),
    txCount: p.transactions.length
  }));

  const prompt = `
    Analyze this shopkeeper's ledger data:
    ${JSON.stringify(dataString)}

    Provide a short, encouraging business summary in Hinglish (Hindi + English). 
    Highlight the most critical recovery needed and the overall health of the business. 
    Format:
    - Total Outstandings (Paisa lene wala)
    - Top 3 due customers
    - Motivational tip for the day
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Abhi summary generate nahi ho pa rahi hai. Kripya baad mein prayas karein.";
  }
};