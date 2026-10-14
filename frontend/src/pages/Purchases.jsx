import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingBag } from 'lucide-react';
import { api, formatCurrency, formatDateTime, formatPoints } from '../api/index.js';
import { PageLoader } from '../components/LoadingSpinner.jsx';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPurchases({ limit: 100 }).then(r => setPurchases(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{purchases.length} total purchase records</p>
        </div>
        <Link to="/purchases/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <PageLoader /> : purchases.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No purchases recorded yet</p>
            <Link to="/purchases/new" className="btn-primary inline-flex mt-4">Record First Purchase</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Reference</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Total</th>
                <th className="table-header">Discount Applied</th>
                <th className="table-header">Points Earned</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs text-indigo-600">{p.purchase_ref}</td>
                  <td className="table-cell">
                    <Link to={`/customers/${p.customer_id}`} className="hover:text-indigo-600 font-medium">{p.customer_name}</Link>
                  </td>
                  <td className="table-cell font-semibold">{formatCurrency(p.total)}</td>
                  <td className="table-cell">
                    {p.redemption_discount > 0
                      ? <span className="text-green-600 font-medium">-{formatCurrency(p.redemption_discount)}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className="badge bg-amber-50 text-amber-700">+{p.points_earned} pts</span>
                  </td>
                  <td className="table-cell text-gray-500">{formatDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
