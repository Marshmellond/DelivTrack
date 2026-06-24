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
      setError('数据获取失败，请检查后端连接');
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
