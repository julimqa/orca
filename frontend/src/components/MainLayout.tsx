import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      {/* Margin left matches Sidebar width (w-64 = 16rem = 256px) */}
      <div className="flex-1 flex flex-col ml-64 min-w-0">
        {/* Top Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
