const configs = {
  indigo:  { iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  bar: 'bg-indigo-500' },
  green:   { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber:   { iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   bar: 'bg-amber-500'  },
  purple:  { iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  bar: 'bg-violet-500' },
  blue:    { iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    bar: 'bg-blue-500'   },
  red:     { iconBg: 'bg-red-50',     iconColor: 'text-red-600',     bar: 'bg-red-500'    },
};

export function StatCard({ label, value, subtitle, icon: Icon, color = 'indigo', trend }) {
  const c = configs[color] || configs.indigo;

  return (
    <div
      className="relative bg-white rounded-xl overflow-hidden flex flex-col"
      style={{
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,.05), 0 1px 2px -1px rgba(0,0,0,.04)',
        transition: 'box-shadow 180ms ease',
        padding: '1.125rem 1.25rem 1.125rem 1.25rem',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(0,0,0,.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0,0,0,.05), 0 1px 2px -1px rgba(0,0,0,.04)'}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${c.bar} opacity-70`} />

      <div className="flex items-start justify-between mb-3 mt-0.5">
        {/* Icon container */}
        <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {Icon && <Icon className={`w-4.5 h-4.5 ${c.iconColor}`} size={17} strokeWidth={2} />}
        </div>

        {/* Trend pill */}
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Metric */}
      <p className="metric-label">{label}</p>
      <p className="metric-value mt-1">{value}</p>
      {subtitle && <p className="metric-sub">{subtitle}</p>}
    </div>
  );
}
