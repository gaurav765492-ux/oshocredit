
import { GoogleGenAI } from "@google/genai";
import { Party } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBusinessSummary = async (parties: Party[]) => {
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
    // Correct usage of generateContent for Gemini 3 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        // Removed maxOutputTokens to avoid truncation issues as per developer guidelines
      }
    });
    // Accessing .text property directly as per Gemini API guidelines
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate summary at this time.";
  }
};
