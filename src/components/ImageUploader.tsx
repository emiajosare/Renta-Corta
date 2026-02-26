import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ImageUploaderProps {
  label: string;
  currentUrl?: string;
  contextName: string;
  onUploadSuccess: (url: string) => void;
  onDelete: () => void;
  isAvatar?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  currentUrl,
  contextName,
  onUploadSuccess,
  onDelete,
  isAvatar = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tipo y tamaño (máx 5MB)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Solo se permiten imágenes JPG, PNG, WEBP o GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen no puede superar 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Generamos un nombre único para evitar colisiones
      const fileExt = file.name.split('.').pop();
      const fileName = `${contextName}-${Date.now()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      // Subimos a Supabase Storage (bucket: 'images')
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtenemos la URL pública
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      onUploadSuccess(data.publicUrl);

    } catch (err) {
      console.error('Error al subir imagen:', err);
      setUploadError('Error al subir la imagen. Intenta con una URL directa.');
    } finally {
      setIsUploading(false);
      // Limpiamos el input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <label className="text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] ml-1">
        {label}
      </label>

      <div className="flex items-center space-x-6">
        {/* Previsualización */}
        <div className={`relative group w-24 h-24 flex-shrink-0 bg-slate-100 border-2 border-white shadow-sm overflow-hidden ${isAvatar ? 'rounded-full' : 'rounded-3xl'}`}>
          {currentUrl ? (
            <>
              <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={onDelete}
                className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              {isUploading ? (
                <svg className="w-8 h-8 animate-spin text-[#0052FF]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex-1 space-y-3">

          {/* BOTÓN SUBIR ARCHIVO */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              id={`file-${contextName}`}
            />
            <label
              htmlFor={`file-${contextName}`}
              className={`flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                isUploading
                  ? 'border-[#0052FF] bg-blue-50 cursor-wait'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#0052FF] hover:bg-blue-50'
              }`}
            >
              <svg className="w-5 h-5 text-[#0052FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0052FF]">
                {isUploading ? 'Subiendo...' : 'Subir desde dispositivo'}
              </span>
            </label>
          </div>

          {/* SEPARADOR */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">o</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* INPUT URL MANUAL como alternativa */}
          <input
            type="text"
            value={currentUrl || ''}
            onChange={(e) => onUploadSuccess(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/10 outline-none transition-all duration-300 font-medium text-sm"
          />

          {/* ERROR */}
          {uploadError && (
            <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest animate-pulse">
              ⚠️ {uploadError}
            </p>
          )}

          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider ml-1">
            JPG, PNG, WEBP · Máx 5MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;