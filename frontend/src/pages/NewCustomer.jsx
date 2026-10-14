import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Phone, Mail, User, CheckCircle2 } from 'lucide-react';
import { api } from '../api/index.js';

export default function NewCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit number.';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await api.createCustomer(form);
      navigate(`/customers/${res.data.id}`, { state: { message: 'Customer created successfully!' } });
    } catch (err) {
      setApiError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-7">
        <Link to="/customers" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Add Customer</h1>
          <p className="page-subtitle">Register a new loyalty programme member</p>
        </div>
      </div>

      <div className="card">
        {/* Icon header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">New Customer</p>
            <p className="text-xs text-gray-400">They'll start with 0 reward points</p>
          </div>
        </div>

        {apiError && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="text-red-400 mt-0.5">⚠</span>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="form-label">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name <span className="text-red-400">*</span></span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`form-input ${errors.name ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-500/20' : ''}`}
              placeholder="e.g. Arun Kumar"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-red-400">*</span></span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={`form-input ${errors.phone ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-500/20' : ''}`}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="form-label">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email <span className="text-gray-300 text-xs font-normal">(optional)</span></span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`form-input ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
              placeholder="arun@example.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 justify-center py-3"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Create Customer</>
              )}
            </button>
            <Link to="/customers" className="btn-secondary px-5">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
