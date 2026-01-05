import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { ShieldCheck, User, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="bg-[#2b2b2b] text-white h-14 flex items-center justify-between px-6 shadow-md z-50">
      {/* Logo Area */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="bg-white text-[#2b2b2b] p-1 rounded">
          <ShieldCheck size={20} strokeWidth={3} />
        </div>
        <span className="font-bold text-lg tracking-wide">
          TMS <span className="font-light text-gray-400">v2.0</span>
        </span>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-300 hover:text-white cursor-pointer transition-colors">
          <User size={16} />
          <span className="font-semibold">{user.name}</span>
          {user.role === 'ADMIN' && (
            <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">ADMIN</span>
          )}
        </div>

        <div className="h-4 w-px bg-gray-600"></div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
          data-testid="auth-logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
