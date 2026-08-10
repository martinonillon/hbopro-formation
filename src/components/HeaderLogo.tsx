import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface HeaderLogoProps {
  defaultLogoUrl?: string;
  canEditLogo?: boolean;
}

export default function HeaderLogo({ 
  defaultLogoUrl = '/src/assets/images/logo_hubjob_1784577741492.jpg',
  canEditLogo = false 
}: HeaderLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('app_custom_logo') || null;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditLogo) return;
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!canEditLogo) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG, WebP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
        localStorage.setItem('app_custom_logo', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEditLogo) return;
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditLogo) return;
    setLogoUrl(null);
    localStorage.removeItem('app_custom_logo');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (!canEditLogo) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="relative flex items-center" id="header-logo-container">
      {canEditLogo && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          id="logo-file-input"
        />
      )}

      <div
        onClick={canEditLogo ? triggerFileInput : undefined}
        onDragOver={canEditLogo ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
        onDragLeave={canEditLogo ? () => setDragOver(false) : undefined}
        onDrop={canEditLogo ? handleDrop : undefined}
        onMouseEnter={canEditLogo ? () => setIsHovered(true) : undefined}
        onMouseLeave={canEditLogo ? () => setIsHovered(false) : undefined}
        className={`group relative flex items-center justify-center rounded-xl transition-all duration-200 select-none ${
          canEditLogo
            ? dragOver 
              ? 'ring-2 ring-[#0062FF] bg-blue-50/80 border-dashed border-[#0062FF] p-1 cursor-pointer' 
              : 'hover:bg-slate-50 p-1 border border-transparent hover:border-slate-200 cursor-pointer'
            : 'p-1 cursor-default'
        }`}
        title={canEditLogo ? "Cliquer ou glisser-déposer pour importer votre logo" : "Logo Hubjob"}
        id="header-logo-dropzone"
      >
        {logoUrl ? (
          /* Custom imported logo display */
          <div className="relative flex items-center max-h-[48px] px-1">
            <img
              src={logoUrl}
              alt="Logo personnalisé"
              className={`h-[44px] max-w-[200px] object-contain transition-transform duration-200 ${canEditLogo ? 'group-hover:scale-95' : ''}`}
              referrerPolicy="no-referrer"
            />

            {/* Hover overlay for changing / deleting custom logo (Only for admin MOE0226) */}
            {canEditLogo && (
              <div
                className={`absolute inset-0 bg-slate-900/75 backdrop-blur-2xs rounded-lg flex items-center justify-center gap-1.5 transition-opacity duration-200 ${
                  isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="text-[10px] font-bold text-white flex items-center gap-1">
                  <Upload className="h-3 w-3 text-blue-300" /> Modifier
                </span>
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="p-1 text-slate-300 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
                  title="Réinitialiser le logo par défaut"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : canEditLogo ? (
          /* Default placeholder prompt when no custom logo is imported and admin can edit */
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-blue-50/60 border border-dashed border-slate-300 hover:border-[#0062FF]/50 rounded-xl transition-all shadow-2xs group-hover:shadow-xs">
            {defaultLogoUrl ? (
              <img
                src={defaultLogoUrl}
                alt="Logo par défaut"
                className="h-9 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-1.5 bg-blue-100/70 text-[#0062FF] rounded-lg">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}

            <div className="flex flex-col text-left pr-1">
              <span className="text-[11px] font-extrabold text-slate-700 group-hover:text-[#0062FF] flex items-center gap-1">
                <Upload className="h-3 w-3 text-[#0062FF]" /> Importer logo
              </span>
              <span className="text-[9px] text-slate-400 font-medium">Cliquer ou glisser ici</span>
            </div>
          </div>
        ) : (
          /* Clean logo for non-admin users (read-only logo display) */
          <div className="flex items-center max-h-[48px] px-1">
            {defaultLogoUrl ? (
              <img
                src={defaultLogoUrl}
                alt="Logo Hubjob"
                className="h-[44px] max-w-[200px] object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-1.5 bg-blue-100/70 text-[#0062FF] rounded-lg">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
