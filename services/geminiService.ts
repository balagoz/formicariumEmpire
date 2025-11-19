import { GoogleGenAI } from "@google/genai";
import { Resources } from "../types";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateColonyEvent = async (resources: Resources, buildingCounts: Record<string, number>): Promise<string> => {
  if (!ai) {
    return "Kraliçe koloninin ilerleyişinden memnun. (API Anahtarı eksik, AI devre dışı)";
  }

  try {
    const prompt = `
      Sen bir karınca kolonisi simülasyon oyununun anlatıcısısın.
      Mevcut durum:
      - Yemek Stoğu: ${resources.food}
      - Toprak Materyali: ${resources.dirt}
      - Nüfus: ${resources.population}
      - Bilim Puanı: ${resources.science}
      - Binalar: ${JSON.stringify(buildingCounts)}

      Bu duruma uygun, Türk dilinde, kısa (maksimum 2 cümle) ve atmosferik bir olay veya kraliçeden bir düşünce yaz.
      Örnekler: "Tünellerde nem oranı arttı, mantarlar daha hızlı büyüyor.", "İşçiler yorgun ama kraliçe daha fazla üretim talep ediyor.", "Derinlerden gelen bir titreşim koloniyi tedirgin etti."
      Sadece metni döndür.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Koloni sessizce çalışmaya devam ediyor...";
  }
};