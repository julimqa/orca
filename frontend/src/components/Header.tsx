import React from 'react';
import { Search, Bell, HelpCircle, ChevronRight } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10">
      {/* Breadcrumbs / Context */}
      <div className="flex items-center text-sm">
        <span className="text-slate-500 hover:text-slate-700 cursor-pointer">Projects</span>
        <ChevronRight className="w-4 h-4 text-slate-400 mx-2" />
        <span className="font-semibold text-slate-900">ORCA</span>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64 transition-all bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <button className="p-2 text-slate-400 hover:text-slate-600 relative rounded-full hover:bg-slate-50 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
