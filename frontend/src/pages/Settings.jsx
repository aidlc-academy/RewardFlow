import { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Zap, Info, Lock } from 'lucide-react';
import { api, formatDate } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

export default function Settings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', earnThreshold: 10, earnMultiplier: 1, redemptionRate: 10, minRedemption: 100 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRules = () => {
    api.getRewardRules().then(r => setRules(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, []);

  const activeRule = rules.find(r => r.is_active);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.createRewardRule(form);
      setSuccess('New rule created and activated successfully.');
      setShowForm(false);
      setForm({ name: '', earnThreshold: 10, earnMultiplier: 1, redemptionRate: 10, minRedemption: 100 });
      loadRules();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const examplePoints = activeRule ? Math.floor(2000 / activeRule.earn_threshold) * activeRule.earn_multiplier : 200;
  const exampleDiscount = activeRule ? Math.floor((activeRule.min_redemption / activeRule.redemption_rate)) : 10;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="page-title">Reward Rules</h1>
        <p className="page-subtitle">Configure how customers earn and redeem points</p>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {/* Active Rule */}
          {activeRule && (
            <div className="card border-2 border-indigo-200/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="font-extrabold text-gray-900">{activeRule.name}</h2>
                <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200 ml-auto">Active</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Earn Rate</p>
                  <p className="text-3xl font-black text-indigo-700">₹{activeRule.earn_threshold}</p>
                  <p className="text-sm text-indigo-600 font-semibold mt-0.5">= {activeRule.earn_multiplier} point</p>
                  <p className="text-xs text-gray-400 mt-1.5">Per spend unit</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Redeem Rate</p>
                  <p className="text-3xl font-black text-violet-700">{activeRule.redemption_rate}</p>
                  <p className="text-sm text-violet-600 font-semibold mt-0.5">pts = ₹1 off</p>
                  <p className="text-xs text-gray-400 mt-1.5">Min: {activeRule.min_redemption} pts</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <strong>Example:</strong> A ₹2,000 purchase earns{' '}
                  <span className="font-black text-amber-800">floor(2000 ÷ {activeRule.earn_threshold}) = {examplePoints} points</span>.
                  Redeeming {activeRule.min_redemption} points gives{' '}
                  <span className="font-black text-emerald-700">₹{exampleDiscount} off</span>.
                </p>
              </div>

              <p className="text-xs text-gray-400 mt-3 font-medium">Rule created: {formatDate(activeRule.created_at)}</p>
            </div>
          )}

          {/* History */}
          {rules.filter(r => !r.is_active).length > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Lock className="w-3.5 h-3.5 text-gray-400" /> Previous Rules
              </h2>
              <div className="space-y-2">
                {rules.filter(r => !r.is_active).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="badge bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
                    <span className="font-semibold text-gray-600 text-sm flex-1">{r.name}</span>
                    <span className="text-xs text-gray-400 font-medium">
                      ₹{r.earn_threshold}/pt · {r.redemption_rate}pts/₹1 · min {r.min_redemption}pts
                    </span>
                    <span className="text-xs text-gray-300">{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create rule */}
          <div className="card">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="font-bold text-gray-900">Create New Rule</h2>
              <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
                <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Rule'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Creating a new rule activates it immediately and deactivates the current one.</p>

            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              Historical transactions keep the rates under which they were recorded — they are not affected.
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
                {success && <p className="text-sm text-emerald-600 font-semibold">{success}</p>}

                <div>
                  <label className="form-label">Rule Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. Double Points Diwali 2026"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Earn Threshold (₹ per point)</label>
                    <input type="number" min="1" value={form.earnThreshold}
                      onChange={e => setForm(f => ({ ...f, earnThreshold: e.target.value }))}
                      className="form-input" required />
                    <p className="form-hint">Spend ₹X to earn 1 point</p>
                  </div>
                  <div>
                    <label className="form-label">Earn Multiplier</label>
                    <input type="number" min="1" value={form.earnMultiplier}
                      onChange={e => setForm(f => ({ ...f, earnMultiplier: e.target.value }))}
                      className="form-input" required />
                    <p className="form-hint">Points per threshold (usually 1)</p>
                  </div>
                  <div>
                    <label className="form-label">Redemption Rate (pts per ₹1)</label>
                    <input type="number" min="1" value={form.redemptionRate}
                      onChange={e => setForm(f => ({ ...f, redemptionRate: e.target.value }))}
                      className="form-input" required />
                    <p className="form-hint">Lower = more generous</p>
                  </div>
                  <div>
                    <label className="form-label">Minimum Redemption (pts)</label>
                    <input type="number" min="1" value={form.minRedemption}
                      onChange={e => setForm(f => ({ ...f, minRedemption: e.target.value }))}
                      className="form-input" required />
                    <p className="form-hint">Minimum to qualify</p>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3">
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Create &amp; Activate Rule</>
                  }
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
