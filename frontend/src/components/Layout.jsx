import { NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, Gift, Tag,
  History, Settings, Award, Cloud, UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import UserMenu from './UserMenu.jsx';
import { PageLoader } from './LoadingSpinner.jsx';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',           exact: true,  roles: ['owner','employee'] },
  { to: '/customers',   icon: Users,           label: 'Customers',           roles: ['owner','employee'] },
  { to: '/purchases',   icon: ShoppingCart,    label: 'Purchases',           roles: ['owner','employee'] },
  { to: '/rewards',     icon: Gift,            label: 'Rewards & Redemption',roles: ['owner','employee'] },
  { to: '/offers',      icon: Tag,             label: 'Personalised Offers', roles: ['owner','employee'] },
  { to: '/transactions',icon: History,         label: 'Transactions',        roles: ['owner','employee'] },
  { to: '/settings',    icon: Settings,        label: 'Reward Rules',        roles: ['owner'] },
  { to: '/employees',   icon: UserCog,         label: 'Employees',           roles: ['owner'] },
  { to: '/sync',        icon: Cloud,           label: 'Firebase Sync',       roles: ['owner'] },
];

const GROUPS = [
  { label: 'Overview',     routes: ['/'] },
  { label: 'Operations',   routes: ['/customers','/purchases','/rewards'] },
  { label: 'Intelligence', routes: ['/offers','/transactions'] },
  { label: 'Settings',     routes: ['/settings','/employees','/sync'] },
];

export default function Layout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FC' }}>
        <PageLoader />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const visible = NAV.filter(n => n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen" style={{ background: '#F7F8FC' }}>

      {/* Sidebar */}
      <aside className="w-64 flex flex-col fixed h-full z-20"
        style={{ background: '#FFFFFF', borderRight: '1px solid #E5E7EB', boxShadow: '1px 0 0 0 #F3F4F6' }}>

        {/* Brand */}
        <div className="px-5 py-[18px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', boxShadow: '0 2px 6px 0 rgba(79,70,229,.35)' }}>
              <Award className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize:'0.9375rem', fontWeight:700, color:'#111827', letterSpacing:'-0.02em', lineHeight:1.2 }}>RewardFlow</p>
              <p style={{ fontSize:'0.6875rem', color:'#9CA3AF', fontWeight:500, marginTop:1 }}>Loyalty Engine</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {GROUPS.map((group, gi) => {
            const items = visible.filter(n => group.routes.includes(n.to));
            if (!items.length) return null;
            return (
              <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
                <p className="section-label px-3 mb-1.5">{group.label}</p>
                <ul className="space-y-0.5">
                  {items.map(({ to, icon: Icon, label, exact }) => (
                    <li key={to}>
                      <NavLink to={to} end={exact}
                        className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}>
                        {({ isActive }) => (
                          <>
                            <Icon size={15} className="flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                            <span className="flex-1 truncate" style={{ fontSize: '0.8125rem' }}>{label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* User menu + footer */}
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
          <UserMenu />
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#EEF2FF' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
            <p style={{ fontSize:'0.6875rem', fontWeight:600, color:'#4338CA', letterSpacing:'0.02em' }}>
              AWS Kiro AI-DLC Challenge
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-7 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
