import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Award, ShoppingBag, Calendar,
  Edit2, Check, X, RefreshCw, Tag, TrendingUp, Star,
  ShoppingCart, ChevronRight
} from 'lucide-react';
import { api, formatCurrency, formatDate, formatDateTime, formatPoints } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

const OFFER_ICONS = { welcome: '🎉', comeback: '👋', grocery: '🛒', cafe: '☕', premium: '⭐', repeat: '🔄' };
const OFFER_GRADIENT = {
  welcome: 'from-emerald-50 to-teal-50 border-emerald-200',
  comeback: 'from-blue-50 to-indigo-50 border-blue-200',
  grocery: 'from-green-50 to-emerald-50 border-green-200',
  cafe: 'from-amber-50 to-yellow-50 border-amber-200',
  premium: 'from-violet-50 to-purple-50 border-violet-200',
  repeat: 'from-indigo-50 to-blue-50 border-indigo-200',
};
const OFFER_TEXT = {
  welcome: 'text-emerald-800', comeback: 'text-blue-800',
  grocery: 'text-green-800', cafe: 'text-amber-800',
  premium: 'text-violet-800', repeat: 'text-indigo-800',
};

function getInitialColor(name) {
  const colors = ['from-indigo-400 to-violet-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-pink-400 to-rose-500','from-blue-400 to-cyan-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function CustomerProfile() {
  const { id } = useParams();
  const location = useLocation();
  const [customer, setCustomer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState('purchases');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [generatingOffers, setGeneratingOffers] = useState(false);
  const successMsg = location.state?.message || '';

  const loadData = async () => {
    try {
      const [c, p, l, o] = await Promise.all([
        api.getCustomer(id),
        api.getCustomerPurchases(id),
        api.getCustomerLedger(id),
        api.getCustomerOffers(id),
      ]);
      setCustomer(c.data);
      setEditForm({ name: c.data.name, phone: c.data.phone, email: c.data.email || '' });
      setPurchases(p.data);
      setLedger(l.data);
      setOffers(o.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSaveEdit = async () => {
    setEditError('');
    if (!editForm.name.trim() || !editForm.phone.trim()) { setEditError('Name and phone are required.'); return; }
    try {
      const res = await api.updateCustomer(id, editForm);
      setCustomer(res.data);
      setEditMode(false);
    } catch (err) { setEditError(err.message); }
  };

  const handleRegenerateOffers = async () => {
    setGeneratingOffers(true);
    try {
      await api.generateOffers(id);
      const o = await api.getCustomerOffers(id);
      setOffers(o.data);
    } catch (e) { console.error(e); }
    setGeneratingOffers(false);
  };

  if (loading) return <PageLoader />;
  if (!customer) return <div className="card text-center py-10 text-red-500">Customer not found.</div>;

  const tabs = [
    { key: 'purchases', label: 'Purchases', count: purchases.length },
    { key: 'ledger', label: 'Reward Ledger', count: ledger.length },
    { key: 'offers', label: 'Offers', count: offers.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/customers" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Customer Profile</h1>
        </div>
        <Link to="/purchases/new" className="btn-primary">
          <ShoppingCart className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <Check className="w-4 h-4 text-emerald-500" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="flex items-start justify-between mb-5">
              <div className={`w-16 h-16 bg-gradient-to-br ${getInitialColor(customer.name)} rounded-2xl flex items-center justify-center shadow-md`}>
                <span className="text-2xl font-black text-white">{customer.name.charAt(0)}</span>
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {editMode ? (
              <div className="space-y-3">
                {editError && <p className="text-xs text-red-500 font-medium">{editError}</p>}
                <div>
                  <label className="form-label">Name</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="form-input" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} className="btn-primary flex-1 justify-center">
                    <Check className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => setEditMode(false)} className="btn-secondary px-4">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <p className="text-sm text-gray-400 font-medium mb-4">Customer #C{String(customer.id).padStart(4, '0')}</p>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      {customer.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    Joined {formatDate(customer.join_date)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          {!editMode && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-700">{formatPoints(customer.points_balance)}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">Points Balance</p>
                </div>
                <div className="card p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-emerald-700">{formatCurrency(customer.lifetime_spend)}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Lifetime Spend</p>
                </div>
              </div>

              {customer.points_balance >= 100 && (
                <Link
                  to="/rewards"
                  state={{ customerId: customer.id }}
                  className="btn-primary w-full justify-center py-3"
                >
                  <Award className="w-4 h-4" /> Redeem {formatPoints(customer.points_balance)} Points
                </Link>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex bg-gray-50/60 border-b border-gray-100">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'text-indigo-600 bg-white border-b-2 border-indigo-500 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Purchases */}
              {activeTab === 'purchases' && (
                purchases.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingBag className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 font-medium text-sm">No purchases yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="table-header">Ref</th>
                          <th className="table-header">Amount</th>
                          <th className="table-header">Points</th>
                          <th className="table-header">Discount</th>
                          <th className="table-header">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map(p => (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell">
                              <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{p.purchase_ref}</span>
                            </td>
                            <td className="table-cell font-bold text-gray-900">{formatCurrency(p.total)}</td>
                            <td className="table-cell">
                              <span className="badge bg-amber-50 text-amber-700 border border-amber-100">
                                <Star className="w-3 h-3" /> +{p.points_earned}
                              </span>
                            </td>
                            <td className="table-cell">
                              {p.redemption_discount > 0
                                ? <span className="font-semibold text-emerald-600">-{formatCurrency(p.redemption_discount)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="table-cell text-gray-400 text-xs">{formatDateTime(p.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Ledger */}
              {activeTab === 'ledger' && (
                ledger.length === 0 ? (
                  <div className="text-center py-10">
                    <Award className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 font-medium text-sm">No reward activity yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="table-header">Type</th>
                          <th className="table-header">Points</th>
                          <th className="table-header">Balance After</th>
                          <th className="table-header">Reference</th>
                          <th className="table-header">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map(l => (
                          <tr key={l.id} className="table-row">
                            <td className="table-cell">
                              <span className={`badge border ${l.type === 'earn' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {l.type === 'earn' ? '↑ Earned' : '↓ Redeemed'}
                              </span>
                            </td>
                            <td className={`table-cell font-bold ${l.type === 'earn' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {l.type === 'earn' ? '+' : ''}{l.points}
                            </td>
                            <td className="table-cell font-semibold text-gray-700">{formatPoints(l.balance_after)} pts</td>
                            <td className="table-cell">
                              <span className="font-mono text-xs text-gray-400">{l.reference_id || '—'}</span>
                            </td>
                            <td className="table-cell text-gray-400 text-xs">{formatDateTime(l.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Offers */}
              {activeTab === 'offers' && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleRegenerateOffers}
                      disabled={generatingOffers}
                      className="btn-ghost text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingOffers ? 'animate-spin' : ''}`} />
                      Refresh Offers
                    </button>
                  </div>
                  {offers.length === 0 ? (
                    <div className="text-center py-10">
                      <Tag className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 font-medium text-sm">No offers available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {offers.map(o => (
                        <div key={o.id} className={`bg-gradient-to-br ${OFFER_GRADIENT[o.offer_type] || 'from-gray-50 to-gray-50 border-gray-200'} border rounded-xl p-4`}>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">{OFFER_ICONS[o.offer_type] || '🎁'}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm ${OFFER_TEXT[o.offer_type] || 'text-gray-800'}`}>{o.title}</p>
                              <p className={`text-xs mt-1 ${OFFER_TEXT[o.offer_type] || 'text-gray-600'} opacity-90`}>{o.description}</p>
                              <div className={`mt-2 px-3 py-2 bg-white/60 rounded-lg text-xs ${OFFER_TEXT[o.offer_type] || 'text-gray-700'}`}>
                                <strong>Why you:</strong> {o.reason}
                              </div>
                              {o.valid_until && (
                                <p className={`text-xs mt-2 opacity-60 ${OFFER_TEXT[o.offer_type] || 'text-gray-500'}`}>
                                  Valid until {formatDate(o.valid_until)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
