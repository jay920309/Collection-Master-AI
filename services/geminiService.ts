
import { GoogleGenAI, Type } from "@google/genai";
import { Collection, CollectionItem, AIAnalysisResult } from "../types";

export const analyzeImage = async (
  base64Image: string,
  existingItems: CollectionItem[],
  collections: Collection[]
): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  // Format the existing items for context
  const itemsContext = existingItems.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: collections.find(c => c.id === item.collectionId)?.name || '未知'
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: `你是一個專業的收藏品鑑定專家。這是一張使用者拍攝或選擇的收藏品照片。
          
          我的目前收藏清單如下：
          ${JSON.stringify(itemsContext)}
          
          現有收藏類別有：
          ${JSON.stringify(collections)}

          請執行以下任務：
          1. 辨識照片中的物件是什麼。
          2. 與「目前收藏清單」進行特徵比對（考慮細節、型號、外觀）。
          3. 如果相似度極高，判定為已擁有 (isOwned: true) 並指出匹配的 ID (matchedItemId)。
          4. 如果是新收藏，判定為未擁有 (isOwned: false)，並提供名稱、描述以及建議的類別 ID。
          
          請務必以 JSON 格式回應。`
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isOwned: { type: Type.BOOLEAN, description: "是否已在收藏清單中" },
          matchedItemId: { type: Type.STRING, description: "匹配到的既有收藏 ID (如有)" },
          itemName: { type: Type.STRING, description: "物品名稱" },
          itemDescription: { type: Type.STRING, description: "物品簡介與特徵" },
          suggestedCollectionId: { type: Type.STRING, description: "建議加入的類別 ID (匹配最接近的類別)" }
        },
        required: ["isOwned", "itemName", "itemDescription"]
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as AIAnalysisResult;
  } catch (error) {
    console.error("AI Response Parsing Error:", error);
    throw new Error("無法解析 AI 回應");
  }
};
