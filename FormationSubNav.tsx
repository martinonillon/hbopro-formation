import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  FileSpreadsheet, 
  CreditCard, 
  Receipt, 
  Users, 
  BookOpen 
} from 'lucide-react';

interface FormationSubNavProps {
  activeTab: string;
  onSelectTab: (tab: 'dashboard' | 'calendar' | 'logs' | 'payroll' | 'billing' | 'catalog') => void;
}

export default function FormationSubNav({ activeTab, onSelectTab }: FormationSubNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'KPI', icon: LayoutDashboard, color: '#082C66' },
    { id: 'calendar', label: 'Calendrier', icon: Calendar, color: '#06b6d4' },
    { id: 'logs', label: 'Suivi Général', icon: FileSpreadsheet, color: '#57aea6' },
    { id: 'payroll', label: 'Gestion paye', icon: CreditCard, color: '#9333ea' },
    { id: 'billing', label: 'Gestion facturation', icon: Receipt, color: '#d97706' },
    { id: 'catalog', label: 'Catalogue de formation', icon: BookOpen, color: '#eab308' },
  ];

  return (
    <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs mb-6 overflow-x-auto" id="formation-subnav-bar">
      <div className="flex items-center gap-1.5 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as any)}
              id={`tab-formation-${tab.id}`}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'bg-[#082C66] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-[#082C66] hover:bg-slate-100 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#ffde59]' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
