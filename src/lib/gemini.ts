export interface GeminiAnalysisResult {
  garbage: boolean;
  encroachment: boolean;
  obstruction: boolean;
  description: string;
}

export async function analyzeFootpathImage(base64Image: string): Promise<GeminiAnalysisResult> {
  const apiBase = import.meta.env.VITE_MODEL_API_URL || 'http://127.0.0.1:8000';
  const response = await fetch(`${apiBase}/analyze-footpath`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();

  return {
    garbage: !!result.garbage,
    encroachment: !!result.encroachment,
    obstruction: !!result.obstruction,
    description: result.description || 'Analysis complete.',
  };
}
