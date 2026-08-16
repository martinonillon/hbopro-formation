import React, { useState, useMemo } from 'react';
import { 
  Contact, 
  CONTACT_ESCALES, 
  CONTACT_ENTITIES 
} from '../types';
import { getEscaleStyle } from '../data/modulesData';
import { 
  Search, 
  Plus, 
  Download, 
  Phone, 
  Mail, 
  X, 
  Edit2, 
  Trash2, 
  Building2, 
  MapPin, 
  Briefcase, 
  Copy, 
  Check, 
  PhoneCall, 
  Smartphone,
  ExternalLink,
  BookUser,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContactsDirectoryProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onClose?: () => void;
}

export default function ContactsDirectory({
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onClose
}: ContactsDirectoryProps) {
  // Filters state
  const [selectedEscale, setSelectedEscale] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [phonePopupContact, setPhonePopupContact] = useState<Contact | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New Contact Form State
  const [newGenre, setNewGenre] = useState<string>('M.');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newEscale, setNewEscale] = useState<string>(CONTACT_ESCALES[0]);
  const [newEntity, setNewEntity] = useState<string>(CONTACT_ENTITIES[0]);
  const [newCompany, setNewCompany] = useState('');
  const [newService, setNewService] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newMobilePhone, setNewMobilePhone] = useState('');
  const [newLandlinePhone, setNewLandlinePhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

  // Edit Contact Form State
  const [editForm, setEditForm] = useState<Partial<Contact>>({});

  // Helper for dynamic email domain based on entity
  const getEntityDomain = (entity: string): string => {
    switch (entity) {
      case 'ALYZIA':
        return '@alyzia.com';
      case "GIMN'S":
        return '@gimns.com';
      case 'HUBJOB':
        return '@hubjob.fr';
      default:
        return '';
    }
  };

  // Helper to handle entity change in creation form with dynamic email suggestion
  const handleNewEntityChange = (entity: string) => {
    setNewEntity(entity);
    const domain = getEntityDomain(entity);
    if (domain) {
      if (!emailManuallyEdited || !newEmail || newEmail.endsWith('@alyzia.com') || newEmail.endsWith('@gimns.com') || newEmail.endsWith('@hubjob.fr')) {
        const cleanFirst = newFirstName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const cleanLast = newLastName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (cleanFirst && cleanLast) {
          setNewEmail(`${cleanFirst}.${cleanLast}${domain}`);
        } else if (cleanLast) {
          setNewEmail(`${cleanLast}${domain}`);
        } else if (newEmail.includes('@')) {
          const userPart = newEmail.split('@')[0];
          setNewEmail(`${userPart}${domain}`);
        }
      }
    }
  };

  // Autocomplete email based on name typing
  const handleNameChangeForEmail = (first: string, last: string, currentEntity: string) => {
    if (!emailManuallyEdited) {
      const domain = getEntityDomain(currentEntity);
      if (domain) {
        const cleanFirst = first.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const cleanLast = last.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (cleanFirst && cleanLast) {
          setNewEmail(`${cleanFirst}.${cleanLast}${domain}`);
        } else if (cleanLast) {
          setNewEmail(`${cleanLast}${domain}`);
        }
      }
    }
  };

  // Reset creation form
  const resetNewForm = () => {
    setNewGenre('M.');
    setNewLastName('');
    setNewFirstName('');
    setNewEscale(CONTACT_ESCALES[0]);
    setNewEntity(CONTACT_ENTITIES[0]);
    setNewCompany('');
    setNewService('');
    setNewPosition('');
    setNewComment('');
    setNewMobilePhone('');
    setNewLandlinePhone('');
    setNewEmail('');
    setEmailManuallyEdited(false);
  };

  // Handle submit new contact
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLastName.trim() || !newFirstName.trim()) return;

    onAddContact({
      genre: newGenre,
      lastName: newLastName.trim().toUpperCase(),
      firstName: newFirstName.trim().charAt(0).toUpperCase() + newFirstName.trim().slice(1),
      escale: newEscale,
      entity: newEntity,
      company: newCompany.trim() || undefined,
      service: newService.trim() || undefined,
      position: newPosition.trim() || undefined,
      comment: newComment.trim() || undefined,
      mobilePhone: newMobilePhone.trim() || undefined,
      landlinePhone: newLandlinePhone.trim() || undefined,
      email: newEmail.trim() || undefined
    });

    setIsNewModalOpen(false);
    resetNewForm();
  };

  // Open detail modal
  const handleOpenDetail = (contact: Contact) => {
    setDetailContact(contact);
    setEditForm({ ...contact });
    setIsEditingDetail(false);
    setDeleteConfirmId(null);
  };

  // Save detail updates
  const handleSaveDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailContact || !editForm.lastName?.trim() || !editForm.firstName?.trim()) return;

    const updated: Contact = {
      ...detailContact,
      genre: editForm.genre || detailContact.genre,
      lastName: editForm.lastName.trim().toUpperCase(),
      firstName: editForm.firstName.trim().charAt(0).toUpperCase() + editForm.firstName.trim().slice(1),
      escale: editForm.escale || detailContact.escale,
      entity: editForm.entity || detailContact.entity,
      company: editForm.company?.trim() || undefined,
      service: editForm.service?.trim() || undefined,
      position: editForm.position?.trim() || undefined,
      comment: editForm.comment?.trim() || undefined,
      mobilePhone: editForm.mobilePhone?.trim() || undefined,
      landlinePhone: editForm.landlinePhone?.trim() || undefined,
      email: editForm.email?.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    onUpdateContact(updated);
    setDetailContact(updated);
    setIsEditingDetail(false);
  };

  // Confirm delete
  const handleConfirmDelete = (id: string) => {
    onDeleteContact(id);
    setDetailContact(null);
    setDeleteConfirmId(null);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Filter contacts in real time
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(contact => {
      // Escale filter
      if (selectedEscale && contact.escale !== selectedEscale) {
        return false;
      }
      // Entity filter
      if (selectedEntity && contact.entity !== selectedEntity) {
        return false;
      }
      // Global search filter
      if (q) {
        const matchesName = `${contact.lastName} ${contact.firstName}`.toLowerCase().includes(q) ||
                            `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(q);
        const matchesEscale = contact.escale?.toLowerCase().includes(q);
        const matchesEntity = contact.entity?.toLowerCase().includes(q);
        const matchesCompany = contact.company?.toLowerCase().includes(q);
        const matchesPosition = contact.position?.toLowerCase().includes(q);
        const matchesService = contact.service?.toLowerCase().includes(q);
        const matchesMobile = contact.mobilePhone?.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
        const matchesLandline = contact.landlinePhone?.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
        const matchesEmail = contact.email?.toLowerCase().includes(q);

        if (!matchesName && !matchesEscale && !matchesEntity && !matchesCompany && 
            !matchesPosition && !matchesService && !matchesMobile && !matchesLandline && !matchesEmail) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }));
  }, [contacts, selectedEscale, selectedEntity, searchQuery]);

  // Export to .xlsx
  const handleExportXLSX = () => {
    const rows = filteredContacts.map(c => ({
      'Genre': c.genre || '',
      'Nom': c.lastName,
      'Prénom': c.firstName,
      'Escale': c.escale,
      'Entité': c.entity,
      'Entreprise': c.company || '',
      'Service': c.service || '',
      'Poste': c.position || '',
      'Téléphone mobile': c.mobilePhone || '',
      'Téléphone fixe': c.landlinePhone || '',
      'E-mail': c.email || '',
      'Commentaire': c.comment || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Set auto-width for columns
    const colWidths = [
      { wch: 8 },  // Genre
      { wch: 20 }, // Nom
      { wch: 18 }, // Prénom
      { wch: 10 }, // Escale
      { wch: 14 }, // Entité
      { wch: 25 }, // Entreprise
      { wch: 22 }, // Service
      { wch: 25 }, // Poste
      { wch: 18 }, // Mobile
      { wch: 18 }, // Fixe
      { wch: 30 }, // E-mail
      { wch: 35 }  // Commentaire
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

    const fileName = `Repertoire_Contacts_HubStation_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Visual styling helpers for badges
  // Pour les entités : toujours bleu marine (#082C66)
  const getEntityBadgeStyle = (_entity?: string) => {
    return 'bg-[#082C66] text-white border-[#082C66]';
  };

  return (
    <div className="space-y-5 animate-fade-in" id="contacts-directory-module">
      
      {/* Module Header Bar with Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        
        {/* Title & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#082C66] to-[#0062FF] text-white flex items-center justify-center shadow-xs">
              <BookUser className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-[#082C66] tracking-tight">Répertoire de contacts</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredContacts.length} {filteredContacts.length > 1 ? 'contacts' : 'contact'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Annuaire centralisé des interlocuteurs métiers, opérationnels et partenaires
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Fermer le répertoire"
              id="close-contacts-directory-btn"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Line 1: Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Escale Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0062FF]" />
              Filtrer par Escale
            </label>
            <select
              value={selectedEscale}
              onChange={(e) => setSelectedEscale(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0062FF] rounded-xl text-xs font-semibold text-slate-800 transition-all outline-none"
              id="filter-contact-escale"
            >
              <option value="">Toutes les escales ({CONTACT_ESCALES.length})</option>
              {CONTACT_ESCALES.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          {/* Entity Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#082C66]" />
              Filtrer par Entité
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0062FF] rounded-xl text-xs font-semibold text-slate-800 transition-all outline-none"
              id="filter-contact-entity"
            >
              <option value="">Toutes les entités ({CONTACT_ENTITIES.length})</option>
              {CONTACT_ENTITIES.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Quick Button if active */}
          {(selectedEscale || selectedEntity || searchQuery) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedEscale('');
                  setSelectedEntity('');
                  setSearchQuery('');
                }}
                className="w-full h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                id="reset-contact-filters-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Line 2: Global Search Bar and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Global Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Recherche globale (Nom, Prénom, Escale, Entité, Entreprise, Poste, Téléphone, E-mail)..."
              className="w-full h-10 pl-9.5 pr-8 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0062FF] rounded-xl text-xs font-medium text-slate-800 transition-all outline-none placeholder:text-slate-400"
              id="search-contact-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions: Nouveau & Export */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                resetNewForm();
                setIsNewModalOpen(true);
              }}
              className="h-10 px-4 bg-[#082C66] hover:bg-[#0062FF] text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
              id="btn-new-contact"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </button>

            <button
              onClick={handleExportXLSX}
              className="h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
              title="Exporter les contacts affichés au format Excel (.xlsx)"
              id="btn-export-contacts-xlsx"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export</span>
            </button>
          </div>
        </div>

      </div>

      {/* Grid of Contact Cards - Responsive 5 Columns */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <BookUser className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun contact ne correspond à votre recherche</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Modifiez vos filtres d'escale/entité ou réinitialisez le champ de recherche pour afficher les contacts du répertoire.
          </p>
          <button
            onClick={() => {
              setSelectedEscale('');
              setSelectedEntity('');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Afficher tous les contacts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3" id="contacts-grid-container">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0062FF]/40 transition-all p-3 flex flex-col justify-between group relative overflow-hidden"
              id={`contact-card-${contact.id}`}
            >
              {/* Subtle top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#082C66] to-[#0062FF] opacity-80" />

              <div className="space-y-2.5 pt-1">
                {/* 2-Column Internal Card Layout: Left Block & Right Block */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  
                  {/* Bloc Gauche : Nom, Prénom, Escale, Entité */}
                  <div className="space-y-1.5 pr-1 border-r border-slate-100">
                    <div>
                      <button
                        onClick={() => handleOpenDetail(contact)}
                        className="text-left font-black text-slate-900 text-xs sm:text-[13px] hover:text-[#0062FF] transition-colors leading-tight line-clamp-2 cursor-pointer block group-hover:underline"
                        title="Ouvrir la fiche détaillée du contact"
                        id={`contact-name-btn-${contact.id}`}
                      >
                        {contact.genre && <span className="text-[11px] text-slate-500 font-normal mr-1">{contact.genre}</span>}
                        {contact.lastName}
                        <br />
                        <span className="font-semibold text-slate-700">{contact.firstName}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {/* Escale : Reprend les couleurs des KPI */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getEscaleStyle(contact.escale).bg} ${getEscaleStyle(contact.escale).text} ${getEscaleStyle(contact.escale).border}`}>
                        {contact.escale}
                      </span>
                      {/* Entité : Toujours bleu marine */}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#082C66] text-white border border-[#082C66] tracking-wide">
                        {contact.entity}
                      </span>
                    </div>
                  </div>

                  {/* Bloc Droit : Entreprise, Téléphone mobile, E-mail */}
                  <div className="space-y-1.5 pl-1 text-[11px] flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-[11px] truncate" title={contact.company || 'Entreprise non renseignée'}>
                        {contact.company || '—'}
                      </p>
                      {contact.position && (
                        <p className="text-[10px] text-slate-500 truncate" title={contact.position}>
                          {contact.position}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      {contact.mobilePhone ? (
                        <p className="font-semibold text-[#082C66] text-[11px] truncate flex items-center gap-1" title={`Mobile: ${contact.mobilePhone}`}>
                          <Smartphone className="w-3 h-3 text-[#0062FF] shrink-0" />
                          <span className="truncate">{contact.mobilePhone}</span>
                        </p>
                      ) : contact.landlinePhone ? (
                        <p className="font-medium text-slate-600 text-[11px] truncate flex items-center gap-1" title={`Fixe: ${contact.landlinePhone}`}>
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{contact.landlinePhone}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Aucun tél.</p>
                      )}

                      {contact.email ? (
                        <p className="text-[10px] text-slate-600 truncate" title={contact.email}>
                          {contact.email}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Aucun e-mail</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                {/* Quick Phone Popup */}
                <button
                  onClick={() => setPhonePopupContact(contact)}
                  disabled={!contact.mobilePhone && !contact.landlinePhone}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                    contact.mobilePhone || contact.landlinePhone
                      ? 'bg-blue-50 text-[#0062FF] hover:bg-blue-100 hover:text-[#082C66]'
                      : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                  title={contact.mobilePhone || contact.landlinePhone ? 'Afficher les numéros de téléphone' : 'Aucun numéro disponible'}
                  id={`btn-phone-quick-${contact.id}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                {/* Quick Mailto */}
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                    title={`Envoyer un e-mail à ${contact.email}`}
                    id={`btn-mail-quick-${contact.id}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="p-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-300 cursor-not-allowed">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                )}

                {/* Detail View Open */}
                <button
                  onClick={() => handleOpenDetail(contact)}
                  className="p-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all ml-auto"
                  title="Fiche détaillée"
                  id={`btn-detail-quick-${contact.id}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL DE CRÉATION : "NOUVEAU CONTACT" (Centré en haut de page)          */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-10 sm:pt-14 animate-fade-in" id="modal-new-contact">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="bg-[#082C66] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#ffde59]" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Nouveau contact</h2>
                  <p className="text-xs text-sky-100/80">Ajouter un interlocuteur au répertoire d'entreprise</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                id="btn-close-new-contact-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateContact} className="p-5 sm:p-6 space-y-4">
              
              {/* Row 1: Genre, Nom, Prénom */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Genre</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  >
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                  </select>
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nom *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => {
                      setNewLastName(e.target.value);
                      handleNameChangeForEmail(newFirstName, e.target.value, newEntity);
                    }}
                    placeholder="ex: DUPONT"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-lastname"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => {
                      setNewFirstName(e.target.value);
                      handleNameChangeForEmail(e.target.value, newLastName, newEntity);
                    }}
                    placeholder="ex: Jean"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-firstname"
                  />
                </div>
              </div>

              {/* Row 2: Escale & Entité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0062FF]" />
                    Escale *
                  </label>
                  <select
                    value={newEscale}
                    onChange={(e) => setNewEscale(e.target.value)}
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-escale"
                  >
                    {CONTACT_ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#082C66]" />
                    Entité *
                  </label>
                  <select
                    value={newEntity}
                    onChange={(e) => handleNewEntityChange(e.target.value)}
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-entity"
                  >
                    {CONTACT_ENTITIES.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Entreprise, Service, Poste */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Entreprise</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="ex: Alyzia TLS"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Service</label>
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="ex: Exploitation Piste"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Poste</label>
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="ex: Chef d'escale"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Téléphone mobile & Téléphone fixe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#0062FF]" />
                    Téléphone mobile
                  </label>
                  <input
                    type="tel"
                    value={newMobilePhone}
                    onChange={(e) => setNewMobilePhone(e.target.value)}
                    placeholder="ex: 06 12 34 56 78"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-mobile"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    Téléphone fixe
                  </label>
                  <input
                    type="tel"
                    value={newLandlinePhone}
                    onChange={(e) => setNewLandlinePhone(e.target.value)}
                    placeholder="ex: 05 61 00 12 34"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    id="new-contact-landline"
                  />
                </div>
              </div>

              {/* Row 5: Adresse e-mail avec autocomplétion dynamique */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    Adresse e-mail
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Domaines rapides :</span>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = newEmail ? newEmail.split('@')[0] : (newLastName ? `${newFirstName || 'contact'}.${newLastName}`.toLowerCase() : '');
                        setNewEmail(`${prefix}@alyzia.com`);
                        setEmailManuallyEdited(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer"
                    >
                      @alyzia.com
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = newEmail ? newEmail.split('@')[0] : (newLastName ? `${newFirstName || 'contact'}.${newLastName}`.toLowerCase() : '');
                        setNewEmail(`${prefix}@gimns.com`);
                        setEmailManuallyEdited(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold cursor-pointer"
                    >
                      @gimns.com
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = newEmail ? newEmail.split('@')[0] : (newLastName ? `${newFirstName || 'contact'}.${newLastName}`.toLowerCase() : '');
                        setNewEmail(`${prefix}@hubjob.fr`);
                        setEmailManuallyEdited(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold cursor-pointer"
                    >
                      @hubjob.fr
                    </button>
                  </div>
                </div>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailManuallyEdited(true);
                  }}
                  placeholder="ex: prenom.nom@domaine.com"
                  className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  id="new-contact-email"
                />
                <p className="text-[11px] text-slate-400 italic">
                  * Adresse modifiable manuellement à 100 %. Autocomplétée selon l'entité sélectionnée.
                </p>
              </div>

              {/* Row 6: Commentaire */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Commentaire / Notes</label>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Informations complémentaires, astreintes, consignes particulières..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#082C66] hover:bg-[#0062FF] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                  id="btn-submit-create-contact"
                >
                  Créer le contact
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. POP-UP TÉLÉPHONE RAPIDE (Numéros en gros)                              */}
      {/* ========================================================================= */}
      {phonePopupContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-phone-quick">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#082C66] to-[#0062FF] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-[#ffde59]" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Coordonnées téléphoniques</h3>
                  <p className="text-xs text-sky-100 font-semibold truncate max-w-[240px]">
                    {phonePopupContact.genre} {phonePopupContact.firstName} {phonePopupContact.lastName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPhonePopupContact(null)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content with Big Phone Numbers */}
            <div className="p-6 space-y-4">
              
              {/* Mobile Phone Block */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#0062FF]" />
                    Téléphone mobile
                  </span>
                  {phonePopupContact.mobilePhone && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Principal
                    </span>
                  )}
                </div>

                {phonePopupContact.mobilePhone ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xl sm:text-2xl font-black text-[#082C66] tracking-wide select-all">
                      {phonePopupContact.mobilePhone}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(phonePopupContact.mobilePhone!, 'mobile')}
                        className="p-2 bg-white hover:bg-blue-100 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                        title="Copier le numéro mobile"
                      >
                        {copiedField === 'mobile' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`tel:${phonePopupContact.mobilePhone.replace(/\s+/g, '')}`}
                        className="p-2 bg-[#0062FF] hover:bg-[#082C66] text-white rounded-lg transition-all inline-flex items-center"
                        title="Appeler"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1">Aucun numéro mobile renseigné</p>
                )}
              </div>

              {/* Landline Phone Block */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Téléphone fixe
                  </span>
                </div>

                {phonePopupContact.landlinePhone ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-wide select-all">
                      {phonePopupContact.landlinePhone}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(phonePopupContact.landlinePhone!, 'fixe')}
                        className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                        title="Copier le numéro fixe"
                      >
                        {copiedField === 'fixe' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`tel:${phonePopupContact.landlinePhone.replace(/\s+/g, '')}`}
                        className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all inline-flex items-center"
                        title="Appeler"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1">Aucun numéro fixe renseigné</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setPhonePopupContact(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FICHE DÉTAILLÉE : CONSULTATION / ÉDITION / SUPPRESSION                  */}
      {/* ========================================================================= */}
      {detailContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-8 sm:pt-12 animate-fade-in" id="modal-detail-contact">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="bg-[#082C66] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm text-[#ffde59]">
                  {detailContact.firstName[0]}{detailContact.lastName[0]}
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>{detailContact.genre} {detailContact.firstName} {detailContact.lastName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getEscaleStyle(detailContact.escale).bg} ${getEscaleStyle(detailContact.escale).text} ${getEscaleStyle(detailContact.escale).border}`}>
                      {detailContact.escale}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/20">
                      {detailContact.entity}
                    </span>
                  </h2>
                  <p className="text-xs text-sky-100/80">
                    {detailContact.position || detailContact.company || 'Fiche contact répertoire'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailContact(null);
                  setIsEditingDetail(false);
                  setDeleteConfirmId(null);
                }}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                id="btn-close-detail-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {isEditingDetail ? (
              /* --- MODE ÉDITION --- */
              <form onSubmit={handleSaveDetail} className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Genre</label>
                    <select
                      value={editForm.genre || 'M.'}
                      onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    >
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nom *</label>
                    <input
                      type="text"
                      required
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Escale</label>
                    <select
                      value={editForm.escale || CONTACT_ESCALES[0]}
                      onChange={(e) => setEditForm({ ...editForm, escale: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    >
                      {CONTACT_ESCALES.map(esc => (
                        <option key={esc} value={esc}>{esc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Entité</label>
                    <select
                      value={editForm.entity || CONTACT_ENTITIES[0]}
                      onChange={(e) => setEditForm({ ...editForm, entity: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    >
                      {CONTACT_ENTITIES.map(ent => (
                        <option key={ent} value={ent}>{ent}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Entreprise</label>
                    <input
                      type="text"
                      value={editForm.company || ''}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Service</label>
                    <input
                      type="text"
                      value={editForm.service || ''}
                      onChange={(e) => setEditForm({ ...editForm, service: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Poste</label>
                    <input
                      type="text"
                      value={editForm.position || ''}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Téléphone mobile</label>
                    <input
                      type="tel"
                      value={editForm.mobilePhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, mobilePhone: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Téléphone fixe</label>
                    <input
                      type="tel"
                      value={editForm.landlinePhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, landlinePhone: e.target.value })}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Adresse e-mail</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Commentaire / Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.comment || ''}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] outline-none resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0062FF] hover:bg-[#082C66] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            ) : (
              /* --- MODE CONSULTATION COMPLÈTE --- */
              <div className="p-5 sm:p-6 space-y-5">
                
                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Left Column: Organization Details */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#082C66] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0062FF]" />
                      Organisation & Rattachement
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Escale & Entité</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Escale : Couleurs KPI */}
                          <span className={`px-2 py-0.5 rounded text-xs font-black border ${getEscaleStyle(detailContact.escale).bg} ${getEscaleStyle(detailContact.escale).text} ${getEscaleStyle(detailContact.escale).border}`}>
                            {detailContact.escale}
                          </span>
                          {/* Entité : Toujours bleu marine */}
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#082C66] text-white border border-[#082C66]">
                            {detailContact.entity}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Entreprise</span>
                        <span className="font-semibold text-slate-800">{detailContact.company || '—'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Service</span>
                        <span className="font-medium text-slate-800">{detailContact.service || '—'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Poste</span>
                        <span className="font-medium text-slate-800">{detailContact.position || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Contact Details */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#082C66] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#0062FF]" />
                      Coordonnées directes
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Téléphone mobile</span>
                        {detailContact.mobilePhone ? (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-bold text-[#082C66]">{detailContact.mobilePhone}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(detailContact.mobilePhone!, 'detail-mobile')}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
                                title="Copier"
                              >
                                {copiedField === 'detail-mobile' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`tel:${detailContact.mobilePhone.replace(/\s+/g, '')}`}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                title="Appeler"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non renseigné</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Téléphone fixe</span>
                        {detailContact.landlinePhone ? (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-medium text-slate-800">{detailContact.landlinePhone}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(detailContact.landlinePhone!, 'detail-fixe')}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
                                title="Copier"
                              >
                                {copiedField === 'detail-fixe' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`tel:${detailContact.landlinePhone.replace(/\s+/g, '')}`}
                                className="p-1 text-slate-700 hover:bg-slate-200 rounded"
                                title="Appeler"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non renseigné</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Adresse e-mail</span>
                        {detailContact.email ? (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]" title={detailContact.email}>
                              {detailContact.email}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(detailContact.email!, 'detail-email')}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
                                title="Copier"
                              >
                                {copiedField === 'detail-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`mailto:${detailContact.email}`}
                                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                                title="Envoyer un e-mail"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Commentaire Section */}
                {detailContact.comment && (
                  <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                      Commentaire / Instructions
                    </span>
                    <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
                      {detailContact.comment}
                    </p>
                  </div>
                )}

                {/* Delete Confirmation Warning or Action Buttons */}
                {deleteConfirmId === detailContact.id ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Confirmer la suppression définitive de ce contact ?</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(detailContact.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(detailContact.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      id="btn-delete-contact"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailContact(null);
                          setIsEditingDetail(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Fermer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...detailContact });
                          setIsEditingDetail(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#082C66] hover:bg-[#0062FF] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                        id="btn-edit-contact"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
