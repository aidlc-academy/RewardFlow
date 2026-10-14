import { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, CheckCircle2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { authApi, formatDate } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

export default function Employees() {
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ name: '', email: '', password: '' });
  const [formError,  setFormError]  = useState('');
  const [formOk,     setFormOk]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    authApi.getEmployees()
      .then(r => setEmployees(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(''); setFormOk('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError('All fields are required.'); return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.'); return;
    }
    setSubmitting(true);
    try {
      await authApi.createEmployee(form);
      setFormOk(`Account created for ${form.email}`);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (emp) => {
    await authApi.updateEmployee(emp.id, { is_active: !emp.is_active }).catch(console.error);
    load();
  };

  const remove = async (emp) => {
    if (!window.confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    await authApi.deleteEmployee(emp.id).catch(console.error);
    load();
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Employee Accounts</h1>
          <p className="page-subtitle">Manage staff access to RewardFlow</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setFormError(''); setFormOk(''); }} className="btn-primary">
          <UserPlus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {/* Owner-only notice */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
        <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <p style={{ fontSize: '0.8125rem', color: '#3730A3', fontWeight: 500 }}>
          Only the owner can create and manage employee accounts.
        </p>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card">
          <p className="card-title mb-4">New Employee Account</p>
          {formError && (
            <div className="p-3 rounded-lg mb-4 text-sm font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="form-input" placeholder="Jane Smith" required />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="form-input" placeholder="jane@store.com" required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="form-input" placeholder="Min 8 chars" minLength={8} required />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Account</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {formOk && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p style={{ fontSize: '0.8125rem', color: '#065F46', fontWeight: 500 }}>{formOk}</p>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,.05)' }}>
        {loading ? <PageLoader /> : employees.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No employees yet</p>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>Create the first employee above</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Created</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4F46E5' }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{emp.name}</span>
                    </div>
                  </td>
                  <td className="table-cell" style={{ color: '#6B7280' }}>{emp.email}</td>
                  <td className="table-cell" style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>{formatDate(emp.created_at)}</td>
                  <td className="table-cell">
                    <span className="badge" style={{
                      background: emp.is_active ? '#ECFDF5' : '#F9FAFB',
                      color: emp.is_active ? '#065F46' : '#6B7280',
                      border: `1px solid ${emp.is_active ? '#A7F3D0' : '#E5E7EB'}`
                    }}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggle(emp)} className="btn-ghost text-xs py-1.5 px-2.5">
                        {emp.is_active
                          ? <><ToggleRight className="w-4 h-4 text-emerald-500" /> Deactivate</>
                          : <><ToggleLeft className="w-4 h-4 text-gray-400" /> Activate</>
                        }
                      </button>
                      <button onClick={() => remove(emp)} className="btn-ghost text-xs py-1.5 px-2 text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
