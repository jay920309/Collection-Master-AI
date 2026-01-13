
import { AppData, Collection, CollectionItem } from "../types";

const STORAGE_KEY = "COLLECTION_MASTER_DATA";

const defaultCollections: Collection[] = [
  { id: "1", name: "模型車", description: "各式各樣的汽車比例模型" },
  { id: "2", name: "紀念幣", description: "各國或各時期的紀念硬幣" },
  { id: "3", name: "香火袋", description: "各大寺廟求得的平安護身符" },
];

export const loadData = (): AppData => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return {
      collections: defaultCollections,
      items: [],
    };
  }
  return JSON.parse(data);
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const exportData = (data: AppData) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `collection_backup_${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
