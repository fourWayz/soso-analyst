'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface FlowPoint {
  date: string;
  inflow: number; // in millions USD
}

interface Props {
  // Pass pre-fetched data, or component self-fetches
  trend7d?: { value: number; date: string }[];
}

function fmt(v: number) {
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(0)}M`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v: number = payload[0].value;
  return (
    <div className="bg-[#0d1224] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-white/40 mb-0.5">{label}</p>
      <p className={`font-semibold ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(v)}</p>
    </div>
  );
}

export default function ETFFlowChart({ trend7d }: Props) {
  const [data, setData] = useState<FlowPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trend7d && trend7d.length > 0) {
      setData(trend7d.map(p => ({ date: p.date, inflow: p.value / 1e6 })));
      setLoading(false);
      return;
    }
    // Self-fetch if no data passed
    fetch('/api/sosovalue?path=/etfs/summary-history&symbol=BTC&country_code=US')
      .then(r => r.json())
      .then(json => {
        const arr: { date: string; total_net_inflow?: number }[] =
          Array.isArray(json?.data) ? json.data : [];
        const last7 = arr.slice(-7);
        setData(last7.map(e => ({
          date: e.date ? e.date.slice(5) : '—', // MM-DD
          inflow: (e.total_net_inflow ?? 0) / 1e6,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trend7d]);

  if (loading) {
    return <div className="h-20 bg-white/5 rounded animate-pulse mt-3" />;
  }
  if (data.length === 0) return null;

  const net = data.reduce((s, d) => s + d.inflow, 0);

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/40">7-Day BTC ETF Net Inflow</p>
        <span className={`text-xs font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {net >= 0 ? '+' : ''}${net.toFixed(0)}M 7-day net
        </span>
      </div>
      <ResponsiveContainer width="100%" height={72}>
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={16}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="inflow" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.inflow >= 0 ? 'rgb(16,185,129)' : 'rgb(244,63,94)'}
                opacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
