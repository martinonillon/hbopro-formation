import React from 'react';
import { 
  Home, 
  TrendingUp, 
  Clock, 
  GraduationCap, 
  FolderGit2, 
  FileText, 
  ShieldCheck, 
  Shield,
  Users,
  UserCheck
} from 'lucide-react';
import { UserAppPermissions } from '../types';

export type AppNavId = 
  | 'home' 
  | 'operationsTracking' 
  | 'absenceTracking' 
  | 'formation' 
  | 'rhGenerator' 
  | 'recruitment'
  | 'contractGenerator' 
  | 'coverageControl' 
  | 'baseInterimaires'
  | 'admin';

interface SidebarProps {
  activeNav: AppNavId;
  onSelectNav: (navId: AppNavId) => void;
  permissions: UserAppPermissions;
}

interface NavItemConfig {
  id: AppNavId;
  label: string;
  icon: React.ElementType;
  color: string;
  permissionKey?: keyof UserAppPermissions;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'home',
    label: 'Accueil',
    icon: Home,
    color: '#38bdf8'
  },
  {
    id: 'operationsTracking',
    label: 'Suivi d’exploitation',
    icon: TrendingUp,
    color: '#00c0f0',
    permissionKey: 'operationsTracking'
  },
  {
    id: 'absenceTracking',
    label: 'Absences et retards',
    icon: Clock,
    color: '#57aea6',
    permissionKey: 'absenceTracking'
  },
  {
    id: 'formation',
    label: 'Formation',
    icon: GraduationCap,
    color: '#35ffd0',
    permissionKey: 'formation'
  },
  {
    id: 'rhGenerator',
    label: 'Dossier RH',
    icon: FolderGit2,
    color: '#ff751f',
    permissionKey: 'rhGenerator'
  },
  {
    id: 'recruitment',
    label: 'Recrutement',
    icon: UserCheck,
    color: '#a855f7',
    permissionKey: 'recruitment'
  },
  {
    id: 'contractGenerator',
    label: 'Import contrat',
    icon: FileText,
    color: '#0062ff',
    permissionKey: 'contractGenerator'
  },
  {
    id: 'coverageControl',
    label: 'Contrôle couverture',
    icon: ShieldCheck,
    color: '#ff5757',
    permissionKey: 'coverageControl'
  }
];

export const BASE_INTERIMAIRES_NAV_ITEM: NavItemConfig = {
  id: 'baseInterimaires',
  label: 'Base intérimaires',
  icon: Users,
  color: '#38bdf8',
  permissionKey: 'baseInterimaires'
};

export const ADMIN_NAV_ITEM: NavItemConfig = {
  id: 'admin',
  label: 'Administration',
  icon: Shield,
  color: '#818cf8',
  permissionKey: 'admin'
};

export default function Sidebar({ activeNav, onSelectNav, permissions }: SidebarProps) {
  // Check visibility for an item
  const isItemVisible = (item: NavItemConfig) => {
    if (!item.permissionKey) return true;
    return permissions[item.permissionKey] !== 'Masquer';
  };

  const renderNavButton = (item: NavItemConfig) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onSelectNav(item.id)}
        id={`sidebar-nav-${item.id}`}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-left group select-none ${
          isActive
            ? 'bg-white/12 text-white shadow-xs'
            : 'text-slate-200 hover:text-white hover:bg-white/8'
        }`}
        title={item.label}
      >
        {/* Color Badge / Icon Container */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
            isActive ? 'scale-105 shadow-xs' : 'opacity-90 group-hover:opacity-100'
          }`}
          style={{
            backgroundColor: `${item.color}25`,
            color: item.color,
            border: `1px solid ${item.color}50`
          }}
        >
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>

        {/* Title */}
        <span className={`text-xs tracking-wide truncate ${isActive ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
          {item.label}
        </span>

        {/* Active subtle pill indicator on the right */}
        {isActive && (
          <div
            className="w-1.5 h-4 rounded-full ml-auto shrink-0 animate-fade-in"
            style={{ backgroundColor: item.color }}
          />
        )}
      </button>
    );
  };

  return (
    <aside
      className="w-60 sm:w-64 bg-[#061d43] text-white shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex flex-col justify-between p-3.5 border-r border-[#0d2a5d] shadow-sm select-none z-20"
      id="main-sidebar-navigation"
    >
      {/* Top Application Items List */}
      <div className="space-y-1 overflow-y-auto pr-1">
        <div className="px-2 py-1.5 mb-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200/50">
            Applications
          </p>
        </div>

        {MAIN_NAV_ITEMS.filter(isItemVisible).map(renderNavButton)}
      </div>

      {/* Bottom Anchored Section: Base intérimaires + Administration */}
      <div className="pt-2 border-t border-white/10 shrink-0 mt-2 space-y-1">
        {isItemVisible(BASE_INTERIMAIRES_NAV_ITEM) && renderNavButton(BASE_INTERIMAIRES_NAV_ITEM)}
        {isItemVisible(ADMIN_NAV_ITEM) && renderNavButton(ADMIN_NAV_ITEM)}
      </div>
    </aside>
  );
}
