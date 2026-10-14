import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShoppingBag, Star, TrendingDown, Award, Repeat,
  ArrowRight, ShoppingCart, Plus, TrendingUp, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api, formatCurrency, formatDateTime, formatPoints } from '../api/index.js';
import { StatCard } from '../components/StatCard.jsx';
import { PageLoader } from '../components/LoadingSpinner.jsx';

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [redemptionTrend, setRedemptionTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getRecentTransactions(),
      api.getSalesTrend(),
      api.getRedemptionTrend()
    ]).then(([s, r, st, rt]) => {
      setStats(s.data);
      setRecent(r.data);
      setSalesTrend(st.data.map(d => ({ ...d, date: formatShortDate(d.date) })));
      setRedemptionTrend(rt.data.map(d => ({ ...d, date: formatShortDate(d.date) })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live overview of your loyalty programme</p>
        </div>
        <div className="flex gap-2.5">
          <Link to="/customers/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Customer
          </Link>
          <Link to="/purchases/new" className="btn-secondary">
            <ShoppingCart className="w-4 h-4" /> New Purchase
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Customers" value={stats.totalCustomers} icon={Users} color="indigo" subtitle="Registered" />
          <StatCard label="Total Sales" value={formatCurrency(stats.totalSales)} icon={TrendingUp} color="green" subtitle="All time" />
          <StatCard label="Points Issued" value={formatPoints(stats.pointsIssued)} icon={Star} color="amber" subtitle="Lifetime earned" />
          <StatCard label="Points Redeemed" value={formatPoints(stats.pointsRedeemed)} icon={TrendingDown} color="purple" subtitle="Lifetime used" />
          <StatCard label="Outstanding" value={formatPoints(stats.outstandingPoints)} icon={Award} color="blue" subtitle="Customer balances" />
          <StatCard label="Repeat Buyers" value={stats.repeatCustomers} icon={Repeat} color="indigo" subtitle={`of ${stats.totalCustomers} total`} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales trend */}
        <div className="card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Sales Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days · daily revenue</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Activity className="w-3.5 h-3.5" /> Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} interval={5} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} width={40} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Redemption trend */}
        <div className="card lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Redemptions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 30 days · points used</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={redemptionTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} interval={5} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pointsRedeemed" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recent Purchases</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest 10 transactions</p>
          </div>
          <Link to="/transactions" className="btn-ghost text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-700 font-semibold">No purchases yet</p>
            <p className="text-sm text-gray-400 mt-1">Record your first sale to get started</p>
            <Link to="/purchases/new" className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Record Purchase
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Reference</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Points Earned</th>
                  <th className="table-header">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                        {t.purchase_ref}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Link to={`/customers/${t.customer_id}`} className="flex items-center gap-2.5 group w-fit">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-xs font-bold text-white">{t.customer_name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{t.customer_name}</span>
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span className="font-bold text-gray-950">{formatCurrency(t.total)}</span>
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                        <Star className="w-3 h-3" /> +{t.points_earned}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500 font-medium text-xs">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
