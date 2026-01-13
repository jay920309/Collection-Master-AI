
import React, { useState, useEffect, useRef } from 'react';
import { Collection, CollectionItem, AppData, AIAnalysisResult } from './types';
import { loadData, saveData, exportData, importData } from './utils/storage';
import { analyzeImage } from './services/geminiService';
import { Plus, Camera, Trash2, Edit3, Download, Upload, Package, ChevronLeft, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({ collections: [], items: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
  const [scanResult, setScanResult] = useState<{ result: AIAnalysisResult; image: string } | null>(null);
  
  // 編輯與新增類別狀態
  const [showEditor, setShowEditor] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  // 自定義確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'item' | 'collection' | null;
    id: string | null;
  }>({
    show: false,
    title: '',
    message: '',
    type: null,
    id: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 初始化載入資料
  useEffect(() => {
    try {
      const saved = loadData();
      setData({
        collections: Array.isArray(saved.collections) ? saved.collections : [],
        items: Array.isArray(saved.items) ? saved.items : []
      });
    } catch (e) {
      console.error("載入失敗");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. 當 data 變動時同步存檔
  useEffect(() => {
    if (isLoaded) {
      saveData(data);
    }
  }, [data, isLoaded]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningStatus('uploading');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const imageUrl = event.target?.result as string;
      
      setScanningStatus('analyzing');
      try {
        const result = await analyzeImage(base64, data.items, data.collections);
        const safeResult = {
          ...result,
          itemName: result.itemName || "未辨識物品",
          itemDescription: result.itemDescription || "無描述",
          isOwned: !!result.isOwned
        };
        setScanResult({ result: safeResult, image: imageUrl });
        setScanningStatus('done');
      } catch (error) {
        alert('AI 辨識失敗，請檢查網路後重試');
        setScanningStatus('idle');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addItemToCollection = (collectionId: string) => {
    if (!scanResult) return;
    const newItem: CollectionItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      collectionId,
      name: scanResult.result.itemName,
      description: scanResult.result.itemDescription,
      imageUrl: scanResult.image,
      createdAt: Date.now(),
    };
    setData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    setScanResult(null);
    setScanningStatus('idle');
  };

  // 刪除確認執行
  const executeDelete = () => {
    const { type, id } = confirmDialog;
    if (!id) return;

    setData(prev => {
      if (type === 'item') {
        return {
          ...prev,
          items: prev.items.filter(i => i.id !== id)
        };
      } else if (type === 'collection') {
        if (activeCollectionId === id) setActiveCollectionId(null);
        return {
          ...prev,
          collections: prev.collections.filter(c => c.id !== id),
          items: prev.items.filter(i => i.collectionId !== id)
        };
      }
      return prev;
    });

    setConfirmDialog({ show: false, title: '', message: '', type: null, id: null });
  };

  const openDeleteItemDialog = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      show: true,
      title: '確定刪除物品？',
      message: '此動作將永久移除該項收藏，且無法復原。',
      type: 'item',
      id: itemId
    });
  };

  const openDeleteCollectionDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      show: true,
      title: '確定刪除整個類別？',
      message: '這將會連同該類別下的「所有物品」一併刪除，請謹慎操作！',
      type: 'collection',
      id: id
    });
  };

  const addOrUpdateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    
    if (editingCollection) {
      setData(prev => ({
        ...prev,
        collections: prev.collections.map(c => c.id === editingCollection.id ? { ...c, name } : c)
      }));
    } else {
      const newCol: Collection = { 
        id: `col-${Date.now()}-${Math.floor(Math.random() * 10000)}`, 
        name 
      };
      setData(prev => ({ ...prev, collections: [...(prev.collections || []), newCol] }));
    }
    
    setNewCollectionName('');
    setEditingCollection(null);
    setShowEditor(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importData(file);
      if (imported && Array.isArray(imported.collections)) {
        setData(imported);
        alert('匯入成功！');
      }
    } catch (err) {
      alert('檔案格式錯誤');
    }
    e.target.value = '';
  };

  const currentItems = activeCollectionId 
    ? (data.items || []).filter(i => i.collectionId === activeCollectionId)
    : [];

  const currentCollection = data.collections.find(c => c.id === activeCollectionId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-lg mx-auto shadow-2xl flex flex-col relative antialiased overflow-x-hidden">
      
      {/* 自定義確認彈窗 */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertCircle size={28} />
              <h3 className="font-black text-xl text-slate-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog({ show: false, title: '', message: '', type: null, id: null })}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl active:scale-95 transition-all"
              >
                取消
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm px-6 py-4 flex items-center justify-between border-b">
        {activeCollectionId ? (
          <button type="button" onClick={() => setActiveCollectionId(null)} className="flex items-center text-blue-600 font-black p-1 transition-transform active:scale-90">
            <ChevronLeft size={24} />
            <span className="ml-1">返回</span>
          </button>
        ) : (
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">收藏管家 AI</h1>
        )}
        <div className="flex gap-1 items-center">
          {/* 在分類頁面中也提供掃描按鈕 */}
          {activeCollectionId && (
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <Camera size={22} />
            </button>
          )}
          <button onClick={() => exportData(data)} className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
            <Download size={22} />
          </button>
          <label className="p-2.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
            <Upload size={22} />
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>
      </header>

      <main className="flex-1 p-6">
        {/* 只保留一個主要的拍照入口 */}
        {!activeCollectionId && !scanResult && (
          <section className="mb-10">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.5rem] p-12 text-white flex flex-col items-center justify-center cursor-pointer shadow-xl shadow-blue-200 active:scale-95 transition-all"
            >
              <div className="bg-white/20 p-6 rounded-full mb-6">
                <Camera size={56} />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">AI 掃描鑑定</h2>
              <p className="opacity-80 text-sm font-medium">點擊此處拍照，自動檢查收藏狀態</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileChange} 
              />
            </div>
          </section>
        )}

        {/* AI 載入中 */}
        {scanningStatus !== 'idle' && scanningStatus !== 'done' && (
          <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-xs shadow-2xl">
              <div className="w-16 h-16 border-[6px] border-blue-100 border-t-blue-600 rounded-full animate-spin mb-8 mx-auto"></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {scanningStatus === 'uploading' ? '圖片傳送中' : 'AI 深度辨識中'}
              </h3>
              <p className="text-slate-400 text-sm font-bold tracking-wider">PLEASE WAIT...</p>
            </div>
          </div>
        )}

        {/* AI 結果 */}
        {scanResult && (
          <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 mb-10 animate-in slide-in-from-bottom-12 duration-500">
            <div className="relative">
              <img src={scanResult.image} alt="Preview" className="w-full h-80 object-cover" />
              <div className="absolute top-6 left-6">
                {scanResult.result.isOwned ? (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-full text-xs font-black shadow-lg">
                    <AlertCircle size={14} /> 已經收藏過了
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full text-xs font-black shadow-lg">
                    <CheckCircle2 size={14} /> 全新發現
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-10">
              <h3 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">{scanResult.result.itemName}</h3>
              <p className="text-slate-500 mb-10 leading-relaxed font-bold text-lg italic">
                "{scanResult.result.itemDescription}"
              </p>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">選擇存放的收藏庫</p>
                <div className="grid grid-cols-2 gap-4">
                  {(data.collections || []).map(c => (
                    <button
                      key={c.id}
                      onClick={() => addItemToCollection(c.id)}
                      className={`py-5 px-4 rounded-[1.5rem] border-2 transition-all text-sm font-black ${
                        scanResult.result.suggestedCollectionId === c.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 active:bg-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => { setScanResult(null); setScanningStatus('idle'); }} 
                  className="w-full py-4 text-slate-400 font-black text-sm hover:text-slate-900 transition-colors"
                >
                  取消並不儲存
                </button>
              </div>
            </div>
          </div>
        )}

        {!scanResult && (
          <>
            {!activeCollectionId ? (
              <section className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8 px-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">管理類別</h2>
                  <button 
                    onClick={() => { setEditingCollection(null); setNewCollectionName(''); setShowEditor(true); }} 
                    className="text-blue-600 font-black flex items-center gap-1.5 bg-blue-50 px-5 py-2 rounded-full text-xs hover:bg-blue-100 active:scale-90 transition-all"
                  >
                    <Plus size={16} /> 新增
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {(data.collections || []).map(c => {
                    const count = (data.items || []).filter(i => i.collectionId === c.id).length;
                    return (
                      <div 
                        key={c.id} 
                        className="group relative bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.97] transition-all cursor-pointer overflow-hidden"
                        onClick={() => setActiveCollectionId(c.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                            <Package size={28} />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-xl tracking-tight">{c.name}</h3>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">{count} items</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingCollection(c); setNewCollectionName(c.name); setShowEditor(true); }}
                            className="p-3.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                          >
                            <Edit3 size={20} />
                          </button>
                          <button 
                            onClick={(e) => openDeleteCollectionDialog(c.id, e)}
                            className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="animate-in slide-in-from-right-8 duration-500">
                <div className="mb-10 px-2">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{currentCollection?.name}</h2>
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-black tracking-[0.2em] uppercase">
                      {currentItems.length} pcs
                    </span>
                    <button 
                      onClick={(e) => openDeleteCollectionDialog(activeCollectionId, e)}
                      className="text-red-400 text-xs font-black flex items-center gap-1.5 hover:text-red-600 transition-colors uppercase"
                    >
                      <Trash2 size={14} /> 刪除此分類
                    </button>
                  </div>
                </div>

                {currentItems.length === 0 ? (
                  <div className="py-28 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 shadow-inner">
                    <Package size={64} className="mx-auto mb-6 text-slate-100" />
                    <p className="text-slate-400 font-black tracking-widest uppercase text-sm">還沒有物品</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-8 bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                    >
                      開始拍照新增
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-10">
                    {currentItems.map(item => (
                      <div key={item.id} className="bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/40 border border-slate-50 relative group">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-80 object-cover" />
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-black text-3xl text-slate-900 tracking-tighter leading-none">{item.name}</h4>
                            <button 
                              onClick={(e) => openDeleteItemDialog(item.id, e)}
                              className="text-red-400 p-4 bg-red-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                          <p className="text-slate-500 leading-relaxed text-lg font-bold mb-8">{item.description}</p>
                          <div className="text-[10px] text-slate-300 font-black tracking-[0.2em] uppercase flex items-center gap-2">
                             COLLECTED ON {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* 編輯 Modal */}
        {showEditor && (
          <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 shadow-2xl animate-in slide-in-from-bottom-full duration-400">
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-3xl text-slate-900 tracking-tighter">
                  {editingCollection ? '重新命名' : '建立類別'}
                </h3>
                <button onClick={() => setShowEditor(false)} className="text-slate-300 p-2 hover:text-slate-900">
                  <X size={32} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">名稱</label>
                  <input 
                    autoFocus
                    value={newCollectionName} 
                    onChange={e => setNewCollectionName(e.target.value)}
                    placeholder="請輸入類別名稱..."
                    className="w-full bg-slate-50 border-4 border-slate-50 rounded-[1.5rem] px-8 py-6 text-slate-900 font-black text-2xl focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-200"
                  />
                </div>
                
                <button 
                  onClick={addOrUpdateCollection}
                  className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-2xl active:scale-[0.96] transition-all"
                >
                  確認儲存
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 隱藏的檔案輸入框 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default App;
