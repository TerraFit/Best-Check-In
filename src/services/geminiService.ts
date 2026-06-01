// src/services/geminiService.ts

import { MonthlyData, SeasonStats } from "../types";

export async function getMarketingAdvice(data: MonthlyData[], seasonStats: SeasonStats[]) {
  const prompt = `
    As a senior hospitality marketing expert in South Africa, analyze the following booking data for the accommodation property.
    
    Historical Data: ${JSON.stringify(data.slice(-12))}
    Seasonality Performance: ${JSON.stringify(seasonStats)}
    
    Provide a strategic marketing report including:
    1. Key performance insights
    2. Recommended strategies for the low season (May-August in SA)
    3. Pricing strategy suggestions based on high/low season disparities
    4. Target demographic focus (local vs international)
    
    Keep the tone professional yet encouraging. Keep the response under 500 words.
  `;

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // Handle the new response format
    if (result.success && result.text) {
      return result.text;
    }
    
    if (result.error) {
      console.error('Gemini error:', result.error);
      return "The AI marketing expert is temporarily unavailable. Please check your dashboard metrics for manual analysis.";
    }

    // Fallback for legacy response format
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 
           result.text || 
           "Unable to generate marketing advice at this time.";
           
  } catch (error) {
    console.error("AI Marketing Advice Error:", error);
    return "The AI expert is currently unavailable. Please review your dashboard metrics for manual analysis.";
  }
}
