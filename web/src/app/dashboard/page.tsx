'use client';

import { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import AuthGuard from '../components/AuthGuard';
import StatCard from '../components/dashboard/StatCard';
import { useDashboardData } from '../components/dashboard/useDashboardData';

// ===== Register ECharts dark theme =====
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
  funnel: {
    itemStyle: { borderColor: '#0a0e27', borderWidth: 2 },
  },
  color: ['#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
});

function linearGradient(
  x0: number, y0: number, x2: number, y2: number,
  stops: { offset: number; color: string }[]
) {
  return new echarts.graphic.LinearGradient(x0, y0, x2, y2, stops);
}

// ===== Category assignment helper =====
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

// ===== Main dashboard content =====
function DashboardContent() {
  const {
    summary,
    regions,
    merchantRank,
    trend,
    recentOrders,
    todayGmv,
    weekGmv,
    loading,
    connected,
    lastUpdate,
  } = useDashboardData();

  const REFRESH_INTERVAL = 5;
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [weatherRisk, setWeatherRisk] = useState<'sunny' | 'rain' | 'storm'>('sunny');
  const [tickerCollapsed, setTickerCollapsed] = useState(false);

  // Weather simulation
  useEffect(() => {
    const risks: ('sunny' | 'rain' | 'storm')[] = ['sunny', 'sunny', 'sunny', 'rain', 'storm'];
    const idx = new Date().getMinutes() % risks.length;
    setWeatherRisk(risks[idx]);
  }, []);

  // Clock state
  const [clock, setClock] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('zh-CN', { hour12: false }));
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_INTERVAL;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ===== Computed data =====

  // Status distribution from recentOrders
  const statusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    recentOrders.forEach((o) => {
      dist[o.status] = (dist[o.status] || 0) + 1;
    });
    return dist;
  }, [recentOrders]);

  // Category pie: assign categories to merchantRank and sum GMV
  const categoryGmvData = useMemo(() => {
    const catMap: Record<string, number> = {};
    merchantRank.forEach((m) => {
      const cat = assignCategory(m.name);
      catMap[cat] = (catMap[cat] || 0) + (m.gmv || 0);
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [merchantRank]);

  // Status funnel: sequential flow pending -> accepted -> picking -> delivering -> completed
  const statusNames: Record<string, string> = {
    pending: '待接单',
    accepted: '已接单',
    picking: '取货中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  };

  const funnelData = useMemo(() => {
    const order = ['pending', 'accepted', 'picking', 'delivering', 'completed'];
    return order
      .map((key) => ({
        name: statusNames[key] || key,
        value: statusDist[key] || 0,
      }))
      .filter((d) => d.value > 0);
  }, [statusDist]);

  // ===== Chart options =====

  const cityBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: regions.map((r) => r.city),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
    },
    series: [
      {
        name: '订单量',
        type: 'bar',
        data: regions.map((r) => r.order_count),
        barWidth: '50%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: linearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#22d3ee' },
            { offset: 1, color: 'rgba(6,182,212,0.2)' },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: linearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: 'rgba(6,182,212,0.4)' },
            ]),
          },
        },
      },
    ],
  }), [regions]);

  const statusDonutOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 单 ({d}%)',
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '78%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 15, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: Object.entries(statusDist).map(([k, v]) => ({
          name: statusNames[k] || k,
          value: v,
        })),
        color: ['#f59e0b', '#3b82f6', '#8b5cf6', '#22d3ee', '#10b981', '#ef4444'],
      },
    ],
  }), [statusDist]);

  const trendOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.time_slot),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
    },
    series: [
      {
        name: 'GMV',
        type: 'line',
        data: trend.map((t) => t.gmv),
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: linearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6,182,212,0.35)' },
            { offset: 1, color: 'rgba(6,182,212,0.02)' },
          ]),
        },
        lineStyle: { color: '#22d3ee', width: 2.5 },
        itemStyle: { color: '#22d3ee' },
      },
    ],
  }), [trend]);

  const categoryPieOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '78%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 15, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: categoryGmvData,
        color: ['#f59e0b', '#22d3ee', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899', '#84cc16'],
      },
    ],
  }), [categoryGmvData]);

  const funnelOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 单',
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 60,
        width: '80%',
        min: 0,
        max: Math.max(...funnelData.map((d) => d.value), 1),
        sort: 'none',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c} 单',
          fontSize: 12,
          color: '#e2e8f0',
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#0a0e27',
          borderWidth: 3,
        },
        data: funnelData,
        color: ['#f59e0b', '#3b82f6', '#8b5cf6', '#22d3ee', '#10b981'],
      },
    ],
  }), [funnelData]);

  const merchantBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '14%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: merchantRank.map((m) => m.name).reverse(),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      inverse: true,
    },
    series: [
      {
        name: '订单量',
        type: 'bar',
        data: merchantRank.map(() => ({
          value: 0,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: linearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#22d3ee' },
              { offset: 1, color: '#10b981' },
            ]),
          },
        })).map((item, i) => ({
          ...item,
          value: merchantRank[i]?.order_count ?? 0,
        })),
        label: {
          show: true,
          position: 'right',
          color: '#cbd5e1',
          fontSize: 11,
        },
      },
    ],
  }), [merchantRank]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
      accepted: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
      picking: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
      delivering: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25 animate-pulse',
      completed: 'bg-green-500/15 text-green-400 border-green-500/25',
      cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>
        {statusNames[status] || status}
      </span>
    );
  };

  const weatherIcons: Record<string, { icon: string; label: string; color: string }> = {
    sunny: { icon: '☀️', label: '天气晴好，配送正常', color: 'text-amber-400' },
    rain: { icon: '🌧️', label: '下雨天气，配送可能延迟 5-10 分钟', color: 'text-blue-400' },
    storm: { icon: '⛈️', label: '暴雨预警！配送可能延迟 15-30 分钟', color: 'text-red-400' },
  };

  const weather = weatherIcons[weatherRisk] || weatherIcons.sunny;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      {/* ===== Row 0: Top bar ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">DelivTrack</h1>
          <span className="text-xs text-gray-500 hidden sm:block">|</span>
          <span className="text-sm text-gray-400 hidden sm:block">实时数据看板</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)] pulse-dot" />
            今日实时
          </span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 font-mono">
            🔄 下次刷新 <span className="text-cyan-400 font-bold">{countdown}</span>s
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-400'} pulse-dot`} />
            <span className="text-xs text-gray-400">{connected ? '已连接' : '连接中...'}</span>
          </div>
          <span className="text-sm text-gray-300 font-mono tabular-nums">{clock}</span>
          <span className="text-xs text-gray-500">
            更新: {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        </div>
      </div>

      {/* Weather indicator */}
      <div className={`bg-white/[0.03] border rounded-2xl backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.08)] ${weatherRisk === 'storm' ? 'border-red-500/20' : weatherRisk === 'rain' ? 'border-blue-500/20' : 'border-white/[0.06]'}`}>
        <span className="text-xl">{weather.icon}</span>
        <span className={`text-sm font-medium ${weather.color}`}>{weather.label}</span>
        {weatherRisk !== 'sunny' && (
          <span className="ml-auto text-xs text-gray-500 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1">
            影响配送时效
          </span>
        )}
      </div>

      {/* ===== Row 1: 6 StatCards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon="📋" label="总订单量"
          value={summary?.total_orders ?? 0}
          color="cyan" loading={loading}
          trend={{ value: 12, label: '较上一小时' }}
        />
        <StatCard
          icon="💰" label="累计 GMV"
          value={summary?.total_gmv ?? 0}
          prefix="¥" color="emerald" loading={loading}
          trend={{ value: 8.5, label: '较上一小时' }}
        />
        <StatCard
          icon="📅" label="今日 GMV"
          value={todayGmv}
          prefix="¥" color="blue" loading={loading}
        />
        <StatCard
          icon="📈" label="本周 GMV"
          value={weekGmv}
          prefix="¥" color="rose" loading={loading}
        />
        <StatCard
          icon="🛵" label="骑手在线率"
          value={Math.round(summary?.rider_online_rate ?? 0)}
          suffix="%" color="amber" loading={loading}
          trend={{ value: 3.2, label: '较昨日' }}
        />
        <StatCard
          icon="⏱️" label="平均配送时长"
          value={summary?.avg_delivery_time ?? 0}
          suffix=" min" color="purple" loading={loading}
          trend={{ value: -3, label: '效率提升' }}
        />
      </div>

      {/* ===== Row 2: City bar (left 2/3) + Status donut (right 1/3) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">全国各城市订单分布</h3>
            <span className="text-gray-500 text-xs">实时统计</span>
          </div>
          <ReactECharts option={cityBarOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">订单状态分布</h3>
            <span className="text-gray-500 text-xs">近30条订单</span>
          </div>
          <ReactECharts option={statusDonutOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>

      {/* ===== Row 3: 24h GMV trend (left 1/2) + Category pie (right 1/2) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">24 小时 GMV 趋势</h3>
            <span className="text-gray-500 text-xs">每分钟采样</span>
          </div>
          <ReactECharts option={trendOption} theme="dark" style={{ height: '280px', width: '100%' }} />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">品类 GMV 分布</h3>
            <span className="text-gray-500 text-xs">按商家分类汇总</span>
          </div>
          <ReactECharts option={categoryPieOption} theme="dark" style={{ height: '280px', width: '100%' }} />
        </div>
      </div>

      {/* ===== Row 4: Status funnel (left 1/2) + Merchant TOP10 (right 1/2) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">订单流转漏斗</h3>
            <span className="text-gray-500 text-xs">待接单→已完成</span>
          </div>
          <ReactECharts option={funnelOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">商家 TOP10</h3>
            <span className="text-gray-500 text-xs">按订单量</span>
          </div>
          <ReactECharts option={merchantBarOption} theme="dark" style={{ height: '300px', width: '100%' }} />
        </div>
      </div>

      {/* ===== Row 5: Live order ticker (collapsible) ===== */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div
          className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={() => setTickerCollapsed(!tickerCollapsed)}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] pulse-dot" />
          <h3 className="text-sm font-medium text-white">实时订单播报</h3>
          <span className="text-gray-500 text-xs">{recentOrders.length} 条记录</span>
          <span className="ml-auto text-gray-500 text-xs transition-transform duration-300" style={{ transform: tickerCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
            ▶
          </span>
        </div>
        {!tickerCollapsed && (
          <div className="overflow-hidden py-3">
            <div className="flex gap-6 animate-marquee whitespace-nowrap">
              {[...recentOrders, ...recentOrders].map((order, idx) => (
                <div
                  key={`${order.order_no}-${idx}`}
                  className="inline-flex items-center gap-3 text-sm bg-white/[0.04] rounded-xl px-4 py-2 border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-default"
                >
                  <span className="text-cyan-400 font-mono text-xs">{order.order_no}</span>
                  <span className="text-gray-300">{order.merchant}</span>
                  <span className="text-emerald-400 font-medium">¥{order.amount}</span>
                  {statusBadge(order.status)}
                  <span className="text-gray-600 text-xs">{order.city}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
