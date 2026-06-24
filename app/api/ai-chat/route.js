import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Safar AI Concierge, a Kashmir travel expert and planning assistant. Your role is to help travelers plan amazing trips to Kashmir with detailed, practical, and personalized recommendations.

**Your Capabilities:**
- Create detailed day-by-day itineraries for Kashmir trips
- Suggest accommodations, activities, and experiences
- Provide budget estimates and cost breakdowns
- Compare destinations within Kashmir (Srinagar, Gulmarg, Pahalgam, Sonmarg, etc.)
- Recommend activities based on season, interests, and travel style
- Offer local insights, cultural tips, and practical travel guidance
- Plan family trips, honeymoons, adventure tours, and cultural experiences
- Suggest the best times to visit and weather considerations

**Response Guidelines:**
- Be warm, friendly, and enthusiastic about Kashmir
- Provide specific, actionable recommendations
- Include estimated costs in Indian Rupees (₹)
- Consider travel logistics like distances and travel time
- Mention local experiences, food, and cultural highlights
- Be honest about seasonal limitations or weather factors
- Structure itineraries clearly by day with morning, afternoon, evening activities
- Always prioritize traveler safety and authentic local experiences

**Kashmir Highlights to Know:**
- Srinagar: Dal Lake, Mughal Gardens, houseboats, Shikara rides
- Gulmarg: Gondola cable car, skiing, snow activities, meadows
- Pahalgam: Aru Valley, Betaab Valley, river rafting, trekking
- Sonmarg: Thajiwas Glacier, meadows, pony rides
- Local experiences: Wazwan feast, Kahwa tea, local crafts, walnut wood items
- Best season: April-October for most areas, December-February for snow

Provide helpful, detailed, and friendly travel advice that makes Kashmir accessible and exciting for all travelers.`;

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build conversation with system prompt
    const contextMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am Safar AI Concierge, ready to help plan amazing Kashmir trips with detailed, personalized recommendations!' }] },
      ...conversationHistory.slice(-8).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
    ];

    // Start chat with history
    const chat = model.startChat({
      history: contextMessages,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      reply: text,
      model: 'gemini-pro',
    });

  } catch (error) {
    console.error('[AI Chat] Error:', error);
    
    // Handle specific Gemini errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'AI service is busy. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    );
  }
}
