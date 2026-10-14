import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Award, AlertCircle, CheckCircle2, Search, Zap, Info } from 'lucide-react';
import { api, formatCurrency, formatDateTime, formatPoints } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

function getInitialColor(name) {
  const colors = ['from-indigo-400 to-violet-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-pink-400 to-rose-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function Rewards() {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [preview, setPreview] = useState(null);
  const [rule, setRule] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getRewardRules()]).then(([c, r]) => {
      setCustomers(c.data);
      setRule(r.data.find(x => x.is_active));
      if (location.state?.customerId) {
        const customer = c.data.find(x => x.id === location.state.customerId);
        if (customer) setSelectedCustomer(customer);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCustomer) { setRedemptions([]); return; }
    api.getTransactions({ customerId: selectedCustomer.id, type: 'redeem' })
      .then(r => setRedemptions(r.data)).catch(console.error);
  }, [selectedCustomer]);

  useEffect(() => {
    const pts = parseInt(pointsToRedeem);
    if (!rule || isNaN(pts) || pts <= 0) { setPreview(null); return; }
    setPreview({ discount: Math.floor(pts / rule.redemption_rate), pts });
  }, [pointsToRedeem, rule]);

  const handleRedeem = async () => {
    setError(''); setSuccess(null);
    if (!selectedCustomer) { setError('Please select a customer.'); return; }
    const pts = parseInt(pointsToRedeem);
    if (!pts || pts <= 0) { setError('Enter points to redeem.'); return; }

    setSubmitting(true);
    try {
      const res = await api.redeemPoints({
        customerId: selectedCustomer.id,
        pointsToRedeem: pts,
        idempotencyKey: `redeem-${selectedCustomer.id}-${Date.now()}`
      });
      setSuccess(res.data);
      setSelectedCustomer(c => ({ ...c, points_balance: res.data.newBalance }));
      setPointsToRedeem('');
      api.getCustomers().then(r => setCustomers(r.data));
      api.getTransactions({ customerId: selectedCustomer.id, type: 'redeem' }).then(r => setRedemptions(r.data));
    } catch (err) {
      setError(err.message || 'Redemption failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const canRedeem = selectedCustomer && rule &&
    selectedCustomer.points_balance >= rule.min_redemption;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Rewards &amp; Redemption</h1>
        <p className="page-subtitle">Exchange customer points for instant discounts</p>
      </div>

      {/* Rule summary */}
      {rule && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Earn Rate', value: `₹${rule.earn_threshold} = 1 pt`, sub: 'per purchase', color: 'indigo' },
            { label: 'Redemption', value: `${rule.redemption_rate} pts = ₹1`, sub: 'discount value', color: 'violet' },
            { label: 'Minimum', value: `${rule.min_redemption} pts`, sub: 'to redeem', color: 'amber' },
          ].map(item => (
            <div key={item.label} className={`card p-5 text-center bg-gradient-to-br ${
              item.color === 'indigo' ? 'from-indigo-50 to-violet-50 border-indigo-100' :
              item.color === 'violet' ? 'from-violet-50 to-purple-50 border-violet-100' :
              'from-amber-50 to-yellow-50 border-amber-100'
            }`}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{item.label}</p>
              <p className={`text-xl font-black ${
                item.color === 'indigo' ? 'text-indigo-700' :
                item.color === 'violet' ? 'text-violet-700' : 'text-amber-700'
              }`}>{item.value}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redemption form */}
        <div className="card space-y-5">
          <h2 className="text-base font-bold text-gray-900">Redeem Points</h2>

          {/* Customer picker */}
          <div>
            <label className="form-label">Customer</label>
            <div className="relative mb-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getInitialColor(selectedCustomer.name)} rounded-xl flex items-center justify-center shadow-sm`}>
                    <span className="text-sm font-bold text-white">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-indigo-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-indigo-600">
                      Balance: <span className="font-black text-amber-600">{formatPoints(selectedCustomer.points_balance)} pts</span>
                      {!canRedeem && <span className="text-red-500 ml-1.5">· Below minimum</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setSuccess(null); setError(''); }}
                  className="text-xs text-indigo-400 hover:text-indigo-600 underline font-medium">
                  Change
                </button>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No customers found</p>
                ) : filteredCustomers.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setSuccess(null); setError(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className={`w-9 h-9 bg-gradient-to-br ${getInitialColor(c.name)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs font-bold text-white">{c.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone} · <span className="font-semibold text-amber-600">{formatPoints(c.points_balance)} pts</span></p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Points input */}
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <label className="form-label">Points to Redeem</label>
                <div className="relative">
                  <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <input
                    type="number"
                    min={rule?.min_redemption || 100}
                    step="10"
                    placeholder={`Min ${rule?.min_redemption || 100} points`}
                    value={pointsToRedeem}
                    onChange={e => { setPointsToRedeem(e.target.value); setError(''); setSuccess(null); }}
                    className="form-input pl-10"
                    max={selectedCustomer.points_balance}
                    disabled={!canRedeem}
                  />
                </div>
                {canRedeem
                  ? <p className="form-hint">Max: {formatPoints(selectedCustomer.points_balance)} pts available</p>
                  : <p className="form-hint text-red-400">Customer needs at least {rule?.min_redemption} points to redeem.</p>
                }
              </div>

              {/* Preview */}
              {preview && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-bold text-amber-900">Redemption Preview</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    ₹{preview.discount} <span className="text-base font-semibold text-gray-400">discount</span>
                  </p>
                  <p className="text-xs text-amber-700 mt-1.5 font-medium">
                    {formatPoints(preview.pts)} pts used · {formatPoints(selectedCustomer.points_balance - preview.pts)} pts remaining
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Redemption successful!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {success.pointsRedeemed} pts → ₹{success.discountValue} off · New balance: <strong>{formatPoints(success.newBalance)} pts</strong>
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={submitting || !pointsToRedeem || !canRedeem}
                className="btn-primary w-full justify-center py-3"
              >
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  : <><Award className="w-4 h-4" /> Redeem Points</>
                }
              </button>
            </div>
          )}

          {!selectedCustomer && (
            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800">
              <Info className="w-4 h-4 flex-shrink-0 text-indigo-500 mt-0.5" />
              <span className="font-medium">Search for a customer above to start a redemption.</span>
            </div>
          )}
        </div>

        {/* History */}
        <div className="card">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Redemption History
            {selectedCustomer && <span className="text-sm font-normal normal-case text-gray-400 ml-2">— {selectedCustomer.name}</span>}
          </h2>
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                <Award className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No customer selected</p>
              <p className="text-xs text-gray-400 text-center max-w-[180px] leading-relaxed">
                Select a customer on the left to view their redemption history
              </p>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                <Award className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No redemptions yet</p>
              <p className="text-xs text-gray-400">{selectedCustomer.name} hasn't redeemed any points</p>
            </div>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">−{Math.abs(r.points)} pts redeemed</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.created_at)}</p>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-600">₹{Math.abs(r.amount)} off</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
