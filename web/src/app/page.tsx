"use client";

import { useEffect, useState } from "react";

interface SummaryData {
  gmv: number;
  order_count: number;
  avg_order_amount: number;
  update_time: string | null;
}

export default function Home() {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/summary");
        setData(await res.json());
      } catch {
        // API 未就绪时静默忽略
      }
    };
    fetchData();
    const timer = setInterval(fetchData, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">🛵 外卖配送实时监控 POC</h1>

      <div className="grid grid-cols-3 gap-6">
        <Card
          label="累计 GMV"
          value={`¥${(data?.gmv ?? 0).toLocaleString()}`}
          color="text-cyan-400"
        />
        <Card
          label="累计订单量"
          value={`${(data?.order_count ?? 0).toLocaleString()} 单`}
          color="text-emerald-400"
        />
        <Card
          label="均单金额"
          value={`¥${(data?.avg_order_amount ?? 0).toLocaleString()}`}
          color="text-amber-400"
        />
      </div>

      <p className="text-gray-500 text-sm">
        {data?.update_time
          ? `最后更新：${data.update_time}`
          : "等待数据..."}
      </p>
    </div>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-8 text-center w-64 backdrop-blur">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value || "--"}</p>
    </div>
  );
}
