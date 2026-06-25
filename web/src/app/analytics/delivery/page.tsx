'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import AuthGuard from '../../components/AuthGuard';
import StatCard from '../../components/dashboard/StatCard';
import { apiFetch } from '../../lib/api';

echarts.registerTheme('dark', {
  backgroundColor: 'transparent',
  textStyle: { color: '#94a3b8' },
  title: { textStyle: { color: '#e2e8f0' } },
  legend: { textStyle: { color: '#94a3b8' } },
  tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(6,182,212,0.25)', textStyle: { color: '#e2e8f0' } },
  categoryAxis: { axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
  valueAxis: { axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
  funnel: { itemStyle: { borderColor: '#0a0e27', borderWidth: 2 } },
});

interface Rider {
  id: number;
  name: string;
  status: string;
  phone: string;
  vehicle: string;
}

function DeliveryContent() {
  const [summary, setSummary] = useState<{ rider_online_rate: number; avg_delivery_time: number; rider_online?: number; rider_delivering?: number } | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, ridersRes] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/riders?page=1&page_size=1000'),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (ridersRes.ok) {
        const data = await ridersRes.json();
        setRiders(data.items || data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Rider performance simulation
  const riderPerformance = useMemo(() => {
    return riders.map((r) => ({
      ...r,
      total_deliveries: Math.floor(Math.random() * 500 + 20),
      avg_delivery_min: Math.floor(Math.random() * 25 + 15),
      on_time_rate: Math.floor(Math.random() * 20 + 75),
    }));
  }, [riders]);

  // Delivery time histogram (simulated)
  const deliveryTimeBuckets = useMemo(() => {
    const buckets = [15, 20, 25, 30, 35, 40, 45];
    return buckets.map((m) => ({
      range: `${m}分钟`,
      count: Math.floor(Math.random() * 30 + 5),
    }));
  }, []);

  const histogramOption = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: (params: { name: string; value: number }[]) => `${params[0].name}: ${params[0].value} 单` },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'category', data: deliveryTimeBuckets.map((d) => d.range), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: '配送单数', type: 'bar', data: deliveryTimeBuckets.map((d) => d.count), barWidth: '60%',
      itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: 'rgba(139,92,246,0.2)' }]) },
    }],
  }), [deliveryTimeBuckets]);

  // Rider efficiency ranking (top 10)
  const topRiders = useMemo(() => {
    return [...riderPerformance]
      .sort((a, b) => b.total_deliveries - a.total_deliveries)
      .slice(0, 10);
  }, [riderPerformance]);

  const efficiencyOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '14%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    yAxis: { type: 'category', data: topRiders.map((r) => r.name).reverse(), axisLabel: { color: '#94a3b8', fontSize: 11 }, inverse: true },
    series: [{
      name: '配送单数', type: 'bar',
      data: topRiders.map((_r, i) => ({
        value: topRiders[i]?.total_deliveries ?? 0,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: '#10b981' }]) },
      })),
      label: { show: true, position: 'right', color: '#cbd5e1', fontSize: 11 },
    }],
  }), [topRiders]);

  // Status funnel (simulated delivery flow)
  const funnelData = useMemo(() => {
    const onlineCount = riders.filter((r) => r.status === 'online').length;
    const delivering = summary?.rider_delivering || Math.floor(onlineCount * 0.6);
    const picking = Math.floor(delivering * 0.7);
    const completed = Math.floor(delivering * 0.5);
    return [
      { name: '在线骑手', value: onlineCount },
      { name: '取货中', value: picking },
      { name: '配送中', value: delivering },
      { name: '已完成', value: completed },
    ];
  }, [riders, summary]);

  const funnelOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8, itemGap: 16 },
    series: [{
      type: 'funnel', left: '10%', top: 20, bottom: 60, width: '80%',
      min: 0, max: Math.max(...funnelData.map((d) => d.value), 1), sort: 'none', gap: 2,
      label: { show: true, position: 'inside', formatter: '{b}\n{c} 人', fontSize: 12, color: '#e2e8f0' },
      labelLine: { show: false },
      itemStyle: { borderColor: '#0a0e27', borderWidth: 3 },
      data: funnelData,
      color: ['#22d3ee', '#3b82f6', '#8b5cf6', '#10b981'],
    }],
  }), [funnelData]);

  // Online/offline counts
  const onlineCount = useMemo(() => riders.filter((r) => r.status === 'online').length, [riders]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">配送数据分析</h1>
        <span className="text-xs text-gray-500 hidden sm:block">|</span>
        <span className="text-sm text-gray-400 hidden sm:block">配送分析</span>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🛵" label="在线骑手" value={onlineCount} suffix=" 人" color="cyan" loading={loading} />
        <StatCard icon="📦" label="配送中" value={summary?.rider_delivering || 0} suffix=" 单" color="blue" loading={loading} />
        <StatCard icon="⏱️" label="均配送时长" value={summary?.avg_delivery_time || 0} suffix=" 分钟" color="amber" loading={loading} />
        <StatCard icon="✅" label="准时率" value={Math.round((summary?.rider_online_rate || 0) * 100)} suffix="%" color="emerald" loading={loading} />
      </div>

      {/* Charts row 1: Delivery time histogram + Status funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">配送时长分布</h3>
            <span className="text-gray-500 text-xs">按配送时长统计</span>
          </div>
          <ReactECharts option={histogramOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">配送流程漏斗</h3>
            <span className="text-gray-500 text-xs">在线到完成</span>
          </div>
          <ReactECharts option={funnelOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>

      {/* Charts row 2: Rider efficiency ranking */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">骑手效率排行榜 TOP10</h3>
          <span className="text-gray-500 text-xs">按总配送单数排序</span>
        </div>
        <ReactECharts option={efficiencyOption} theme="dark" style={{ height: '350px', width: '100%' }} />
      </div>
    </div>
  );
}

export default function DeliveryAnalyticsPage() {
  return <AuthGuard><DeliveryContent /></AuthGuard>;
}
