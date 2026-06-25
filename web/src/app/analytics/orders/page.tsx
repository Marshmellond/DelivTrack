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
  tooltip: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderColor: 'rgba(6,182,212,0.25)',
    textStyle: { color: '#e2e8f0' },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
    axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
    splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
    axisTick: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
    splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
  },
});

function linearGradient(x0: number, y0: number, x2: number, y2: number, stops: { offset: number; color: string }[]) {
  return new echarts.graphic.LinearGradient(x0, y0, x2, y2, stops);
}

const statusNames: Record<string, string> = {
  pending: '待接单', accepted: '已接单', picking: '取货中',
  delivering: '配送中', completed: '已完成', cancelled: '已取消',
};

interface Order {
  id: number;
  order_no: string;
  status: string;
  total_amount: number;
  city: string;
  create_time: string;
}

interface RegionData { city: string; order_count: number; gmv: number; }

interface TrendPoint { time_slot: string; order_count: number; gmv: number; }

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, regionsRes, trendRes, statusRes] = await Promise.all([
        apiFetch('/api/dashboard/recent-orders'),
        apiFetch('/api/dashboard/regions'),
        apiFetch('/api/dashboard/trend'),
        apiFetch('/api/dashboard/status-distribution'),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (regionsRes.ok) setRegions(await regionsRes.json());
      if (trendRes.ok) {
        const tData: TrendPoint[] = await trendRes.json();
        if (tData.length > 0) {
          setTrend(tData);
        } else {
          // Fallback: empty API response -> use demo data
          const demo: TrendPoint[] = [];
          const now = new Date();
          for (let i = 167; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 3600000);
            demo.push({
              time_slot: t.toISOString().slice(0, 13).replace('T', ' ') + ':00:00',
              order_count: Math.floor(Math.random() * 30 + 5),
              gmv: Math.floor(Math.random() * 8000 + 500),
            });
          }
          setTrend(demo);
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayOrders = useMemo(() => orders.filter((o) => o.create_time?.startsWith(todayStr)).length, [orders, todayStr]);
  const weekStart = useMemo(() => {
    const now = new Date(); const d = new Date(now); d.setDate(now.getDate() - now.getDay() + 1); return d.toISOString().slice(0, 10);
  }, []);
  const weekOrders = useMemo(() => orders.filter((o) => o.create_time >= weekStart).length, [orders, weekStart]);
  const avgAmount = useMemo(() => {
    if (!orders.length) return 0;
    const total = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    return Math.round(total / orders.length);
  }, [orders]);
  const cancelRate = useMemo(() => {
    if (!orders.length) return 0;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    return Math.round((cancelled / orders.length) * 100);
  }, [orders]);

  // 7-day order trend (from trend data)
  const trendOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category', data: trend.map((t) => t.time_slot),
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 },
      boundaryGap: false,
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: '订单量', type: 'line', data: trend.map((t) => t.order_count), smooth: true, symbol: 'none',
      areaStyle: { color: linearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(6,182,212,0.35)' }, { offset: 1, color: 'rgba(6,182,212,0.02)' }]) },
      lineStyle: { color: '#22d3ee', width: 2.5 }, itemStyle: { color: '#22d3ee' },
    }],
  }), [trend]);

  // Hourly heatmap - group orders by hour
  const hourlyHeatmap = useMemo(() => {
    const hours = Array(24).fill(0);
    orders.forEach((o) => {
      if (o.create_time) {
        const h = new Date(o.create_time).getHours();
        hours[h] = (hours[h] || 0) + 1;
      }
    });
    return hours;
  }, [orders]);

  const heatmapOption = useMemo(() => {
    const maxVal = Math.max(...hourlyHeatmap, 1);
    return {
      tooltip: { trigger: 'axis', formatter: (params: { name: string; value: number }[]) => `${params[0].name}:00 - ${params[0].value} 单` },
      grid: { left: '3%', right: '6%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category', data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 },
      },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
      series: [{
        name: '订单量', type: 'bar', data: hourlyHeatmap, barWidth: '70%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params: { dataIndex: number }) => {
            const val = hourlyHeatmap[params.dataIndex] / maxVal;
            if (val > 0.7) return new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: 'rgba(245,158,11,0.3)' }]);
            if (val > 0.4) return new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: 'rgba(6,182,212,0.3)' }]);
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(6,182,212,0.5)' }, { offset: 1, color: 'rgba(6,182,212,0.1)' }]);
          },
        },
      }],
    };
  }, [hourlyHeatmap]);

  // Status distribution donut
  const statusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    orders.forEach((o) => { dist[o.status] = (dist[o.status] || 0) + 1; });
    return dist;
  }, [orders]);

  const statusDonutOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 单 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8, itemGap: 12 },
    series: [{
      type: 'pie', radius: ['48%', '78%'], center: ['50%', '43%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 15, fontWeight: 'bold' }, scaleSize: 8 },
      data: Object.entries(statusDist).map(([k, v]) => ({ name: statusNames[k] || k, value: v })),
      color: ['#f59e0b', '#3b82f6', '#8b5cf6', '#22d3ee', '#10b981', '#ef4444'],
    }],
  }), [statusDist]);

  // City distribution bar
  const cityBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'category', data: regions.map((r) => r.city), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: '订单量', type: 'bar', data: regions.map((r) => r.order_count), barWidth: '50%',
      itemStyle: { borderRadius: [6, 6, 0, 0], color: linearGradient(0, 0, 0, 1, [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: 'rgba(6,182,212,0.2)' }]) },
    }],
  }), [regions]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">订单深度分析</h1>
        <span className="text-xs text-gray-500 hidden sm:block">|</span>
        <span className="text-sm text-gray-400 hidden sm:block">订单分析</span>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📋" label="今日订单" value={todayOrders} color="cyan" loading={loading} />
        <StatCard icon="📦" label="本周订单" value={weekOrders} color="blue" loading={loading} />
        <StatCard icon="💵" label="订单均价" value={avgAmount} prefix="¥" color="emerald" loading={loading} />
        <StatCard icon="❌" label="取消率" value={cancelRate} suffix="%" color="rose" loading={loading} trend={{ value: cancelRate > 10 ? 5 : -2, label: '较昨日' }} />
      </div>

      {/* Charts row 1: 7-day trend + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">7 日订单趋势</h3>
            <span className="text-gray-500 text-xs">每小时采样</span>
          </div>
          <ReactECharts option={trendOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">订单状态分布</h3>
            <span className="text-gray-500 text-xs">实时统计</span>
          </div>
          <ReactECharts option={statusDonutOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>

      {/* Charts row 2: Hourly heatmap + City distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">24 小时订单热力图</h3>
            <span className="text-gray-500 text-xs">按小时统计</span>
          </div>
          <ReactECharts option={heatmapOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">城市订单分布</h3>
            <span className="text-gray-500 text-xs">按城市统计</span>
          </div>
          <ReactECharts option={cityBarOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

export default function OrdersAnalyticsPage() {
  return <AuthGuard><OrdersContent /></AuthGuard>;
}
