import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Book, 
  CheckCircle, 
  Clock, 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  FileText,
  User,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TrainingModule, TrainingLog } from '../types';
import { 
  MODULE_CATEGORIES, 
  CATEGORY_COLORS, 
  getCategoryOfModule, 
  FORMATEURS, 
  TYPES 
} from '../data/modulesData';

interface ModuleCatalogProps {
  modulesCatalog: TrainingModule[];
  trainingLogs: TrainingLog[];
  onAddModule: (module: Omit<TrainingModule, 'id'>) => void;
  onUpdateModule: (updatedModule: TrainingModule) => void;
  onDeleteModule: (id: string) => void;
  isReadOnly?: boolean;
}

export default function ModuleCatalog({ 
  modulesCatalog, 
  trainingLogs,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  isReadOnly = false
}: ModuleCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Sort State
  const [sortField, setSortField] = useState<'tag' | 'code' | 'name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'tag' | 'code' | 'name') => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Réglementaire');
  const [formFormateur, setFormFormateur] = useState('Hubjob - Interne');
  const [formType, setFormType] = useState('Présentiel');
  const [formCode, setFormCode] = useState('');

  // Delete Confirm State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Compute status count per module
  const moduleStats = useMemo(() => {
    const stats: Record<string, { total: number; validated: number; active: number; failed: number }> = {};
    
    // Initialize
    modulesCatalog.forEach(m => {
      stats[m.name] = { total: 0, validated: 0, active: 0, failed: 0 };
    });

    // Compute
    trainingLogs.forEach(log => {
      if (stats[log.moduleName]) {
        stats[log.moduleName].total += 1;
        if (log.resultat === 'Réussite') {
          stats[log.moduleName].validated += 1;
        } else if (log.resultat === 'En cours' || log.resultat === 'Rattrapage' || log.resultat === 'A traiter') {
          stats[log.moduleName].active += 1;
        } else if (log.resultat === 'Echouée' || log.resultat === 'Annulée' || log.resultat === 'Absent') {
          stats[log.moduleName].failed += 1;
        }
      }
    });

    return stats;
  }, [modulesCatalog, trainingLogs]);

  // Filters & Sorting
  const filteredModules = useMemo(() => {
    const list = modulesCatalog.filter(m => {
      const category = getCategoryOfModule(m);
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.formateur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (!sortField) return list;

    return [...list].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'tag') {
        valA = getCategoryOfModule(a);
        valB = getCategoryOfModule(b);
      } else if (sortField === 'code') {
        valA = a.code || '';
        valB = b.code || '';
      } else if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      }

      const cmp = valA.localeCompare(valB, 'fr', { sensitivity: 'base', numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [modulesCatalog, searchTerm, selectedCategory, sortField, sortOrder]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setSelectedModule(null);
    setFormName('');
    setFormCategory('Réglementaire');
    setFormFormateur('Hubjob - Interne');
    setFormType('Présentiel');
    setFormCode('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (mod: TrainingModule) => {
    setSelectedModule(mod);
    setFormName(mod.name);
    setFormCategory(getCategoryOfModule(mod));
    setFormFormateur(mod.formateur || 'Hubjob - Interne');
    setFormType(mod.type || 'Présentiel');
    setFormCode(mod.code || '');
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (selectedModule) {
      // Edit mode
      onUpdateModule({
        ...selectedModule,
        name: formName.trim(),
        category: formCategory,
        formateur: formFormateur,
        type: formType,
        code: formCode.trim()
      });
    } else {
      // Add mode
      onAddModule({
        name: formName.trim(),
        category: formCategory,
        formateur: formFormateur,
        type: formType,
        code: formCode.trim(),
        cycle: 'INI',
        escale: 'Hubjob',
        service: 'ADMIN',
        resultat: 'En cours',
        consigne: 'N/A'
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onDeleteModule(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6" id="module-catalog-container">
      
      {/* Header and Filter */}
      <div className="sticky top-[112px] z-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-1.5">
              <Book className="h-4.5 w-4.5 text-blue-600" /> Catalogue de Formation ({modulesCatalog.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consultez et gérez le catalogue des modules de formation (règlementaires, métiers, QSE, langues, management, etc.).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher (nom, code, formateur...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            {!isReadOnly && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                id="add-module-btn"
                title="Ajouter un module"
              >
                <Plus className="h-4 w-4" /> Ajouter un module
              </button>
            )}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2" id="category-pills">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les modules
          </button>
          {MODULE_CATEGORIES.map(cat => {
            const count = modulesCatalog.filter(m => getCategoryOfModule(m) === cat).length;
            if (count === 0) return null; // Hide empty categories
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat]?.hex }}></span>
                {cat}
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="module-catalog-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('tag')}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer select-none group"
                    title="Trier par Tag / Catégorie"
                  >
                    <span>Tag</span>
                    {sortField === 'tag' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('code')}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer select-none group"
                    title="Trier par Code de formation"
                  >
                    <span>Code</span>
                    {sortField === 'code' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer select-none group"
                    title="Trier par Nom du module"
                  >
                    <span>Nom du module</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Formateur habituel</th>
                <th className="py-3.5 px-4">Modalité</th>
                <th className="py-3.5 px-4 text-center">Suivi de commande</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    Aucun module de formation ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const cat = getCategoryOfModule(mod);
                  const colorConfig = CATEGORY_COLORS[cat] || { hex: '#737373', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
                  const stats = moduleStats[mod.name] || { total: 0, validated: 0, active: 0, failed: 0 };
                  
                  return (
                    <tr 
                      key={mod.id} 
                      className="hover:bg-slate-50/80 transition-colors"
                      id={`module-row-${mod.id}`}
                    >
                      {/* Tag / Catégorie */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[9px] ${colorConfig.bg} ${colorConfig.text} px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${colorConfig.border}`}>
                          <Tag className="h-2.5 w-2.5" /> {cat}
                        </span>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {mod.code ? (
                          <span className="font-mono text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                            {mod.code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic font-medium">-</span>
                        )}
                      </td>

                      {/* Nom du module */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-xs block" title={mod.name}>
                          {mod.name}
                        </span>
                      </td>

                      {/* Formateur habituel */}
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {mod.formateur || 'Hubjob - Interne'}
                      </td>

                      {/* Modalité pédagogique */}
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {mod.type || 'Présentiel'}
                      </td>

                      {/* Suivi de commande */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" id={`suivi-commande-${mod.id}`}>
                          <span 
                            title="Commandes Validées (Réussite)" 
                            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            {stats.validated}
                          </span>
                          <span 
                            title="Commandes En cours" 
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            <Clock className="h-3 w-3 text-blue-600" />
                            {stats.active}
                          </span>
                          <span 
                            title="Commandes Échouées (Echouée, Annulée, Absent)" 
                            className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200/80 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            <X className="h-3 w-3 text-red-600" />
                            {stats.failed}
                          </span>
                          <span 
                            title="Total des commandes" 
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-extrabold"
                          >
                            <FileText className="h-3 w-3 text-slate-600" />
                            {stats.total}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isReadOnly ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(mod)}
                              title="Modifier le module"
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(mod.id)}
                              title="Supprimer le module"
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-medium">Lecture seule</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Confirmer la suppression</h4>
            <p className="text-xs text-slate-500 mt-2">
              Êtes-vous sûr de vouloir supprimer ce module du catalogue ? Les fiches de suivi existantes ne seront pas supprimées mais perdront le lien direct de référencement.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-scale-up">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#082C66] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {selectedModule ? 'Modifier le module de formation' : 'Nouveau module de formation'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Module Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Nom du module *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: REGLEMENTAIRE - SGS NIVEAU 1"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tag / Catégorie *
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none cursor-pointer"
                  >
                    {MODULE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3.5 flex items-center gap-1.5 pointer-events-none">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[formCategory]?.hex }}
                    ></span>
                  </div>
                </div>
              </div>

              {/* Formateur habituel dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Formateur habituel *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formFormateur}
                    onChange={(e) => setFormFormateur(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none cursor-pointer"
                  >
                    {FORMATEURS.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modalité pédagogique */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Modalité pédagogique *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none cursor-pointer"
                  >
                    {TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code de formation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Code de formation
                </label>
                <input
                  type="text"
                  placeholder="Ex: SGS1, CACES3, etc."
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0062FF] hover:bg-[#0062FF]/95 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
