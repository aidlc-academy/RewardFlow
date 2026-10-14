import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F8FC' }}>
      <div className="w-full max-w-[380px]">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 flex items-center justify-center rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', boxShadow: '0 4px 14px 0 rgba(79,70,229,.40)' }}
          >
            <Award className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>
            RewardFlow
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: 4 }}>
            Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 4px 24px 0 rgba(0,0,0,.07)', padding: '2rem' }}>

          {error && (
            <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p style={{ fontSize: '0.8125rem', color: '#B91C1C', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="form-input pl-10" placeholder="you@store.com"
                  autoComplete="email" autoFocus disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10" placeholder="••••••••"
                  autoComplete="current-password" disabled={loading}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : 'Sign in'
              }
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', marginTop: '1.5rem' }}>
          AWS Kiro AI-DLC Challenge · RewardFlow v1.0
        </p>

        {/* Demo credentials hint */}
        <div style={{ marginTop: '1rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,.05)' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>
            Demo Credentials
          </p>
          <div className="space-y-2">
            {[
              { role: 'Owner', email: 'owner@rewardflow.com', password: 'Owner@2026!', color: '#4F46E5', bg: '#EEF2FF' },
              { role: 'Employee', email: 'jane@rewardflow.com', password: 'Jane@2026!', color: '#059669', bg: '#ECFDF5' },
            ].map(({ role, email, password, color, bg }) => (
              <button
                key={role}
                type="button"
                onClick={() => { setEmail(email); setPassword(password); setError(''); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
                style={{ background: bg, border: `1px solid ${color}22` }}
                title={`Fill in ${role} credentials`}
              >
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{role}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: 1 }}>{email}</p>
                </div>
                <p style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: '#9CA3AF' }}>{password}</p>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#D1D5DB', textAlign: 'center', marginTop: '0.625rem' }}>
            Click a row to fill credentials
          </p>
        </div>
      </div>
    </div>
  );
}
