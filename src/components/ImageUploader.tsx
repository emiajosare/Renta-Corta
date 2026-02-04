import React from 'react';

interface ImageUploaderProps {
  label: string;
  currentUrl?: string;
  contextName: string; // Se mantiene por compatibilidad con el padre, aunque no se use internamente
  onUploadSuccess: (url: string) => void;
  onDelete: () => void;
  isAvatar?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  currentUrl, 
  onUploadSuccess, 
  onDelete,
  isAvatar = false 
}) => {
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
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Input URL Manual */}
        <div className="flex-1 min-w-[200px]">
           <input
              type="text"
              value={currentUrl || ''}
              onChange={(e) => onUploadSuccess(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/10 outline-none transition-all duration-300 font-medium"
            />
            <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">
              URL directa de la imagen
            </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;