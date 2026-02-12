import { MonthlyData, SeasonStats } from "../types";

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
    // Call our secure Netlify Function instead of using client-side API key
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the text from the response
    // The structure depends on how your Netlify function returns the data
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
           data.text || 
           "Unable to generate advice at this time.";
  } catch (error) {
    console.error("AI Marketing Advice Error:", error);
    return "The AI expert is currently unavailable. Please review your dashboard metrics for manual analysis.";
  }
}
