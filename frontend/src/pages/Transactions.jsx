import { useState, useEffect } from 'react';
import { History, Filter, ShoppingBag, Star, Award } from 'lucide-react';
import { api, formatCurrency, formatDateTime, formatPoints } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

const TYPE_CONFIG = {
  purchase: { label: 'Purchase',       bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-100',   icon: ShoppingBag, iconBg: 'bg-blue-100',   iconColor: 'text-blue-500' },
  earn:     { label: 'Points Earned',  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',icon: Star,        iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500' },
  redeem:   { label: 'Redeemed',       bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-100', icon: Award,       iconBg: 'bg-violet-100',  iconColor: 'text-violet-500' },
};

function getInitialColor(name) {
  const c = ['from-indigo-400 to-violet-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-pink-400 to-rose-500'];
  return c[(name?.charCodeAt(0) || 0) % c.length];
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const loadTransactions = (reset = true, custId = filterCustomer, type = filterType) => {
    setLoading(true);
    const offset = reset ? 0 : (page + 1) * LIMIT;
    const params = { limit: LIMIT, offset };
    if (custId) params.customerId = custId;
    if (type) params.type = type;
    api.getTransactions(params).then(r => {
      setTransactions(reset ? r.data : prev => [...prev, ...r.data]);
      setTotal(r.total);
      if (!reset) setPage(p => p + 1);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { api.getCustomers().then(r => setCustomers(r.data)); }, []);
  useEffect(() => { setPage(0); loadTransactions(true, filterCustomer, filterType); }, [filterCustomer, filterType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">All purchases, point earnings, and redemptions</p>
      </div>

      {/* Filters + summary */}
      <div className="card py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="form-input max-w-xs">
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2">
            {['', 'purchase', 'earn', 'redeem'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filterType === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t === '' ? 'All' : t === 'purchase' ? '🛍 Purchases' : t === 'earn' ? '⭐ Earned' : '🎁 Redeemed'}
              </button>
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-500 ml-auto">
            {total.toLocaleString()} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && transactions.length === 0 ? (
          <PageLoader />
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="table-header">Type</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Amount / Points</th>
                  <th className="table-header">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => {
                  const tc = TYPE_CONFIG[t.transaction_type] || TYPE_CONFIG.purchase;
                  const Icon = tc.icon;
                  return (
                    <tr key={`${t.transaction_type}-${t.id}-${i}`} className="table-row group">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 ${tc.iconBg} rounded-lg flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${tc.iconColor}`} />
                          </div>
                          <span className={`badge ${tc.bg} ${tc.text} border ${tc.border}`}>{tc.label}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 bg-gradient-to-br ${getInitialColor(t.customer_name)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xs font-bold text-white">{t.customer_name?.charAt(0)}</span>
                          </div>
                          <span className="font-semibold text-gray-800">{t.customer_name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{t.reference}</span>
                      </td>
                      <td className="table-cell">
                        {t.transaction_type === 'purchase' ? (
                          <span className="font-black text-gray-900">{formatCurrency(t.amount)}</span>
                        ) : t.transaction_type === 'earn' ? (
                          <span className="font-black text-emerald-600">+{formatPoints(t.amount)} pts</span>
                        ) : (
                          <span className="font-black text-violet-600">−{formatPoints(t.amount)} pts</span>
                        )}
                      </td>
                      <td className="table-cell text-gray-400 font-medium text-xs">{formatDateTime(t.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {transactions.length < total && (
              <div className="p-5 text-center border-t border-gray-100">
                <button
                  onClick={() => loadTransactions(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : `Load more · ${total - transactions.length} remaining`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
