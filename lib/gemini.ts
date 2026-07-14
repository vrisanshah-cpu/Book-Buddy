interface GeminiTurn {
    role: "user" | "model";
    text: string;
  }
  
  export async function callGemini(
    systemInstruction: string,
    turns: GeminiTurn[],
    opts?: { jsonMode?: boolean }
  ): Promise<string> {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          generationConfig: opts?.jsonMode
            ? { responseMimeType: "application/json" }
            : undefined,
        }),
      }
    );
  
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API error: ${res.status} ${errText}`);
    }
  
    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no text");
    return text;
  }
  
  export function hasGeminiKey() {
    return Boolean(process.env.GEMINI_API_KEY);
  }