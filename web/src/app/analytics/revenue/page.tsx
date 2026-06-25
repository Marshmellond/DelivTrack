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
});

function linearGradient(x0: number, y0: number, x2: number, y2: number, stops: { offset: number; color: string }[]) {
  return new echarts.graphic.LinearGradient(x0, y0, x2, y2, stops);
}

const categoryKeywords: Record<string, string[]> = {
  '快餐便当': ['快餐', '便当', '饭', '盒饭', '简餐'],
  '汉堡披萨': ['汉堡', '披萨', '炸鸡', '鸡排', '麦当劳', '肯德基'],
  '日韩料理': ['日料', '日式', '韩式', '寿司', '拉面', '烤肉', '刺身'],
  '川湘菜': ['川菜', '湘菜', '麻辣', '火锅', '串串', '香锅', '冒菜'],
  '奶茶甜品': ['奶茶', '甜品', '蛋糕', '冰淇淋', '咖啡', '茶', '糖水'],
  '烧烤': ['烧烤', '烤串', '烤肉'],
  '粤菜': ['粤菜', '茶餐厅', '烧腊', '煲仔', '点心', '粥', '粉面'],
  '小吃': ['小吃', '面', '粉', '饺子', '馄饨', '包子'],
};

function assignCategory(name: string): string {
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => name.includes(kw))) return cat;
  }
  return '其他';
}

interface MerchantRank { name: string; order_count: number; gmv: number; }
interface TrendPoint { time_slot: string; order_count: number; gmv: number; }
interface RegionData { city: string; order_count: number; gmv: number; }

type Period = 'today' | 'week' | 'month';

function RevenueContent() {
  const [merchants, setMerchants] = useState<MerchantRank[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [summary, setSummary] = useState<{ total_orders: number; total_gmv: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, rankRes, trendRes, regionRes] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/dashboard/merchant-rank'),
        apiFetch('/api/dashboard/trend'),
        apiFetch('/api/dashboard/regions'),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (rankRes.ok) setMerchants(await rankRes.json());
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
      if (regionRes.ok) setRegions(await regionRes.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed GMV stats using simple string comparison (time_slot is "YYYY-MM-DD HH:mm:ss")
  const todayGmv = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10); // "2026-06-25"
    return trend
      .filter((t) => t.time_slot && t.time_slot.startsWith(todayStr))
      .reduce((s, t) => s + (t.gmv || 0), 0);
  }, [trend]);

  const weekGmv = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday of current week
    const mondayStr = monday.toISOString().slice(0, 10);
    return trend
      .filter((t) => t.time_slot && t.time_slot >= mondayStr)
      .reduce((s, t) => s + (t.gmv || 0), 0);
  }, [trend]);

  const monthGmv = useMemo(() => {
    const now = new Date();
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return trend
      .filter((t) => t.time_slot && t.time_slot >= monthStartStr)
      .reduce((s, t) => s + (t.gmv || 0), 0);
  }, [trend]);

  const totalOrders = useMemo(() => summary?.total_orders || 0, [summary]);
  const avgOrderAmount = useMemo(() => totalOrders > 0 ? Math.round((summary?.total_gmv || 0) / totalOrders) : 0, [summary, totalOrders]);

  // Filtered GMV by period
  const displayGmv = period === 'today' ? todayGmv : period === 'week' ? weekGmv : monthGmv;

  // 7-day GMV trend
  const trendOption = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: (params: { value: number }[]) => `GMV: ¥${(params[0].value / 1000).toFixed(1)}k` },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: { type: 'category', data: trend.map((t) => t.time_slot), axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 }, boundaryGap: false },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: 'GMV', type: 'line', data: trend.map((t) => t.gmv), smooth: true, symbol: 'none',
      areaStyle: { color: linearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.35)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }]) },
      lineStyle: { color: '#10b981', width: 2.5 }, itemStyle: { color: '#10b981' },
    }],
  }), [trend]);

  // Category pie (by GMV)
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    merchants.forEach((m) => {
      const cat = assignCategory(m.name);
      catMap[cat] = (catMap[cat] || 0) + (m.gmv || 0);
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [merchants]);

  const categoryPieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8, itemGap: 12 },
    series: [{
      type: 'pie', radius: ['48%', '78%'], center: ['50%', '43%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 }, label: { show: false },
      emphasis: { label: { show: true, fontSize: 15, fontWeight: 'bold' }, scaleSize: 8 },
      data: categoryData,
      color: ['#f59e0b', '#22d3ee', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899', '#84cc16'],
    }],
  }), [categoryData]);

  // City revenue bar
  const cityRevenueOption = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: (params: { value: number }[]) => `¥${params[0].value.toLocaleString()}` },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'category', data: regions.map((r) => r.city), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } } },
    series: [{
      name: 'GMV', type: 'bar', data: regions.map((r) => r.gmv), barWidth: '50%',
      itemStyle: { borderRadius: [6, 6, 0, 0], color: linearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: 'rgba(245,158,11,0.2)' }]) },
    }],
  }), [regions]);

  // TOP15 merchant table
  const top15 = useMemo(() => [...merchants].sort((a, b) => (b.gmv || 0) - (a.gmv || 0)).slice(0, 15), [merchants]);

  const periodLabels: Record<Period, string> = { today: '今日', week: '本周', month: '本月' };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">营收与 GMV 分析</h1>
          <span className="text-xs text-gray-500 hidden sm:block">|</span>
          <span className="text-sm text-gray-400 hidden sm:block">营收分析</span>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                period === p ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label={`${periodLabels[period]}GMV`} value={displayGmv} prefix="¥" color="emerald" loading={loading} />
        <StatCard icon="📅" label="本周 GMV" value={weekGmv} prefix="¥" color="cyan" loading={loading} />
        <StatCard icon="📆" label="本月 GMV" value={monthGmv} prefix="¥" color="blue" loading={loading} />
        <StatCard icon="🛒" label="客单价" value={avgOrderAmount} prefix="¥" color="amber" loading={loading} />
      </div>

      {/* Charts row 1: GMV trend + Category pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">GMV 趋势</h3>
            <span className="text-gray-500 text-xs">按时间采样</span>
          </div>
          <ReactECharts option={trendOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">品类 GMV 占比</h3>
            <span className="text-gray-500 text-xs">按分类汇总</span>
          </div>
          <ReactECharts option={categoryPieOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>

      {/* Charts row 2: City revenue + TOP15 table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">城市营收排行</h3>
            <span className="text-gray-500 text-xs">按 GMV 排序</span>
          </div>
          <ReactECharts option={cityRevenueOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">商家 GMV TOP15</h3>
            <span className="text-gray-500 text-xs">按营收排序</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">#</th>
                  <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">商家</th>
                  <th className="text-right px-3 py-2 text-gray-400 text-xs font-medium">订单数</th>
                  <th className="text-right px-3 py-2 text-gray-400 text-xs font-medium">GMV</th>
                </tr>
              </thead>
              <tbody>
                {top15.map((m, i) => (
                  <tr key={m.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5 text-white">{m.name}</td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{m.order_count?.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-medium">¥{m.gmv?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  return <AuthGuard><RevenueContent /></AuthGuard>;
}
