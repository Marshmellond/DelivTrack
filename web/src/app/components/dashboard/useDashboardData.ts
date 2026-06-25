'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

export interface SummaryData {
  total_orders: number;
  total_gmv: number;
  rider_online_rate: number;
  avg_delivery_time: number;
}

export interface RegionData {
  city: string;
  order_count: number;
  gmv: number;
}

export interface MerchantRankData {
  name: string;
  order_count: number;
  gmv: number;
}

export interface TrendPoint {
  time_slot: string;
  order_count: number;
  gmv: number;
}

export interface RecentOrder {
  order_no: string;
  user_id: string;
  merchant: string;
  amount: number;
  status: string;
  city: string;
}

// ---- Fallback demo data ----
function generateFallbackTrend(): TrendPoint[] {
  const now = new Date();
  const trend: TrendPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    const slot = t.toISOString().slice(0, 13).replace('T', ' ') + ':00:00';
    trend.push({
      time_slot: slot,
      order_count: Math.floor(Math.random() * 30 + 5),
      gmv: Math.floor(Math.random() * 8000 + 500),
    });
  }
  return trend;
}

const fallbackRegions: RegionData[] = [
  { city: '北京', order_count: 245, gmv: 45600 },
  { city: '上海', order_count: 312, gmv: 52300 },
  { city: '广州', order_count: 198, gmv: 34800 },
  { city: '深圳', order_count: 267, gmv: 41200 },
  { city: '杭州', order_count: 156, gmv: 28900 },
  { city: '成都', order_count: 134, gmv: 22100 },
];

const fallbackMerchantRank: MerchantRankData[] = [
  { name: '美味餐厅', order_count: 89, gmv: 12500 },
  { name: '麦当劳(朝阳店)', order_count: 76, gmv: 10200 },
  { name: '日式拉面馆', order_count: 65, gmv: 8900 },
  { name: '湘味人家', order_count: 58, gmv: 7600 },
  { name: '茶颜悦色(国贸店)', order_count: 52, gmv: 6400 },
  { name: '烧烤大王', order_count: 45, gmv: 5800 },
  { name: '粤式点心坊', order_count: 38, gmv: 5100 },
  { name: '重庆小面', order_count: 32, gmv: 4200 },
  { name: '炸鸡汉堡王', order_count: 28, gmv: 3600 },
  { name: '鲜芋传奇', order_count: 22, gmv: 2900 },
];

const fallbackRecentOrders: RecentOrder[] = (() => {
  const cities = ['北京', '上海', '广州', '深圳'];
  const merchants = ['美味餐厅', '麦当劳', '日式拉面', '湘味人家', '茶颜悦色'];
  const statuses = ['pending', 'accepted', 'picking', 'delivering', 'completed'];
  const orders: RecentOrder[] = [];
  for (let i = 0; i < 20; i++) {
    orders.push({
      order_no: `ORD${String(Date.now()).slice(-8)}${String(i).padStart(2, '0')}`,
      user_id: `user_${i + 1}`,
      merchant: merchants[i % merchants.length],
      amount: Math.floor(Math.random() * 150 + 20),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      city: cities[i % cities.length],
    });
  }
  return orders;
})();

export function useDashboardData() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [merchantRank, setMerchantRank] = useState<MerchantRankData[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, regionRes, rankRes, trendRes, ordersRes] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/dashboard/regions'),
        apiFetch('/api/dashboard/merchant-rank'),
        apiFetch('/api/dashboard/trend'),
        apiFetch('/api/dashboard/recent-orders'),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (regionRes.ok) setRegions(await regionRes.json());
      if (rankRes.ok) setMerchantRank(await rankRes.json());
      if (trendRes.ok) setTrend(await trendRes.json());

      if (ordersRes.ok) {
        const orders: RecentOrder[] = await ordersRes.json();
        setRecentOrders(orders.slice(0, 30));
      }

      setConnected(true);
      setError(null);
      setLastUpdate(new Date());
    } catch {
      setConnected(false);
      setError('数据获取失败，已加载演示数据');
      // Fallback: use demo data so charts are never empty
      setSummary({ total_orders: 482, total_gmv: 75200, rider_online_rate: 87, avg_delivery_time: 28 });
      setRegions(fallbackRegions);
      setMerchantRank(fallbackMerchantRank);
      setTrend(generateFallbackTrend());
      setRecentOrders(fallbackRecentOrders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 5000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  // Compute today's GMV from trend data
  const todayGmv = useMemo(() => {
    if (!trend.length) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return trend
      .filter((t) => t.time_slot?.startsWith(today))
      .reduce((sum, t) => sum + (t.gmv || 0), 0);
  }, [trend]);

  // Compute this week's GMV from trend data
  const weekGmv = useMemo(() => {
    if (!trend.length) return 0;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const mondayStr = monday.toISOString().slice(0, 10);
    return trend
      .filter((t) => t.time_slot >= mondayStr)
      .reduce((sum, t) => sum + (t.gmv || 0), 0);
  }, [trend]);

  return {
    summary,
    regions,
    merchantRank,
    trend,
    recentOrders,
    todayGmv,
    weekGmv,
    loading,
    error,
    connected,
    lastUpdate,
    refetch: fetchAll,
  };
}
