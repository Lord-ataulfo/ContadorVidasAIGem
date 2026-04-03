import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Trash2, Camera, Loader2, Check, User } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { updateUserProfilePhoto } from '../services/authService.ts';

interface ProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ userProfile, onClose, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type: only JPEG and PNG
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes en formato JPEG o PNG.');
      return;
    }

    // Validate file size (max 2MB for initial upload, we will compress it)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is too large. Please select an image under 2MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const base64 = await compressImage(file);
      await updateUserProfilePhoto(userProfile.uid, base64);
      
      const updatedProfile = { ...userProfile, photoURL: base64 };
      onUpdate(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!userProfile.photoURL) return;
    
    setIsUploading(true);
    setError(null);

    try {
      await updateUserProfilePhoto(userProfile.uid, null);
      const updatedProfile = { ...userProfile, photoURL: undefined };
      onUpdate(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Use low quality to keep string size small
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-emerald-500">Ajustes de Perfil</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/20 bg-zinc-800 flex items-center justify-center relative">
                {userProfile.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt={userProfile.username} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-16 h-16 text-zinc-600" />
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-zinc-950 rounded-full shadow-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">{userProfile.username}</h3>
              <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">{userProfile.userCode}</p>
            </div>

            <div className="w-full space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png"
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                {userProfile.photoURL ? 'Cambiar Imagen' : 'Subir Imagen'}
              </button>

              <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest">
                Formatos permitidos: JPEG, PNG
              </p>

              {userProfile.photoURL && (
                <button
                  onClick={handleDeletePhoto}
                  disabled={isUploading}
                  className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  Eliminar Imagen
                </button>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-500 font-medium text-center"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-emerald-500 font-medium"
                >
                  <Check className="w-4 h-4" />
                  <span>¡Perfil actualizado con éxito!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
