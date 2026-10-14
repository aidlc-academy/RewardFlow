import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Phone, Mail, Award, ChevronRight } from 'lucide-react';
import { api, formatCurrency, formatDate, formatPoints } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

function getInitialColor(name) {
  const colors = [
    'from-indigo-400 to-violet-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-blue-400 to-cyan-500',
    'from-purple-400 to-fuchsia-500',
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function getSegmentBadge(customer) {
  if (customer.lifetime_spend >= 10000) return { label: 'Premium', color: 'bg-violet-50 text-violet-700 border-violet-100' };
  if (customer.points_balance >= 500) return { label: 'High Earner', color: 'bg-amber-50 text-amber-700 border-amber-100' };
  const daysSince = customer.last_purchase_date
    ? Math.floor((Date.now() - new Date(customer.last_purchase_date)) / 86400000)
    : 999;
  if (daysSince > 60) return { label: 'Inactive', color: 'bg-red-50 text-red-600 border-red-100' };
  if (daysSince <= 7) return { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  return null;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCustomers = (q = '') => {
    setLoading(true);
    api.getCustomers(q)
      .then(r => setCustomers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => loadCustomers(e.target.value), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} registered members</p>
        </div>
        <Link to="/customers/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </Link>
      </div>

      {/* Search bar */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.875rem 1.25rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,.04)' }}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={search}
            onChange={handleSearch}
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0,0,0,.05)', overflow: 'hidden' }}>
        {loading ? (
          <PageLoader />
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>No customers found</p>
            {search
              ? <p className="text-sm text-gray-400">Try a different search term</p>
              : <Link to="/customers/new" className="btn-primary mt-2">Add First Customer</Link>
            }
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th className="table-header">Customer</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Points</th>
                <th className="table-header">Lifetime Spend</th>
                <th className="table-header">Last Purchase</th>
                <th className="table-header">Segment</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const badge = getSegmentBadge(c);
                return (
                  <tr key={c.id} className="table-row group">
                    {/* Customer */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${getInitialColor(c.name)} rounded-lg flex items-center justify-center flex-shrink-0`}
                          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,.12)' }}>
                          <span className="text-xs font-bold text-white">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-indigo-600 transition-colors"
                            style={{ fontSize: '0.8125rem', color: '#111827' }}>
                            {c.name}
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: 1 }}>
                            #{c.id} · {formatDate(c.join_date)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="table-cell">
                      <p className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', color: '#374151' }}>
                        <Phone className="w-3 h-3 text-gray-300 flex-shrink-0" />{c.phone}
                      </p>
                      {c.email && (
                        <p className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                          <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                        </p>
                      )}
                    </td>

                    {/* Points */}
                    <td className="table-cell">
                      <span
                        className="badge"
                        style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                      >
                        <Award className="w-3 h-3" />
                        {formatPoints(c.points_balance)}
                      </span>
                    </td>

                    {/* Spend */}
                    <td className="table-cell">
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(c.lifetime_spend)}
                      </span>
                    </td>

                    {/* Last purchase */}
                    <td className="table-cell">
                      <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                        {formatDate(c.last_purchase_date)}
                      </span>
                    </td>

                    {/* Segment badge */}
                    <td className="table-cell">
                      {badge && (
                        <span className={`chip ${badge.color}`}>{badge.label}</span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="table-cell pr-4">
                      <Link
                        to={`/customers/${c.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#EEF2FF'; e.currentTarget.style.color='#4F46E5'; e.currentTarget.style.borderColor='#C7D2FE'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='#F9FAFB'; e.currentTarget.style.color='#9CA3AF'; e.currentTarget.style.borderColor='#E5E7EB'; }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
