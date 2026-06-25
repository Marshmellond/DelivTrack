'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Toast';

interface Order {
  id: number;
  order_no: string;
  user_id: string;
  merchant: string;
  amount: number;
  status: string;
  city: string;
  create_time: string;
  items?: { name: string; quantity: number; price: number }[];
  delivery_log?: { time: string; status: string; remark?: string }[];
}

const statusNames: Record<string, string> = {
  created: '已创建',
  pending: '待接单',
  accepted: '已接单',
  picking: '取货中',
  delivering: '配送中',
  completed: '已完成',
  delivered: '已送达',
  cancelled: '已取消',
};

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [orderNoFilter, setOrderNoFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ---- NEW filters ----
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState<number | ''>('');
  const [amountMax, setAmountMax] = useState<number | ''>('');

  const pageSize = 20;
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());
      if (statusFilter) params.set('status', statusFilter);
      if (cityFilter) params.set('city', cityFilter);
      if (orderNoFilter) params.set('order_no', orderNoFilter);

      const res = await apiFetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || data);
        setTotal(data.total || (data.items || data).length);
        setAllOrders(data.items || data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, cityFilter, orderNoFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---- NEW: client-side filtering ----
  const filteredOrders = useMemo(() => {
    let result = allOrders;
    if (dateFrom) {
      result = result.filter((o) => o.create_time >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((o) => o.create_time <= dateTo + 'T23:59:59');
    }
    if (amountMin !== '') {
      result = result.filter((o) => o.amount >= (amountMin as number));
    }
    if (amountMax !== '') {
      result = result.filter((o) => o.amount <= (amountMax as number));
    }
    return result;
  }, [allOrders, dateFrom, dateTo, amountMin, amountMax]);

  // ---- NEW: batch status counts ----
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  // ---- NEW: total amount ----
  const totalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.amount, 0);
  }, [filteredOrders]);

  // ---- NEW: Export CSV ----
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast('没有可导出的数据', 'error');
      return;
    }
    const headers = ['订单编号', '用户', '商家', '金额', '状态', '城市', '创建时间'];
    const rows = filteredOrders.map((o) => [
      o.order_no,
      o.user_id,
      o.merchant,
      o.amount.toString(),
      statusNames[o.status] || o.status,
      o.city,
      o.create_time ? new Date(o.create_time).toLocaleString('zh-CN') : '-',
    ]);
    const BOM = '﻿';
    const csvContent = BOM + [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('CSV 导出成功', 'success');
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      created: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
      pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
      accepted: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
      picking: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
      delivering: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
      completed: 'bg-green-500/15 text-green-400 border-green-500/25',
      delivered: 'bg-green-500/15 text-green-400 border-green-500/25',
      cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
    };
    const isActive = ['picking', 'delivering'].includes(status);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'} ${isActive ? 'animate-pulse' : ''}`}>
        {isActive && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 align-middle" />
        )}
        {statusNames[status] || status}
      </span>
    );
  };

  const columns = [
    { key: 'order_no', title: '订单编号', dataIndex: 'order_no' as const },
    { key: 'user_id', title: '用户', dataIndex: 'user_id' as const },
    { key: 'merchant', title: '商家', dataIndex: 'merchant' as const },
    {
      key: 'amount',
      title: '金额',
      dataIndex: 'amount' as const,
      render: (val: unknown) => `¥${(val as number)?.toLocaleString() ?? '0'}`,
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status' as const,
      render: (val: unknown) => statusBadge(val as string),
    },
    { key: 'city', title: '城市', dataIndex: 'city' as const },
    {
      key: 'create_time',
      title: '创建时间',
      dataIndex: 'create_time' as const,
      render: (val: unknown) =>
        val ? new Date(val as string).toLocaleString('zh-CN') : '-',
    },
  ];

  const statusColorMap: Record<string, string> = {
    created: 'bg-gray-500/80',
    pending: 'bg-yellow-500/80',
    accepted: 'bg-blue-500/80',
    picking: 'bg-purple-500/80',
    delivering: 'bg-cyan-500/80',
    completed: 'bg-green-500/80',
    delivered: 'bg-green-500/80',
    cancelled: 'bg-red-500/80',
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white">订单管理</h2>
          {/* ---- NEW: Export CSV button ---- */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm hover:from-emerald-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-200 flex items-center gap-2"
          >
            <span>📥</span> 导出 CSV
          </button>
        </div>

        {/* ---- NEW: Batch status indicator ---- */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {Object.entries(statusNames).map(([key, label]) => {
            const count = statusCounts[key] || 0;
            if (count === 0) return null;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColorMap[key] || 'bg-gray-500/80'} text-white`}
              >
                {label}: {count}
              </span>
            );
          })}
          {Object.values(statusCounts).every((v) => v === 0) && (
            <span className="text-gray-500 text-xs">暂无数据</span>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
          >
            <option value="">全部状态</option>
            {Object.entries(statusNames).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="城市筛选..."
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-32"
          />
          <input
            type="text"
            placeholder="订单编号..."
            value={orderNoFilter}
            onChange={(e) => {
              setOrderNoFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-44"
          />
          {/* ---- NEW: Date range filter ---- */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all w-36 [color-scheme:dark]"
            />
            <span className="text-gray-600 text-xs">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all w-36 [color-scheme:dark]"
            />
          </div>
          {/* ---- NEW: Amount range filter ---- */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">¥</span>
            <input
              type="number"
              placeholder="最低金额"
              value={amountMin === '' ? '' : amountMin}
              onChange={(e) => { setAmountMin(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-28"
            />
            <span className="text-gray-600 text-xs">-</span>
            <input
              type="number"
              placeholder="最高金额"
              value={amountMax === '' ? '' : amountMax}
              onChange={(e) => { setAmountMax(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-28"
            />
          </div>
          <button
            onClick={() => {
              setStatusFilter('');
              setCityFilter('');
              setOrderNoFilter('');
              setDateFrom('');
              setDateTo('');
              setAmountMin('');
              setAmountMax('');
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] transition-all duration-200"
          >
            清除筛选
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filteredOrders as unknown as Record<string, unknown>[]}
          total={filteredOrders.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          onRowClick={(record) => setSelectedOrder(record as unknown as Order)}
          rowKey={(record) => String(record.id)}
        />

        {/* ---- NEW: Total amount footer row ---- */}
        <div className="mt-3 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
          <span className="text-gray-400 text-sm">筛选结果合计</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-xs">{filteredOrders.length} 条订单</span>
            <span className="text-emerald-400 font-bold text-lg">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="relative bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-[0_0_40px_rgba(6,182,212,0.1)] modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">订单详情</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">订单编号</span>
                <span className="text-cyan-400 font-mono">{selectedOrder.order_no}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">用户</span>
                <span className="text-white">{selectedOrder.user_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">商家</span>
                <span className="text-white">{selectedOrder.merchant}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">金额</span>
                <span className="text-emerald-400 font-medium">¥{selectedOrder.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">状态</span>
                {statusBadge(selectedOrder.status)}
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-gray-400">城市</span>
                <span className="text-white">{selectedOrder.city}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">创建时间</span>
                <span className="text-white">
                  {selectedOrder.create_time
                    ? new Date(selectedOrder.create_time).toLocaleString('zh-CN')
                    : '-'}
                </span>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.08]">
                  <h4 className="text-gray-400 text-sm mb-3">订单商品</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-white">{item.name} <span className="text-gray-500">x{item.quantity}</span></span>
                        <span className="text-gray-400">¥{item.price?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.delivery_log && selectedOrder.delivery_log.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.08]">
                  <h4 className="text-gray-400 text-sm mb-3">配送轨迹</h4>
                  <div className="space-y-3">
                    {selectedOrder.delivery_log.map((log, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <span className="text-gray-600 whitespace-nowrap text-xs mt-0.5">
                          {new Date(log.time).toLocaleString('zh-CN')}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-white">
                            {statusNames[log.status] || log.status}
                          </span>
                          {log.remark && (
                            <span className="text-gray-500 text-xs">{log.remark}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard adminOnly>
      <OrdersContent />
    </AuthGuard>
  );
}
