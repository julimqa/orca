import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col ml-64 min-w-0 transition-all duration-300">
        {/* Top Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
