import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: user.role === 'owner'
              ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
              : '#E5E7EB',
          }}
        >
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: user.role === 'owner' ? '#fff' : '#6B7280' }}>
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </p>
          <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}>
            {user.role === 'owner'
              ? <><Shield style={{ width: 10, height: 10 }} /> Owner</>
              : <><User style={{ width: 10, height: 10 }} /> Employee</>
            }
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl py-1 overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px 0 rgba(0,0,0,.12)' }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>{user.name}</p>
              <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: 1 }}>{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
              style={{ fontSize: '0.8125rem', color: '#EF4444', fontWeight: 500 }}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
