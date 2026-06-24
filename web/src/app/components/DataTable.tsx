'use client';

import React from 'react';

interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  onRowClick?: (record: T) => void;
  rowKey?: (record: T) => string | number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/[0.05]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-md skeleton-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow cols={columns.length} />
                <SkeletonRow cols={columns.length} />
                <SkeletonRow cols={columns.length} />
                <SkeletonRow cols={columns.length} />
                <SkeletonRow cols={columns.length} />
              </>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">📭</span>
                    <p className="text-gray-500 text-sm">暂无数据</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record, idx) => (
                <tr
                  key={rowKey ? rowKey(record) : idx}
                  onClick={() => onRowClick?.(record)}
                  className={`border-b border-white/[0.04] transition-all duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-cyan-500/[0.06]' : 'hover:bg-white/[0.02]'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-white">
                      {col.render
                        ? col.render(col.dataIndex ? record[col.dataIndex] : null, record, idx)
                        : col.dataIndex
                          ? (record[col.dataIndex] as React.ReactNode) ?? '-'
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-xs">
            共 {total} 条记录
          </p>
          <select
            value={pageSize}
            onChange={(e) => onPageChange(1)}
            className="px-2 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 focus:outline-none focus:border-cyan-500/30"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} 条/页
              </option>
            ))}
          </select>
        </div>

        {totalPages > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              上一页
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-1 text-gray-600 flex items-end pb-0.5">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                      p === page
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                        : 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
