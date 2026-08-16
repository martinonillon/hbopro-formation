import React, { useState } from 'react';
import { 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  X, 
  Check, 
  Lock, 
  Eye, 
  EyeOff, 
  Edit,
  Shield,
  Search,
  Users,
  Home,
  CheckCircle2
} from 'lucide-react';
import { AppUser, AppPermissionLevel, UserAppPermissions, AppKey } from '../types';
import { 
  generateRandomUserId, 
  getUserInitials,
  normalizeUserPermissions,
  APP_DEFINITIONS,
  APP_KEYS,
  ALL_FULL_PERMISSIONS, 
  DEFAULT_READONLY_PERMISSIONS 
} from '../data/usersData';

interface AdminManagementProps {
  users: AppUser[];
  currentUser: AppUser;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  currentUserPermission: AppPermissionLevel;
}

export default function AdminManagement({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUserPermission
}: AdminManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Modal Form State
  const [formLastName, setFormLastName] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [randomSuffix, setRandomSuffix] = useState('1234');
  const [formPermissions, setFormPermissions] = useState<UserAppPermissions>({ ...DEFAULT_READONLY_PERMISSIONS });
  const [formError, setFormError] = useState('');

  const isReadOnly = currentUserPermission === 'Lecture';

  const generate4Digits = () => Math.floor(1000 + Math.random() * 9000).toString();

  const handleOpenAddModal = () => {
    if (isReadOnly) return;
    setEditingUser(null);
    setFormLastName('');
    setFormFirstName('');
    setFormRole('');
    const newDigits = generate4Digits();
    setRandomSuffix(newDigits);
    const initials = getUserInitials('', '');
    setFormUsername(`${initials}${newDigits}`);
    setFormPermissions({ ...DEFAULT_READONLY_PERMISSIONS });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AppUser) => {
    if (isReadOnly) return;
    setEditingUser(user);
    setFormLastName(user.lastName);
    setFormFirstName(user.firstName);
    setFormRole(user.role);
    setFormUsername(user.username);
    const digitsMatch = user.username.match(/\d{4}$/);
    if (digitsMatch) {
      setRandomSuffix(digitsMatch[0]);
    } else {
      setRandomSuffix(generate4Digits());
    }
    setFormPermissions(normalizeUserPermissions(user.permissions));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleLastNameChange = (val: string) => {
    const upperVal = val.toUpperCase();
    setFormLastName(upperVal);
    if (editingUser?.username !== 'MOE0226') {
      const initials = getUserInitials(formFirstName, upperVal);
      setFormUsername(`${initials}${randomSuffix}`);
    }
  };

  const handleFirstNameChange = (val: string) => {
    setFormFirstName(val);
    if (editingUser?.username !== 'MOE0226') {
      const initials = getUserInitials(val, formLastName);
      setFormUsername(`${initials}${randomSuffix}`);
    }
  };

  const handleRegenerateDigits = () => {
    if (editingUser?.username === 'MOE0226') return;
    const newDigits = generate4Digits();
    setRandomSuffix(newDigits);
    const initials = getUserInitials(formFirstName, formLastName);
    setFormUsername(`${initials}${newDigits}`);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanLastName = formLastName.trim();
    const cleanFirstName = formFirstName.trim();
    const cleanRole = formRole.trim();
    const cleanUsername = formUsername.trim().toUpperCase();

    if (!cleanLastName || !cleanFirstName || !cleanRole || !cleanUsername) {
      setFormError('Veuillez remplir tous les champs obligatoires (Nom, Prénom, Poste, Identifiant).');
      return;
    }

    // Check username uniqueness if adding new or changing username
    const exists = users.some(u => u.username.toUpperCase() === cleanUsername && u.id !== editingUser?.id);
    if (exists) {
      setFormError(`L'identifiant "${cleanUsername}" est déjà attribué à un autre utilisateur.`);
      return;
    }

    const validatedPermissions = normalizeUserPermissions(formPermissions);

    if (editingUser) {
      // Update
      const updatedUser: AppUser = {
        ...editingUser,
        lastName: cleanLastName,
        firstName: cleanFirstName,
        role: cleanRole,
        username: cleanUsername,
        permissions: validatedPermissions
      };
      onUpdateUser(updatedUser);
    } else {
      // Create new
      const newUser: AppUser = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        lastName: cleanLastName,
        firstName: cleanFirstName,
        role: cleanRole,
        username: cleanUsername,
        permissions: validatedPermissions,
        createdAt: new Date().toISOString()
      };
      onAddUser(newUser);
    }

    setIsModalOpen(false);
  };

  const handlePermissionChange = (appKey: AppKey, perm: AppPermissionLevel) => {
    setFormPermissions(prev => ({
      ...prev,
      [appKey]: perm
    }));
  };

  const handleSetAllPermissions = (perm: AppPermissionLevel) => {
    const nextPerms: UserAppPermissions = {
      formation: perm,
      rhGenerator: perm,
      absenceTracking: perm,
      contractGenerator: perm,
      coverageControl: perm,
      admin: perm,
    };
    setFormPermissions(nextPerms);
  };

  // Filter users by search
  const filteredUsers = users.filter(u => {
    const query = searchTerm.toLowerCase();
    return (
      u.lastName.toLowerCase().includes(query) ||
      u.firstName.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="admin-management-container">
      
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#082C66] text-white p-2.5 rounded-xl shadow-xs">
              <Shield className="h-6 w-6 text-[#ffde59]" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[#082C66] tracking-tight">Gestion des Droits d'Accès par Application</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Régulez l'accès des collaborateurs aux applications métiers (Écriture, Lecture ou Masquer). L'accès à la page Accueil est garanti pour tous.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          disabled={isReadOnly}
          className="inline-flex items-center justify-center gap-2 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[#0062FF]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start md:self-auto"
          id="admin-add-user-btn"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Info Banner on Universal Home Access */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex items-start sm:items-center gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-[#082C66] text-white flex items-center justify-center shrink-0 shadow-xs">
          <Home className="w-4 h-4 text-[#ffde59]" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-bold text-[#082C66]">Règle universelle de navigation</p>
          <p className="text-slate-600 font-normal leading-relaxed">
            La page <strong>Accueil</strong> est accessible à tous les utilisateurs par défaut. Si une application est définie sur <em>"Masquer"</em>, sa carte n'apparaît pas sur le portail d'accueil. Les droits <em>"Écriture"</em> ou <em>"Lecture"</em> sont automatiquement hérités par l'ensemble des sous-onglets rattachés.
          </p>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, poste ou identifiant..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Users className="h-4 w-4 text-[#0062FF]" />
          <span>Total utilisateurs : </span>
          <span className="bg-blue-50 text-[#0062FF] font-mono font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
            {users.length}
          </span>
        </div>
      </div>

      {/* Users Table with Application Permissions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-24">Actions</th>
                <th className="py-3.5 px-4">Nom & Prénom</th>
                <th className="py-3.5 px-4">Poste</th>
                <th className="py-3.5 px-4">Identifiant</th>
                <th className="py-3.5 px-4">Droits par Application (5 Apps)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isDefaultAdmin = u.username === 'MOE0226';
                  const userPerms = normalizeUserPermissions(u.permissions);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Column 1: Actions */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            disabled={isReadOnly}
                            className="p-1.5 text-slate-600 hover:text-[#0062FF] hover:bg-blue-50 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                            title="Modifier les droits et informations"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (isDefaultAdmin) {
                                alert("Le compte administrateur principal (MOE0226) ne peut pas être supprimé.");
                                return;
                              }
                              if (confirm(`Voulez-vous vraiment supprimer l'utilisateur ${u.firstName} ${u.lastName} (${u.username}) ?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            disabled={isReadOnly || isDefaultAdmin}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isDefaultAdmin ? "Compte Administrateur principal non supprimable" : "Supprimer cet utilisateur"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Column 2: Nom & Prénom */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isDefaultAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-[#0062FF] border border-blue-200'
                          }`}>
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                              {u.firstName} {u.lastName}
                              {isDefaultAdmin && (
                                <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                                  Admin Principal
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Poste */}
                      <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {u.role}
                      </td>

                      {/* Column 4: Identifiant */}
                      <td className="py-4 px-4 font-mono font-extrabold whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 tracking-wider">
                          {u.username}
                        </span>
                      </td>

                      {/* Column 5: Droits par application */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-2 max-w-4xl">
                          {APP_KEYS.map((appKey) => {
                            const appDef = APP_DEFINITIONS[appKey];
                            const perm = userPerms[appKey];
                            const AppIcon = appDef.icon;

                            if (perm === 'Écriture') {
                              return (
                                <span
                                  key={appKey}
                                  title={`${appDef.label} : Écriture (Accès complet à tous les onglets)`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs"
                                >
                                  <AppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-bold">{appDef.label}</span>
                                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded ml-0.5">
                                    Écriture
                                  </span>
                                </span>
                              );
                            } else if (perm === 'Lecture') {
                              return (
                                <span
                                  key={appKey}
                                  title={`${appDef.label} : Lecture seule (Consultation sur tous les onglets)`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                                >
                                  <AppIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="font-bold">{appDef.label}</span>
                                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded ml-0.5">
                                    Lecture
                                  </span>
                                </span>
                              );
                            } else {
                              return (
                                <span
                                  key={appKey}
                                  title={`${appDef.label} : Masqué (Application masquée sur l'accueil et inaccessible)`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 opacity-60"
                                >
                                  <AppIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="line-through text-slate-500">{appDef.label}</span>
                                  <span className="bg-slate-300 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded ml-0.5">
                                    Masquer
                                  </span>
                                </span>
                              );
                            }
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="bg-[#082C66] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#ffde59]" />
                <h3 className="font-bold text-base">
                  {editingUser ? `Modifier l'utilisateur : ${editingUser.firstName} ${editingUser.lastName}` : 'Ajouter un nouvel utilisateur'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* User Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nom <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-[#0062FF] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prénom <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Pierre"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Poste / Fonction <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="Ex: Responsable Formation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Identifiant <span className="text-rose-600">*</span>
                    </label>
                    {editingUser?.username !== 'MOE0226' && (
                      <button
                        type="button"
                        onClick={handleRegenerateDigits}
                        className="text-[10px] text-[#0062FF] font-bold hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 transition-all"
                        title="Régénérer uniquement les 4 chiffres aléatoires"
                      >
                        <RefreshCw className="w-3 h-3 text-[#0062FF]" /> Régénérer 4 chiffres
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toUpperCase())}
                      readOnly={editingUser?.username === 'MOE0226'}
                      placeholder="Ex: MOE4829"
                      className={`w-full px-3 py-2 pr-9 border rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider outline-none ${
                        editingUser?.username === 'MOE0226'
                          ? 'bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0062FF]'
                      }`}
                      required
                    />
                    {editingUser?.username !== 'MOE0226' && (
                      <button
                        type="button"
                        onClick={handleRegenerateDigits}
                        className="absolute right-2 text-slate-400 hover:text-[#0062FF] p-1 rounded-md transition-colors cursor-pointer"
                        title="Nouveaux chiffres aléatoires"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {editingUser?.username === 'MOE0226' ? (
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">L'identifiant du compte admin par défaut ne peut pas être modifié.</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      1ère lettre du Prénom + 1ère et dernière lettre du Nom + 4 chiffres. Modifiable manuellement.
                    </p>
                  )}
                </div>
              </div>

              {/* Rights Matrix by Application (5 Applications) */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#0062FF]" />
                      Gestion des droits par Application (6 Applications)
                    </h4>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Définissez le niveau d'autorisation pour chaque application. L'accès à la page <strong>Accueil</strong> reste universel.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions('Masquer')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Tout masquer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions('Lecture')}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Tout en Lecture
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions('Écriture')}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Tout en Écriture
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {APP_KEYS.map((appKey) => {
                    const appDef = APP_DEFINITIONS[appKey];
                    const currentVal = formPermissions[appKey] || 'Lecture';
                    const AppIcon = appDef.icon;

                    return (
                      <div 
                        key={appKey} 
                        className={`p-4 rounded-xl border transition-all ${
                          currentVal === 'Écriture' 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : currentVal === 'Lecture'
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          
                          {/* App Details */}
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
                              style={{ background: appDef.gradient }}
                            >
                              <AppIcon className="w-5 h-5 drop-shadow-xs" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-black text-slate-900">{appDef.label}</h5>
                                <span className="text-[10px] font-semibold text-slate-500">• {appDef.subLabel}</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-normal mt-0.5">
                                {appDef.description}
                              </p>
                              {appDef.includedTabs && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {appDef.includedTabs.map((t, idx) => (
                                    <span key={idx} className="bg-white/80 border border-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3-way toggle buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-auto bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                            
                            {/* Masquer */}
                            <button
                              type="button"
                              onClick={() => handlePermissionChange(appKey, 'Masquer')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentVal === 'Masquer'
                                  ? 'bg-slate-800 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              Masquer
                            </button>

                            {/* Lecture */}
                            <button
                              type="button"
                              onClick={() => handlePermissionChange(appKey, 'Lecture')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentVal === 'Lecture'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lecture
                            </button>

                            {/* Écriture */}
                            <button
                              type="button"
                              onClick={() => handlePermissionChange(appKey, 'Écriture')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentVal === 'Écriture'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                              }`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Écriture
                            </button>

                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingUser ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
