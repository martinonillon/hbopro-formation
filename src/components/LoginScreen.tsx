import React, { useState } from 'react';
import { 
  Lock, 
  LogIn, 
  AlertCircle, 
  KeyRound, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  UserPlus, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Briefcase, 
  Send,
  ShieldCheck,
  Check,
  ArrowRight
} from 'lucide-react';
import { AppUser, RegistrationRequest, validatePassword, DEFAULT_PROVISIONAL_PASSWORD } from '../types';
import { DEFAULT_ADMIN_USER } from '../data/usersData';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
  onRequestRegistration?: (request: Omit<RegistrationRequest, 'id' | 'createdAt' | 'status'>) => void;
  onResetPassword?: (userId: string, newPassword: string) => void;
  onLogEvent?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function LoginScreen({ 
  users, 
  onLogin, 
  onRequestRegistration,
  onResetPassword,
  onLogEvent
}: LoginScreenProps) {
  // Login Form State
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isFirstLoginOpen, setIsFirstLoginOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);

  // First Login Form State
  const [regLastName, setRegLastName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [regError, setRegError] = useState('');

  // Forgot Password Form State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [generatedResetLink, setGeneratedResetLink] = useState('');

  // Reset Password Form State (Setting new password with 12-char rule)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  const passwordRules = validatePassword(newPassword);

  // Submit Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanIdentifier = identifierInput.trim();
    const cleanPassword = passwordInput;

    if (!cleanIdentifier) {
      setErrorMsg('Veuillez saisir votre identifiant (adresse e-mail).');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }

    const effectiveUsers = users.length > 0 ? users : [DEFAULT_ADMIN_USER];
    
    // Find user by email or username (case-insensitive)
    const foundUser = effectiveUsers.find(u => 
      (u.email && u.email.toLowerCase() === cleanIdentifier.toLowerCase()) ||
      u.username.toLowerCase() === cleanIdentifier.toLowerCase()
    );

    if (!foundUser) {
      setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre identifiant et mot de passe ou cliquer sur "mot de passe oublié ?".');
      return;
    }

    // Expected password is the user's defined password or the default provisional 'Hubstation2026!'
    const expectedPassword = foundUser.password || DEFAULT_PROVISIONAL_PASSWORD;

    if (cleanPassword !== expectedPassword) {
      setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre identifiant et mot de passe ou cliquer sur "mot de passe oublié ?".');
      return;
    }

    // Login successful
    onLogin(foundUser);
  };

  // Handle First Login registration request
  const handleFirstLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanNom = regLastName.trim().toUpperCase();
    const cleanPrenom = regFirstName.trim();
    const cleanPoste = regRole.trim();
    const cleanMail = regEmail.trim().toLowerCase();

    if (!cleanNom || !cleanPrenom || !cleanPoste || !cleanMail) {
      setRegError('Tous les champs sont obligatoires.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanMail)) {
      setRegError('Veuillez renseigner une adresse e-mail valide.');
      return;
    }

    if (onRequestRegistration) {
      onRequestRegistration({
        lastName: cleanNom,
        firstName: cleanPrenom,
        role: cleanPoste,
        email: cleanMail
      });
    }

    if (onLogEvent) {
      onLogEvent(`Nouvelle demande d'inscription reçue de ${cleanPrenom} ${cleanNom} (${cleanMail}) pour le poste ${cleanPoste}. Notification transmise à martin@hubjob.fr.`, 'info');
    }

    setRegSubmitted(true);
  };

  // Handle Forgot Password link request
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const cleanMail = forgotEmail.trim().toLowerCase();
    if (!cleanMail) {
      setForgotError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    const effectiveUsers = users.length > 0 ? users : [DEFAULT_ADMIN_USER];
    const targetUser = effectiveUsers.find(u => u.email && u.email.toLowerCase() === cleanMail);

    // Create realistic reset link
    const resetToken = 'rst-' + Math.random().toString(36).substr(2, 12) + '-' + Date.now().toString(36);
    const linkUrl = `${window.location.origin}/?reset_token=${resetToken}&email=${encodeURIComponent(cleanMail)}`;
    setGeneratedResetLink(linkUrl);

    if (targetUser) {
      setResetTargetUser(targetUser);
      if (onLogEvent) {
        onLogEvent(`E-mail de réinitialisation de mot de passe généré et envoyé à ${cleanMail} (Utilisateur: ${targetUser.firstName} ${targetUser.lastName})`, 'info');
      }
    } else {
      setResetTargetUser(null);
      if (onLogEvent) {
        onLogEvent(`Demande de réinitialisation pour l'adresse ${cleanMail} reçue.`, 'info');
      }
    }

    setForgotSubmitted(true);
  };

  // Handle setting a new password that strictly obeys the 12-char rules
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError('');

    if (!passwordRules.isValid) {
      setResetPasswordError('Le mot de passe ne respecte pas l\'ensemble des critères de sécurité requis (12 caractères min, majuscule, minuscule, chiffre et caractère spécial).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetPasswordError('La confirmation du mot de passe ne correspond pas au nouveau mot de passe.');
      return;
    }

    if (resetTargetUser && onResetPassword) {
      onResetPassword(resetTargetUser.id, newPassword);
      if (onLogEvent) {
        onLogEvent(`Mot de passe réinitialisé avec succès pour ${resetTargetUser.firstName} ${resetTargetUser.lastName} (${resetTargetUser.username}).`, 'success');
      }
    }

    setIsResetModalOpen(false);
    setIsForgotPasswordOpen(false);
    setSuccessMsg('Votre mot de passe a été mis à jour avec succès ! Vous pouvez maintenant vous connecter.');
    setPasswordInput(newPassword);
    if (resetTargetUser) {
      setIdentifierInput(resetTargetUser.email || resetTargetUser.username);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-fade-in" id="login-card-container">
        
        {/* Header Branding */}
        <div className="bg-[#082C66] p-7 text-center text-white relative">
          <div className="mx-auto w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20 backdrop-blur-xs shadow-inner">
            {/* Padlock with color #35ffd0 */}
            <Lock className="w-7 h-7 text-[#35ffd0]" />
          </div>
          <span className="text-[10px] font-extrabold tracking-widest uppercase bg-[#0062FF]/40 text-blue-200 px-3.5 py-1 rounded-full border border-blue-400/30 shadow-xs inline-block">
            HubStation
          </span>
          <h1 className="text-xl font-black mt-2.5 text-white tracking-tight">Authentification sécurisée</h1>
          <p className="text-xs text-blue-200/90 mt-1 font-medium leading-relaxed px-2">
            Saisissez votre identifiant et votre mot de passe pour accéder à l'application
          </p>
        </div>

        {/* White Form Area */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Logo /logo.png centered at the very top of the white form zone */}
          <div className="flex justify-center pt-1 pb-2">
            <img 
              src="/logo.png" 
              alt="HubStation Logo" 
              className="h-10 w-auto max-w-[200px] object-contain"
              referrerPolicy="no-referrer"
              id="login-brand-logo"
            />
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Succès</p>
                <p className="mt-0.5 leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erreur d'accès</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Field: Identifier (Email) */}
            <div className="space-y-1.5">
              <label htmlFor="login-username-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                IDENTIFIANT
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  value={identifierInput}
                  onChange={(e) => {
                    setIdentifierInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="ex: prénom@hubjob.fr"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-[#0062FF]/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-[#0062FF]/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-[#0062FF]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                id="login-submit-button"
              >
                <LogIn className="w-4 h-4" />
                Se connecter à l'application
              </button>
            </div>

            {/* Links: Mot de passe oublié ? & Première connexion */}
            <div className="flex items-center justify-between pt-3 text-xs font-semibold border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail('');
                  setForgotError('');
                  setForgotSubmitted(false);
                  setIsForgotPasswordOpen(true);
                }}
                className="text-[#0062FF] hover:text-blue-800 hover:underline transition-all cursor-pointer inline-flex items-center gap-1"
                id="link-forgot-password"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mot de passe oublié ?
              </button>

              <button
                type="button"
                onClick={() => {
                  setRegLastName('');
                  setRegFirstName('');
                  setRegRole('');
                  setRegEmail('');
                  setRegError('');
                  setRegSubmitted(false);
                  setIsFirstLoginOpen(true);
                }}
                className="text-slate-600 hover:text-[#0062FF] hover:underline transition-all cursor-pointer inline-flex items-center gap-1 font-bold"
                id="link-first-connection"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#0062FF]" />
                Première connexion
              </button>
            </div>

          </form>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-xs font-medium text-slate-500" id="login-card-footer">
          ©2026 Hubjob
        </div>

      </div>

      {/* Modal 1: Première connexion */}
      {isFirstLoginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-first-connection">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            
            <div className="bg-[#082C66] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#35ffd0]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Demande de première connexion</h3>
                  <p className="text-xs text-blue-200 font-normal">Formulaire d'inscription pour nouvel utilisateur</p>
                </div>
              </div>
              <button
                onClick={() => setIsFirstLoginOpen(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {regSubmitted ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Demande transmise avec succès !</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
                      Un e-mail de notification a été adressé à votre administrateur. Quand votre compte sera validé, vous recevrez un lien pour configurer votre mot de passe à l'adresse <strong>{regEmail}</strong>.
                    </p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setIsFirstLoginOpen(false)}
                      className="px-6 py-2.5 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Retour à la connexion
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFirstLoginSubmit} className="space-y-4">
                  
                  {regError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nom <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="DUPONT"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-[#0062FF] outline-none"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Prénom <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="Alexandre"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Poste / Fonction <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        placeholder="Ex: Coordinateur d'exploitation, Formateur..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Adresse e-mail <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="prenom.nom@hubjob.fr"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                    ℹ️ Dès validation par l'administrateur, un e-mail automatique contenant le lien de configuration de votre mot de passe vous sera envoyé.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsFirstLoginOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      id="btn-submit-first-connection"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer la demande
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal 2: Mot de passe oublié */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-forgot-password">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            
            <div className="bg-[#082C66] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#35ffd0]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Réinitialisation du mot de passe</h3>
                  <p className="text-xs text-blue-200 font-normal">Saisissez votre adresse e-mail pour recevoir le lien sécurisé</p>
                </div>
              </div>
              <button
                onClick={() => setIsForgotPasswordOpen(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {forgotSubmitted ? (
                <div className="space-y-4 text-center py-3">
                  <div className="w-14 h-14 bg-blue-50 text-[#0062FF] rounded-full flex items-center justify-center mx-auto border border-blue-200">
                    <Mail className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">E-mail de réinitialisation envoyé !</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
                      Un lien sécurisé de réinitialisation de mot de passe a été envoyé à <strong>{forgotEmail}</strong>. Veuillez vérifier votre boîte de réception.
                    </p>
                  </div>

                  {/* Direct Test Option to define the new password immediately */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Lien direct de réinitialisation (Simulation active) :
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPassword('');
                        setConfirmPassword('');
                        setResetPasswordError('');
                        setIsResetModalOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      id="btn-open-reset-screen"
                    >
                      <span>Ouvrir la page de réinitialisation de mot de passe</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  
                  {forgotError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Adresse e-mail associée à votre compte <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Ex: martin@hubjob.fr"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Un e-mail automatique contenant un lien sécurisé permettant de réinitialiser votre mot de passe (respectant la règle des 12 caractères) vous sera immédiatement envoyé.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      id="btn-send-reset-link"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer le lien de réinitialisation
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal 3: Définition du nouveau mot de passe avec validation de complexité (12 caractères) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="modal-set-new-password">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            
            <div className="bg-[#082C66] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#35ffd0]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Nouveau mot de passe</h3>
                  <p className="text-xs text-blue-200 font-normal">
                    {resetTargetUser ? `Compte : ${resetTargetUser.firstName} ${resetTargetUser.lastName}` : 'Définition du mot de passe'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="p-6 overflow-y-auto space-y-4">
              
              {resetPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetPasswordError}</span>
                </div>
              )}

              {/* Nouveau mot de passe */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nouveau mot de passe <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (resetPasswordError) setResetPasswordError('');
                    }}
                    placeholder="Au moins 12 caractères..."
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] outline-none font-mono tracking-wider"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirmer le mot de passe <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (resetPasswordError) setResetPasswordError('');
                    }}
                    placeholder="Confirmez à l'identique..."
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] outline-none font-mono tracking-wider"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Complexity Checklist Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-slate-700">Règles de sécurité requises (12 caractères min) :</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  
                  <div className={`flex items-center gap-1.5 font-medium ${passwordRules.hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordRules.hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {passwordRules.hasMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
                    </div>
                    <span>Minimum 12 caractères ({newPassword.length}/12)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordRules.hasUppercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordRules.hasUppercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {passwordRules.hasUppercase ? <Check className="w-2.5 h-2.5" /> : '•'}
                    </div>
                    <span>Au moins 1 majuscule (A-Z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordRules.hasLowercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordRules.hasLowercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {passwordRules.hasLowercase ? <Check className="w-2.5 h-2.5" /> : '•'}
                    </div>
                    <span>Au moins 1 minuscule (a-z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordRules.hasNumber ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordRules.hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {passwordRules.hasNumber ? <Check className="w-2.5 h-2.5" /> : '•'}
                    </div>
                    <span>Au moins 1 chiffre (0-9)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium sm:col-span-2 ${passwordRules.hasSpecialChar ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordRules.hasSpecialChar ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {passwordRules.hasSpecialChar ? <Check className="w-2.5 h-2.5" /> : '•'}
                    </div>
                    <span>Au moins 1 caractère spécial (!@#$%^&*...)</span>
                  </div>

                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!passwordRules.isValid || newPassword !== confirmPassword}
                  className="px-5 py-2.5 bg-[#0062FF] hover:bg-[#0062FF]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  id="btn-confirm-save-password"
                >
                  <Check className="w-3.5 h-3.5" />
                  Valider le mot de passe
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
