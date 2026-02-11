
import { GoogleGenAI } from "@google/genai";
import { MonthlyData, SeasonStats } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); to ensure the correct API key is used.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getMarketingAdvice(data: MonthlyData[], seasonStats: SeasonStats[]) {
  const prompt = `
    As a senior hospitality marketing expert in South Africa, analyze the following booking data for J-Bay Zebra Lodge.
    
    Historical Data: ${JSON.stringify(data.slice(-12))}
    Seasonality Performance: ${JSON.stringify(seasonStats)}
    
    Provide a strategic marketing report including:
    1. Key performance insights.
    2. Recommended strategies for the low season (May-August in SA).
    3. Pricing strategy suggestions based on high/low season disparities.
    4. Target demographic focus (local vs international).
    
    Keep the tone professional yet encouraging.
  `;

  try {
    // Upgrading to gemini-3-pro-preview for complex reasoning and strategic hospitality analysis tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        // Removed explicit thinkingConfig to let the model decide the best reasoning path for strategic advice.
        temperature: 0.7,
      }
    });

    // Directly access the text property of the GenerateContentResponse object.
    return response.text || "Unable to generate advice at this time.";
  } catch (error) {
    console.error("AI Marketing Advice Error:", error);
    return "The AI expert is currently unavailable. Please review your dashboard metrics for manual analysis.";
  }
}
