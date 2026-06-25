'use client';

import { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import AuthGuard from '../../components/AuthGuard';
import StatCard from '../../components/dashboard/StatCard';

echarts.registerTheme('dark', {
  backgroundColor: 'transparent',
  textStyle: { color: '#94a3b8' },
  title: { textStyle: { color: '#e2e8f0' } },
  legend: { textStyle: { color: '#94a3b8' } },
  tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(6,182,212,0.25)', textStyle: { color: '#e2e8f0' } },
  categoryAxis: { axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
  valueAxis: { axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
});

// Simulated customer data
const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安'];

function generateCustomerData() {
  return Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: `用户${1000 + i}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    total_orders: Math.floor(Math.random() * 80 + 1),
    total_spent: Math.floor(Math.random() * 50000 + 500),
    last_order_date: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
    is_active: Math.random() > 0.3,
  }));
}

function CustomersContent() {
  const [loading, setLoading] = useState(true);
  const [customers] = useState(() => generateCustomerData());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Stats
  const totalRegistered = useMemo(() => customers.length, [customers]);
  const activeUsers = useMemo(() => customers.filter((c) => c.is_active).length, [customers]);
  const repeatRate = useMemo(() => {
    const repeat = customers.filter((c) => c.total_orders > 2).length;
    return Math.round((repeat / customers.length) * 100);
  }, [customers]);
  const avgOrdersPerUser = useMemo(() => {
    const total = customers.reduce((s, c) => s + c.total_orders, 0);
    return customers.length > 0 ? parseFloat((total / customers.length).toFixed(1)) : 0;
  }, [customers]);

  // City distribution
  const cityDist = useMemo(() => {
    const dist: Record<string, number> = {};
    customers.forEach((c) => { dist[c.city] = (dist[c.city] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [customers]);

  const cityPieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8, itemGap: 12 },
    series: [{
      type: 'pie', radius: ['45%', '75%'], center: ['50%', '43%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 }, label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 8 },
      data: cityDist,
      color: ['#22d3ee', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899', '#84cc16', '#14b8a6', '#f97316'],
    }],
  }), [cityDist]);

  // Order frequency histogram
  const freqBuckets = useMemo(() => {
    const buckets = [
      { range: '1-5', min: 1, max: 5, count: 0 },
      { range: '6-10', min: 6, max: 10, count: 0 },
      { range: '11-20', min: 11, max: 20, count: 0 },
      { range: '21-50', min: 21, max: 50, count: 0 },
      { range: '50+', min: 51, max: 999, count: 0 },
    ];
    customers.forEach((c) => {
      for (const b of buckets) {
        if (c.total_orders >= b.min && c.total_orders <= b.max) { b.count++; break; }
      }
    });
    return buckets;
  }, [customers]);

  const freqBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: (params: { name: string; value: number }[]) => `${params[0].name}: ${params[0].value} 人` },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'category', data: freqBuckets.map((b) => b.range), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: '用户数', type: 'bar', data: freqBuckets.map((b) => b.count), barWidth: '55%',
      itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: 'rgba(245,158,11,0.2)' }]) },
    }],
  }), [freqBuckets]);

  // Top spenders table
  const topSpenders = useMemo(() => {
    return [...customers]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 15);
  }, [customers]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">客户洞察</h1>
        <span className="text-xs text-gray-500 hidden sm:block">|</span>
        <span className="text-sm text-gray-400 hidden sm:block">客户行为分析</span>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="注册用户" value={totalRegistered} suffix=" 人" color="cyan" loading={loading} />
        <StatCard icon="🟢" label="活跃用户" value={activeUsers} suffix=" 人" color="emerald" loading={loading} />
        <StatCard icon="🔄" label="复购率" value={repeatRate} suffix="%" color="amber" loading={loading} />
        <StatCard icon="📊" label="人均订单" value={avgOrdersPerUser} suffix=" 单" color="purple" loading={loading} />
      </div>

      {/* Charts row: City distribution + Order frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">城市用户分布</h3>
            <span className="text-gray-500 text-xs">按注册城市统计</span>
          </div>
          <ReactECharts option={cityPieOption} theme="dark" style={{ height: '320px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">下单频次分布</h3>
            <span className="text-gray-500 text-xs">按历史订单数分组</span>
          </div>
          <ReactECharts option={freqBarOption} theme="dark" style={{ height: '320px', width: '100%' }} />
        </div>
      </div>

      {/* Top spenders table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">高消费用户 TOP15</h3>
          <span className="text-gray-500 text-xs">按累计消费排序</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">#</th>
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">用户名</th>
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">城市</th>
                <th className="text-right px-3 py-2 text-gray-400 text-xs font-medium">订单数</th>
                <th className="text-right px-3 py-2 text-gray-400 text-xs font-medium">累计消费</th>
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">最近下单</th>
              </tr>
            </thead>
            <tbody>
              {topSpenders.map((c, i) => (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white">{c.name}</td>
                  <td className="px-3 py-2.5 text-gray-400">{c.city}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{c.total_orders}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400 font-medium">¥{c.total_spent.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-gray-500">{c.last_order_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CustomersAnalyticsPage() {
  return <AuthGuard><CustomersContent /></AuthGuard>;
}
