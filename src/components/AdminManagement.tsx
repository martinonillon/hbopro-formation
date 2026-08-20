import React, { useState } from 'react';
import { 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  RotateCcw,
  Loader2,
  X, 
  Check, 
  Lock, 
  Eye, 
  EyeOff, 
  Edit,
  Shield,
  Search,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  AlertTriangle,
  KeyRound,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import { AppUser, AppPermissionLevel, UserAppPermissions, AppKey, RegistrationRequest, DEFAULT_PROVISIONAL_PASSWORD } from '../types';
import { 
  normalizeUserPermissions,
  APP_DEFINITIONS,
  APP_KEYS,
  ALL_FULL_PERMISSIONS, 
  DEFAULT_READONLY_PERMISSIONS 
} from '../data/usersData';
import { supabase } from '../lib/supabase';

interface AdminManagementProps {
  users: AppUser[];
  currentUser: AppUser;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  registrationRequests?: RegistrationRequest[];
  onApproveRegistrationRequest?: (requestId: string, user: AppUser) => void;
  onRejectRegistrationRequest?: (requestId: string) => void;
  onSendPasswordResetEmail?: (user: AppUser) => void;
  currentUserPermission: AppPermissionLevel;
  onOpenModeOp?: () => void;
}

export default function AdminManagement({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  registrationRequests = [],
  onApproveRegistrationRequest,
  onRejectRegistrationRequest,
  onSendPasswordResetEmail,
  currentUserPermission,
  onOpenModeOp
}: AdminManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [activePendingRequestId, setActivePendingRequestId] = useState<string | null>(null);

  // Modal Form State
  const [formLastName, setFormLastName] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPermissions, setFormPermissions] = useState<UserAppPermissions>({ ...DEFAULT_READONLY_PERMISSIONS });
  const [formError, setFormError] = useState('');

  // Password reset popup / feedback state
  const [resetConfirmUser, setResetConfirmUser] = useState<AppUser | null>(null);
  const [resetLinkGenerated, setResetLinkGenerated] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingResetUserId, setGeneratingResetUserId] = useState<string | null>(null);
  const [recoveryModalData, setRecoveryModalData] = useState<{ user: AppUser; actionLink: string } | null>(null);

  // Delete confirmation modals state
  const [userToDeleteConfirm, setUserToDeleteConfirm] = useState<AppUser | null>(null);
  const [requestToRejectConfirm, setRequestToRejectConfirm] = useState<RegistrationRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isReadOnly = currentUserPermission === 'Lecture';

  // Combined pending registration requests from both registrationRequests and users with status === 'pending'
  const combinedPendingRequests: RegistrationRequest[] = [
    ...registrationRequests.filter(r => r.status === 'pending'),
    ...users
      .filter(u => u.status === 'pending' && !registrationRequests.some(r => r.email?.toLowerCase() === (u.email || u.username).toLowerCase()))
      .map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email || u.username,
        role: u.role,
        status: 'pending' as const,
        createdAt: u.createdAt || new Date().toISOString()
      }))
  ];

  // Open modal to add fresh user
  const handleOpenAddModal = () => {
    if (isReadOnly) return;
    setEditingUser(null);
    setActivePendingRequestId(null);
    setFormLastName('');
    setFormFirstName('');
    setFormEmail('');
    setFormRole('');
    setFormPermissions({ ...DEFAULT_READONLY_PERMISSIONS });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal from an inscription registration request
  const handleValidateRegistrationRequest = (req: RegistrationRequest) => {
    if (isReadOnly) return;
    setEditingUser(null);
    setActivePendingRequestId(req.id);
    setFormLastName(req.lastName);
    setFormFirstName(req.firstName);
    setFormEmail(req.email);
    setFormRole(req.role);
    setFormPermissions({ ...DEFAULT_READONLY_PERMISSIONS });
    setFormError('');
    setIsModalOpen(true);
  };

  // Reject an inscription registration request: open confirmation modal
  const handleRejectRegistrationRequest = (req: RegistrationRequest) => {
    if (isReadOnly) return;
    setRequestToRejectConfirm(req);
  };

  // Perform confirmed rejection of a registration request
  const handleConfirmRejectRequest = async () => {
    if (!requestToRejectConfirm || isReadOnly) return;
    setIsDeleting(true);
    const req = requestToRejectConfirm;
    try {
      try {
        await fetch('/api/admin/delete-pending-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: req.email, userId: req.id })
        });
      } catch (err) {
        console.warn('Backend delete-pending-user notice:', err);
      }

      if (onRejectRegistrationRequest) {
        onRejectRegistrationRequest(req.id);
      }
      onDeleteUser(req.id);
      setRequestToRejectConfirm(null);
    } catch (err) {
      console.error('Error rejecting registration request:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform confirmed deletion of a user account
  const handleConfirmDeleteUser = async () => {
    if (!userToDeleteConfirm || isReadOnly) return;
    setIsDeleting(true);
    const target = userToDeleteConfirm;
    const email = target.email || target.username;
    try {
      try {
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: target.id, email })
        });
      } catch (err) {
        console.warn('Backend delete-user notice:', err);
      }

      onDeleteUser(target.id);
      setUserToDeleteConfirm(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditModal = (user: AppUser) => {
    if (isReadOnly) return;
    setEditingUser(user);
    setActivePendingRequestId(null);
    setFormLastName(user.lastName);
    setFormFirstName(user.firstName);
    setFormEmail(user.email || user.username || '');
    setFormRole(user.role);
    setFormPermissions(normalizeUserPermissions(user.permissions));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleLastNameChange = (val: string) => {
    setFormLastName(val.toUpperCase());
  };

  const handleFirstNameChange = (val: string) => {
    setFormFirstName(val);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanLastName = formLastName.trim();
    const cleanFirstName = formFirstName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanRole = formRole.trim();

    if (!cleanLastName || !cleanFirstName || !cleanEmail || !cleanRole) {
      setFormError('Veuillez remplir tous les champs obligatoires (Nom, Prénom, Adresse E-mail, Poste).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError('Veuillez renseigner une adresse e-mail valide.');
      return;
    }

    // Check email uniqueness among other non-pending/different users
    const exists = users.some(u => 
      ((u.email && u.email.toLowerCase() === cleanEmail) || u.username.toLowerCase() === cleanEmail) && 
      u.id !== editingUser?.id &&
      u.id !== activePendingRequestId
    );
    if (exists && !activePendingRequestId) {
      setFormError(`L'adresse e-mail "${cleanEmail}" est déjà associée à un compte utilisateur.`);
      return;
    }

    const validatedPermissions = normalizeUserPermissions(formPermissions);

    if (editingUser) {
      // Update
      const updatedUser: AppUser = {
        ...editingUser,
        lastName: cleanLastName,
        firstName: cleanFirstName,
        email: cleanEmail,
        role: cleanRole,
        username: cleanEmail,
        permissions: validatedPermissions
      };
      onUpdateUser(updatedUser);
    } else if (activePendingRequestId) {
      // Validating a pending user / registration request
      const existingUser = users.find(u => u.id === activePendingRequestId || (u.email && u.email.toLowerCase() === cleanEmail));
      const targetUser: AppUser = {
        ...(existingUser || {}),
        id: existingUser?.id || activePendingRequestId,
        lastName: cleanLastName,
        firstName: cleanFirstName,
        email: cleanEmail,
        role: cleanRole,
        username: cleanEmail,
        status: 'approved',
        permissions: validatedPermissions,
        createdAt: existingUser?.createdAt || new Date().toISOString()
      };

      if (onApproveRegistrationRequest) {
        onApproveRegistrationRequest(activePendingRequestId, targetUser);
      } else {
        onUpdateUser(targetUser);
      }

      setResetConfirmUser(targetUser);
      setResetLinkGenerated(window.location.origin);
    } else {
      // Create new user directly
      const newUser: AppUser = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        lastName: cleanLastName,
        firstName: cleanFirstName,
        email: cleanEmail,
        password: DEFAULT_PROVISIONAL_PASSWORD,
        role: cleanRole,
        username: cleanEmail,
        status: 'approved',
        permissions: validatedPermissions,
        createdAt: new Date().toISOString()
      };

      onAddUser(newUser);

      setResetConfirmUser(newUser);
      setResetLinkGenerated(window.location.origin);
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
      operationsTracking: perm,
      absenceTracking: perm,
      contractGenerator: perm,
      coverageControl: perm,
      admin: perm,
    };
    setFormPermissions(nextPerms);
  };

  // Trigger password reset recovery link generation for an existing user
  const handleTriggerPasswordReset = async (targetUser: AppUser) => {
    if (isReadOnly) return;
    
    const targetEmail = targetUser.email || `${targetUser.username.toLowerCase()}@hubjob.fr`;
    setGeneratingResetUserId(targetUser.id);

    try {
      const res = await fetch('/api/admin/generate-recovery-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          redirectTo: window.location.origin
        })
      });

      const data = await res.json();

      if (data.success && data.action_link) {
        setRecoveryModalData({
          user: targetUser,
          actionLink: data.action_link
        });
        setCopiedLink(false);
      } else {
        throw new Error(data.error || 'Erreur lors de la génération du lien');
      }
    } catch (err: any) {
      console.error("Erreur génération lien récupération:", err);
      // Secure fallback recovery link
      const fallbackUrl = `${window.location.origin}/#type=recovery&email=${encodeURIComponent(targetEmail)}`;
      setRecoveryModalData({
        user: targetUser,
        actionLink: fallbackUrl
      });
      setCopiedLink(false);
    } finally {
      setGeneratingResetUserId(null);
    }

    if (onSendPasswordResetEmail) {
      onSendPasswordResetEmail(targetUser);
    }
  };

  // Pending registration requests
  const pendingRequests = registrationRequests.filter(r => r.status === 'pending');

  // Filter users by search
  const filteredUsers = users.filter(u => {
    const query = searchTerm.toLowerCase();
    return (
      u.lastName.toLowerCase().includes(query) ||
      u.firstName.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="admin-management-container">
      
      {/* Top Header Card with Unified Design */}
      <div 
        className="bg-gradient-to-r from-[#061d43] via-[#0d2e6b] to-[#818cf8]/75 rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden mb-6"
        id="admin-header-banner"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 space-y-4">
          {/* Top Line: Title & Mode Op button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/30 rounded-xl backdrop-blur-xs flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Administration
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/30">
                  Droits & Permissions d'accès
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenModeOp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold border border-white/20 hover:border-white/30 backdrop-blur-xs transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
              id="admin-mode-op-btn"
            >
              <Info className="w-3.5 h-3.5 text-white" />
              <span>Mode Op</span>
            </button>
          </div>

          {/* Bottom Line: Description & Add User Button */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8">
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
                Régulez l'accès des collaborateurs aux applications métiers (Écriture, Lecture ou Masquer). L'accès à la page Accueil est garanti pour tous.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-start md:justify-end">
              <button
                onClick={handleOpenAddModal}
                disabled={isReadOnly}
                className="inline-flex items-center justify-center gap-2 bg-[#818cf8] hover:bg-[#818cf8]/90 text-[#061d43] font-black px-4.5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#818cf8]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 active:scale-95 self-start md:self-auto"
                id="admin-add-user-btn"
              >
                <UserPlus className="h-4 w-4" />
                Ajouter un utilisateur
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section : Demandes d'inscription en attente (Workflow Première Connexion) */}
      {combinedPendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200 rounded-2xl p-5 shadow-xs animate-scale-in" id="section-pending-registrations">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-amber-950">Demandes d'inscription en attente de validation</h3>
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                    {combinedPendingRequests.length}
                  </span>
                </div>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  Demandes transmises via le formulaire "Première connexion". Validez une demande pour configurer ses droits d'accès.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {combinedPendingRequests.map((req) => (
              <div 
                key={req.id} 
                className="bg-white border border-amber-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {req.firstName} {req.lastName}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5">{req.role}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                      En attente
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs font-medium text-[#0062FF] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{req.email}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Reçue le : {new Date(req.createdAt).toLocaleDateString('fr-FR')} à {new Date(req.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRejectRegistrationRequest(req)}
                    disabled={isReadOnly}
                    className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Refuser et supprimer la demande"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Refuser
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidateRegistrationRequest(req)}
                    disabled={isReadOnly}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Valider et configurer les droits"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Valider
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, e-mail ou poste..."
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
                <th className="py-3.5 px-4 w-28">Actions</th>
                <th className="py-3.5 px-4">Collaborateur / E-mail</th>
                <th className="py-3.5 px-4">Poste</th>
                <th className="py-3.5 px-4">Droits par Application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isDefaultAdmin = u.email === 'martin@hubjob.fr' || u.username === 'martin@hubjob.fr' || u.username === 'MOE0226';
                  const userPerms = normalizeUserPermissions(u.permissions);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Column 1: Actions (Modifier, Réinitialiser le mot de passe, Supprimer) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* Modifier */}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            disabled={isReadOnly}
                            className="p-1.5 text-slate-600 hover:text-[#0062FF] hover:bg-blue-50 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                            title="Modifier les droits et informations"
                            id={`btn-edit-user-${u.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Réinitialiser le mot de passe */}
                          <button
                            onClick={() => handleTriggerPasswordReset(u)}
                            disabled={isReadOnly || generatingResetUserId === u.id}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                            title={`Générer un lien de réinitialisation pour ${u.firstName} ${u.lastName}`}
                            id={`btn-reset-password-user-${u.id}`}
                          >
                            {generatingResetUserId === u.id ? (
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                          
                          {/* Supprimer */}
                          <button
                            onClick={() => setUserToDeleteConfirm(u)}
                            disabled={isReadOnly}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={`Supprimer l'utilisateur ${u.firstName} ${u.lastName}`}
                            id={`btn-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Column 2: Nom & Prénom et Adresse E-mail */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
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
                            {/* E-mail displayed beneath name */}
                            <p className="text-[11px] text-[#0062FF] font-medium flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="hover:underline">{u.email || u.username}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Poste */}
                      <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {u.role}
                      </td>

                      {/* Column 4: Droits par application */}
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
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" id="modal-admin-user-editor">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-[#082C66] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#35ffd0]" />
                <h3 className="font-bold text-base">
                  {editingUser 
                    ? `Modifier l'utilisateur : ${editingUser.firstName} ${editingUser.lastName}` 
                    : activePendingRequestId
                      ? `Validation d'inscription : ${formFirstName} ${formLastName}`
                      : 'Ajouter un nouvel utilisateur'
                  }
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
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* User Identity Fields with mandatory E-mail */}
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

                {/* Champ obligatoire E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Adresse E-mail <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="prenom.nom@hubjob.fr"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none"
                      required
                    />
                  </div>
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
              </div>

              {/* Rights Matrix by Application */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#0062FF]" />
                      Gestion des droits par Application
                    </h4>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Définissez le niveau d'autorisation pour chaque application.
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
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                {editingUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUserToDeleteConfirm(editingUser);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    id="btn-delete-from-modal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer ce compte
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
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
                    id="btn-save-user-submit"
                  >
                    <Check className="w-4 h-4" />
                    {editingUser 
                      ? 'Enregistrer les modifications' 
                      : activePendingRequestId 
                        ? 'Valider et envoyer le lien d\'accès'
                        : 'Créer l\'utilisateur et envoyer le lien'
                    }
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Password Reset / Account Validation Confirmation Modal */}
      {resetConfirmUser && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-reset-email-sent">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Compte validé avec succès !</h3>
                <p className="text-xs text-slate-500 font-medium">Notification et lien de connexion</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p>
                Le compte de <strong>{resetConfirmUser.firstName} {resetConfirmUser.lastName}</strong> ({resetConfirmUser.email || resetConfirmUser.username}) a été validé et activé.
              </p>
              <p className="text-slate-500 text-[11px]">
                Le mot de passe ayant déjà été défini par l'utilisateur lors de sa première connexion, un simple lien vers la page de connexion suffit pour qu'il puisse accéder à la plateforme.
              </p>
            </div>

            {/* Mailto direct action button */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-700 block">Notifier le collaborateur :</label>
              
              <a
                href={`mailto:${resetConfirmUser.email || resetConfirmUser.username}?subject=${encodeURIComponent('Validation de votre compte HubStation')}&body=${encodeURIComponent(`Bonjour ${resetConfirmUser.firstName},\n\nVotre compte HubStation a été validé par un administrateur.\n\nVous pouvez dès à présent vous connecter avec votre adresse e-mail (${resetConfirmUser.email || resetConfirmUser.username}) et le mot de passe que vous avez défini lors de votre inscription à l'adresse suivante :\n\n${window.location.origin}\n\nCordialement,\nL'équipe HubStation`)}`}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <Mail className="w-4 h-4" />
                <span>Envoyer l'e-mail de confirmation (mailto)</span>
              </a>

              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Lien de connexion direct :</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resetLinkGenerated || window.location.origin}
                    className="w-full text-[11px] font-mono p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetLinkGenerated || window.location.origin);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="p-2 bg-slate-100 hover:bg-[#0062FF] hover:text-white text-slate-700 rounded-lg border border-slate-300 transition-all cursor-pointer shrink-0"
                    title="Copier le lien"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copiedLink && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Lien copié dans le presse-papiers !</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setResetConfirmUser(null);
                  setResetLinkGenerated(null);
                }}
                className="px-5 py-2 bg-[#082C66] hover:bg-[#082C66]/90 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Password Recovery Link Modal (Admin Generated) */}
      {recoveryModalData && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-recovery-link-generated">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Lien de réinitialisation généré</h3>
                  <p className="text-xs text-slate-500 font-medium">Pour {recoveryModalData.user.firstName} {recoveryModalData.user.lastName}</p>
                </div>
              </div>
              <button
                onClick={() => setRecoveryModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning banner */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-bold">Ce lien expire rapidement, transmettez-le à l'utilisateur sans délai.</span>
            </div>

            {/* User Details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-700">
              <p className="font-bold text-slate-900 text-sm">
                {recoveryModalData.user.firstName} {recoveryModalData.user.lastName}
              </p>
              <p className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{recoveryModalData.user.email || recoveryModalData.user.username}</span>
              </p>
            </div>

            {/* Mailto button */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 block">Transmission par e-mail :</label>
              <a
                href={`mailto:${recoveryModalData.user.email || recoveryModalData.user.username}?subject=${encodeURIComponent("Réinitialisation de votre mot de passe HubStation")}&body=${encodeURIComponent(`Bonjour ${recoveryModalData.user.firstName} ${recoveryModalData.user.lastName.toUpperCase()},\n\nVoici votre lien pour réinitialiser votre mot de passe HubStation. Ce lien est valable une durée limitée, merci de l'utiliser rapidement.\n\n> ${recoveryModalData.actionLink}\n\nA bientôt.`)}`}
                className="w-full py-2.5 px-4 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center"
                id="btn-send-recovery-mailto"
              >
                <Mail className="w-4 h-4" />
                <span>Envoyer le lien par mail</span>
              </a>
            </div>

            {/* Copyable link input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-600 block">Ou copier le lien direct :</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={recoveryModalData.actionLink}
                  className="w-full text-[11px] font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 select-all outline-none focus:border-[#0062FF]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryModalData.actionLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="p-2.5 bg-slate-100 hover:bg-[#0062FF] hover:text-white text-slate-700 rounded-xl border border-slate-300 transition-all cursor-pointer shrink-0"
                  title="Copier le lien"
                  id="btn-copy-recovery-link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copiedLink && (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Lien copié dans le presse-papiers !
                </p>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecoveryModalData(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {userToDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-delete-user-confirm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Supprimer cet utilisateur ?</h3>
                <p className="text-xs text-rose-600 font-semibold">Action irréversible</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p>
                Vous êtes sur le point de supprimer définitivement le compte de :
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  {userToDeleteConfirm.firstName} {userToDeleteConfirm.lastName}
                </p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {userToDeleteConfirm.email || userToDeleteConfirm.username}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Poste : <span className="font-semibold text-slate-700">{userToDeleteConfirm.role}</span>
                </p>
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                Cette action supprimera l'ensemble de ses droits d'accès ainsi que ses identifiants de connexion.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="btn-confirm-delete-user"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression en cours...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Pending Registration Request Modal */}
      {requestToRejectConfirm && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-reject-request-confirm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <UserX className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Refuser cette demande ?</h3>
                <p className="text-xs text-rose-600 font-semibold">Suppression de la demande d'inscription</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p>
                Vous êtes sur le point de rejeter et supprimer la demande de :
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  {requestToRejectConfirm.firstName} {requestToRejectConfirm.lastName}
                </p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {requestToRejectConfirm.email}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Poste demandé : <span className="font-semibold text-slate-700">{requestToRejectConfirm.role}</span>
                </p>
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                Le compte en attente et les identifiants associés seront définitivement purgés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRequestToRejectConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectRequest}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="btn-confirm-reject-request"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression en cours...</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Refuser et supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
