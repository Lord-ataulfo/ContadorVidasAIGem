import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, Loader2, Save, Trash2, Plus, List, Edit2, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommanderCard } from '../types.ts';
import { extractCardName } from '../services/aiService.ts';
import { addCommander, getCommanders, updateCommander, deleteCommander, listenToCommanders } from '../services/authService.ts';
import { resizeImage, isBase64SizeValid } from '../lib/imageUtils.ts';

interface CommanderModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onUpdate: (card: CommanderCard | null) => void;
}

type Tab = 'list' | 'add' | 'edit';

export const CommanderModal: React.FC<CommanderModalProps> = ({
  isOpen,
  onClose,
  uid,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [commanders, setCommanders] = useState<CommanderCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<CommanderCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [cardName, setCardName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsubscribe = listenToCommanders(uid, (list) => {
      setCommanders(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, uid]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      
      setIsExtracting(true);
      try {
        const name = await extractCardName(base64);
        setCardName(name || '');
      } catch (error) {
        console.error("OCR Error:", error);
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!cardName || !previewUrl) return;
    setIsSaving(true);
    setError(null);
    try {
      // Resize and compress image before saving to stay under 1MB Firestore limit
      let finalImageUrl = previewUrl;
      try {
        finalImageUrl = await resizeImage(previewUrl, 600, 800, 0.6);
        
        // Final check
        if (!isBase64SizeValid(finalImageUrl, 900000)) {
          throw new Error("La imagen es demasiado pesada incluso después de comprimirla. Intenta con otra foto.");
        }
      } catch (resizeErr) {
        console.warn("Resize failed, attempting original:", resizeErr);
      }

      if (activeTab === 'add') {
        await addCommander(uid, { name: cardName, imageURL: finalImageUrl });
        setActiveTab('list');
      } else if (activeTab === 'edit' && editingCard) {
        await updateCommander(uid, editingCard.id, { name: cardName, imageURL: finalImageUrl });
        setActiveTab('list');
      }
      resetForm();
    } catch (error: any) {
      console.error("Save Error:", error);
      let message = "Error al guardar el comandante.";
      if (error.message?.includes("too large") || error.message?.includes("limit")) {
        message = "La imagen es demasiado grande para guardarla. Intenta con una foto de menor resolución.";
      } else if (typeof error === 'string') {
        message = error;
      } else if (error.message) {
        message = error.message;
      }
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (commanderId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta carta de comandante?")) return;
    setIsSaving(true);
    try {
      await deleteCommander(uid, commanderId);
    } catch (error) {
      console.error("Delete Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (c: CommanderCard) => {
    setEditingCard(c);
    setCardName(c.name);
    setPreviewUrl(c.imageURL);
    setActiveTab('edit');
  };

  const resetForm = () => {
    setCardName('');
    setPreviewUrl(null);
    setEditingCard(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">Gestión de Comandantes</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => { setActiveTab('list'); resetForm(); }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List size={14} className="inline mr-1" /> Mis Cartas
                </button>
                <button
                  onClick={() => { setActiveTab('add'); resetForm(); }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'add' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Plus size={14} className="inline mr-1" /> Añadir
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 transition-colors hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'list' ? (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p>Cargando tus comandantes...</p>
                  </div>
                ) : commanders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                    <Swords size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No tienes comandantes guardados</p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="mt-4 text-indigo-600 font-bold hover:underline"
                    >
                      Añade tu primer comandante
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {commanders.map((c) => (
                      <div key={c.id} className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex gap-4 p-3">
                          <div className="w-20 h-28 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                            <img src={c.imageURL} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                              <h3 className="font-bold text-gray-900 leading-tight">{c.name}</h3>
                              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(c)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900">
                    {activeTab === 'add' ? 'Nuevo Comandante' : 'Editar Comandante'}
                  </h3>
                  <p className="text-sm text-gray-500">Sube una foto de tu carta para identificarla</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium animate-shake">
                    {error}
                  </div>
                )}

                {!previewUrl ? (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 space-y-4">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
                      <Camera size={32} />
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Seleccionar Imagen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative aspect-[2.5/3.5] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100">
                      <img
                        src={previewUrl}
                        alt="Commander Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isExtracting && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center">
                          <Loader2 className="animate-spin mb-2" size={32} />
                          <p className="text-xs font-medium">Leyendo nombre...</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Nombre del Comandante
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Nombre del comandante..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                        />
                        {isExtracting && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-indigo-500" size={18} />
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera size={16} />
                      Cambiar Foto
                    </button>
                  </div>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              style={{ display: 'none' }}
            />
          </div>

          {/* Footer */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button
                onClick={() => { setActiveTab('list'); resetForm(); }}
                className="flex-1 px-4 py-2 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleSave}
                disabled={!cardName || !previewUrl || isSaving || isExtracting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {activeTab === 'add' ? 'Guardar' : 'Actualizar'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
