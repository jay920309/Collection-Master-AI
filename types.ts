
export interface Collection {
  id: string;
  name: string;
  description?: string;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  name: string;
  description: string;
  imageUrl: string; // Base64 or Blob URL for demo
  createdAt: number;
}

export interface AppData {
  collections: Collection[];
  items: CollectionItem[];
}

export interface AIAnalysisResult {
  isOwned: boolean;
  matchedItemId?: string;
  itemName: string;
  itemDescription: string;
  suggestedCollectionId?: string;
}
