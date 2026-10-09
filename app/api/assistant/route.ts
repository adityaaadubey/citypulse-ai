import { NextResponse } from "next/server";

type AssistantRequest = {
  city: string;
  selectedPlace?: string;
  reports: string[];
  weather?: string;
  question: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AssistantRequest;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Ask a city-planning question first." }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({
      answer: fallbackAnswer(body),
      source: "Local fallback assistant",
      missingCredential: "OPENAI_API_KEY"
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are CityPulse AI. Give concise city exploration guidance. Never fabricate live traffic, crime, prices, ratings, or accessibility facts. Distinguish demo data, API data, and unverified community reports. Never equate no reports with safety."
          },
          {
            role: "user",
            content: JSON.stringify(body)
          }
        ],
        temperature: 0.3,
        max_tokens: 220
      })
    });

    if (!response.ok) {
      throw new Error("AI provider failed.");
    }

    const payload = await response.json();
    return NextResponse.json({
      answer: payload.choices?.[0]?.message?.content ?? fallbackAnswer(body),
      source: "OpenAI"
    });
  } catch {
    return NextResponse.json({
      answer: fallbackAnswer(body),
      source: "Local fallback assistant",
      missingCredential: "AI provider unavailable"
    });
  }
}

function fallbackAnswer(body: AssistantRequest) {
  const reportText = body.reports.length
    ? `Recent unverified community reports mention: ${body.reports.join("; ")}.`
    : "There are no community reports in this view, which does not mean the area is safe.";
  const place = body.selectedPlace ? ` For ${body.selectedPlace},` : "";

  return `${place} use the map filters to compare culture, food, stays and budget options around ${body.city}. ${body.weather ? `Current weather source says ${body.weather}. ` : ""}${reportText} This demo separates public/demo data from unverified reports, so verify critical travel, safety, accessibility and price details from official sources before acting.`;
}
