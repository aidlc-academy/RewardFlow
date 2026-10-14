import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, Database, ArrowRight, Flame } from 'lucide-react';
import { api } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

export default function Sync() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      setStatus(data.data);
    } catch (e) {
      setError('Could not reach backend.');
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const handleFullSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      const res = await fetch('/api/sync/full', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data.data);
    } catch (e) {
      setError('Sync failed: ' + e.message);
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Firebase Sync</h1>
        <p className="page-subtitle">Mirror your SQLite data to Firestore in real time</p>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {/* Status card */}
          <div className={`card border-2 ${status?.firestoreEnabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/20'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${status?.firestoreEnabled ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {status?.firestoreEnabled
                  ? <Cloud className="w-7 h-7 text-emerald-600" />
                  : <CloudOff className="w-7 h-7 text-red-500" />
                }
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {status?.firestoreEnabled ? 'Firestore Connected' : 'Firestore Disabled'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{status?.message}</p>
                {status?.firestoreEnabled && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Project: {status.project}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Architecture diagram */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-5">Sync Architecture</h2>
            <div className="flex items-center justify-between gap-3">
              {/* SQLite */}
              <div className="flex-1 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                <Database className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="font-bold text-indigo-800 text-sm">SQLite</p>
                <p className="text-xs text-indigo-600 mt-0.5">Primary store</p>
                <p className="text-xs text-gray-400 mt-1">All reads & writes</p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <p className="text-xs text-gray-400 font-medium">mirror</p>
              </div>

              {/* Firestore */}
              <div className={`flex-1 p-4 rounded-xl text-center border ${status?.firestoreEnabled ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <Flame className={`w-8 h-8 mx-auto mb-2 ${status?.firestoreEnabled ? 'text-orange-500' : 'text-gray-300'}`} />
                <p className={`font-bold text-sm ${status?.firestoreEnabled ? 'text-orange-800' : 'text-gray-400'}`}>Firestore</p>
                <p className={`text-xs mt-0.5 ${status?.firestoreEnabled ? 'text-orange-600' : 'text-gray-400'}`}>Cloud backup</p>
                <p className="text-xs text-gray-400 mt-1">Real-time mirror</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <strong>How it works:</strong> Every customer creation, purchase, and redemption writes to SQLite first (atomic),
              then fires a non-blocking Firestore sync. If Firebase is unavailable, the local operation still succeeds.
            </div>
          </div>

          {/* Collections synced */}
          {status?.firestoreEnabled && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Firestore Collections</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'customers', desc: 'All customer profiles + sub-collections', color: 'indigo' },
                  { name: 'purchases', desc: 'Every recorded purchase + items', color: 'green' },
                  { name: 'reward_ledger', desc: 'Immutable earn/redeem events', color: 'amber' },
                  { name: 'redemptions', desc: 'Point redemption records', color: 'purple' },
                  { name: 'meta/dashboard_stats', desc: 'Aggregate KPIs', color: 'blue' },
                  { name: 'customers/{id}/offers', desc: 'Personalised offers per customer', color: 'rose' },
                ].map(col => (
                  <div key={col.name} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-mono text-xs font-bold text-gray-700">{col.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full sync button */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-2">Manual Full Sync</h2>
            <p className="text-sm text-gray-500 mb-4">
              Push all current SQLite data to Firestore. This runs automatically on server startup.
              Use this if you need to force a re-sync.
            </p>

            {syncResult && (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Sync complete!</p>
                  {syncResult.counts && (
                    <p className="text-xs text-emerald-700 mt-1">
                      Customers: {syncResult.counts.customers} ·
                      Purchases: {syncResult.counts.purchases} ·
                      Ledger: {syncResult.counts.ledger}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleFullSync}
              disabled={syncing || !status?.firestoreEnabled}
              className="btn-primary py-3"
            >
              {syncing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Syncing...</>
                : <><RefreshCw className="w-4 h-4" /> Run Full Sync</>
              }
            </button>

            {!status?.firestoreEnabled && (
              <p className="text-xs text-gray-400 mt-2">
                Full sync is unavailable — Firestore is not connected.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
