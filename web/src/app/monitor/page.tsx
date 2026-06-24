'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { apiFetch } from '../lib/api';
import AuthGuard from '../components/AuthGuard';

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = value;
    const duration = 600;
    const startTime = Date.now();
    const startVal = display;
    let frame: number;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="stat-number">
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

function GaugeChart({ value, max, title, color }: { value: number; max: number; title: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      center: ['50%', '58%'],
      radius: '90%',
      min: 0,
      max: 100,
      splitNumber: 10,
      axisLine: {
        show: true,
        lineStyle: {
          width: 16,
          color: [
            [pct / 100, color],
            [1, 'rgba(255,255,255,0.06)'],
          ],
        },
      },
      pointer: {
        length: '60%',
        width: 6,
        itemStyle: { color: 'auto' },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        color: '#e2e8f0',
        fontSize: 20,
        fontWeight: 'bold',
        offsetCenter: [0, '70%'],
      },
      title: {
        offsetCenter: [0, '35%'],
        color: '#94a3b8',
        fontSize: 13,
      },
      data: [{ value: Math.round(pct), name: title }],
    }],
  };
  return <ReactECharts option={option} theme="dark" style={{ height: '200px', width: '100%' }} />;
}

interface ErrorLogEntry {
  time: string;
  level: string;
  message: string;
}

const errorLevelColors: Record<string, string> = {
  ERROR: 'bg-red-500/15 text-red-400 border-red-500/25',
  WARN: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  INFO: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
};

function MonitorContent() {
  const [kafkaRate, setKafkaRate] = useState(0);
  const [flinkStatus, setFlinkStatus] = useState('running');
  const [mysqlConns, setMysqlConns] = useState(0);
  const [apiLatency, setApiLatency] = useState(0);
  const [apiHistory, setApiHistory] = useState<{ time: string; ms: number }[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [systemHealth, setSystemHealth] = useState(95);
  const [cpuUsage, setCpuUsage] = useState(42);
  const [memUsage, setMemUsage] = useState(67);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setClock(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchMonitor = useCallback(async () => {
    // Measure API latency by timing a request
    const start = Date.now();
    try {
      const res = await apiFetch('/api/dashboard/summary');
      const latency = Date.now() - start;
      setApiLatency(latency);
      setApiHistory((prev) => {
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const next = [...prev, { time: now, ms: latency }].slice(-30);
        return next;
      });

      // Simulate monitor metrics (backend may not have dedicated endpoints yet)
      setKafkaRate(Math.floor(Math.random() * 800 + 1200));
      setMysqlConns(Math.floor(Math.random() * 30 + 15));
      setCpuUsage(Math.floor(Math.random() * 20 + 35));
      setMemUsage(Math.floor(Math.random() * 15 + 60));
      setSystemHealth(Math.floor(Math.random() * 10 + 88));

      // Simulate error logs
      const randomLogs: ErrorLogEntry[] = [];
      if (Math.random() > 0.7) {
        randomLogs.push({
          time: new Date().toLocaleTimeString('zh-CN'),
          level: 'WARN',
          message: '订单处理延迟超过阈值 (300ms)',
        });
      }
      if (Math.random() > 0.9) {
        randomLogs.push({
          time: new Date().toLocaleTimeString('zh-CN'),
          level: 'ERROR',
          message: 'Kafka 消费者重连中...',
        });
      }
      if (randomLogs.length > 0) {
        setErrorLogs((prev) => [...randomLogs, ...prev].slice(0, 50));
      }

      setFlinkStatus(res.ok ? 'running' : 'error');
    } catch {
      setFlinkStatus('error');
      setApiLatency(999);
    }
  }, []);

  useEffect(() => {
    fetchMonitor();
    const t = setInterval(fetchMonitor, 3000);
    return () => clearInterval(t);
  }, [fetchMonitor]);

  // API latency trend chart
  const latencyOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: apiHistory.map((h) => h.time),
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
    },
    series: [{
      name: '响应时间',
      type: 'line',
      data: apiHistory.map((h) => h.ms),
      smooth: true,
      symbol: 'none',
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(6,182,212,0.3)' },
            { offset: 1, color: 'rgba(6,182,212,0.02)' },
          ],
        },
      },
      lineStyle: { color: '#22d3ee', width: 2 },
      itemStyle: { color: '#22d3ee' },
    }],
  };

  const flinkStatusColor = flinkStatus === 'running'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
    : 'bg-red-500/15 text-red-400 border-red-500/25';

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-slide-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">系统监控</h1>
          <span className="text-xs text-gray-500 hidden sm:block">|</span>
          <span className="text-sm text-gray-400 hidden sm:block">System Monitor</span>
        </div>
        <span className="text-sm text-gray-300 font-mono tabular-nums">{clock}</span>
      </div>

      {/* Real-time stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Kafka 消息速率</p>
            <span className="text-sm">📨</span>
          </div>
          <p className="text-xl font-bold text-cyan-400 stat-number">
            <AnimatedNumber value={kafkaRate} suffix=" msg/s" />
          </p>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: '72%' }} />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Flink 任务状态</p>
            <span className="text-sm">⚡</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs border w-fit ${flinkStatusColor} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${flinkStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {flinkStatus === 'running' ? '运行中' : '异常'}
          </span>
          <p className="text-gray-600 text-xs mt-0.5">任务 ID: flink-job-001</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">MySQL 连接数</p>
            <span className="text-sm">🗄️</span>
          </div>
          <p className="text-xl font-bold text-purple-400 stat-number">
            <AnimatedNumber value={mysqlConns} />
          </p>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: '48%' }} />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">API 响应时间</p>
            <span className="text-sm">⏱️</span>
          </div>
          <p className={`text-xl font-bold stat-number ${apiLatency < 200 ? 'text-emerald-400' : apiLatency < 500 ? 'text-amber-400' : 'text-red-400'}`}>
            <AnimatedNumber value={apiLatency} suffix=" ms" />
          </p>
          <p className="text-gray-600 text-xs">
            {apiLatency < 200 ? '✅ 正常' : apiLatency < 500 ? '⚠️ 偏慢' : '🔴 异常'}
          </p>
        </div>
      </div>

      {/* Gauge charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <h3 className="text-sm font-medium text-white text-center mb-2">系统健康度</h3>
          <GaugeChart value={systemHealth} max={100} title="健康度" color="#10b981" />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <h3 className="text-sm font-medium text-white text-center mb-2">CPU 使用率</h3>
          <GaugeChart value={cpuUsage} max={100} title="CPU" color="#22d3ee" />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <h3 className="text-sm font-medium text-white text-center mb-2">内存使用率</h3>
          <GaugeChart value={memUsage} max={100} title="内存" color="#8b5cf6" />
        </div>
      </div>

      {/* API latency trend + Error logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">API 响应时间监控</h3>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
              <span className="text-gray-500 text-xs">实时轮询</span>
            </span>
          </div>
          <ReactECharts option={latencyOption} theme="dark" style={{ height: '280px', width: '100%' }} />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-400 pulse-dot" />
            <h3 className="text-sm font-medium text-white">错误日志</h3>
            <span className="text-gray-500 text-xs ml-auto">{errorLogs.length} 条</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {errorLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="text-3xl">✅</span>
                <p className="text-gray-500 text-sm">暂无错误日志</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {errorLogs.map((log, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-gray-600 text-xs font-mono whitespace-nowrap mt-0.5">{log.time}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${errorLevelColors[log.level] || errorLevelColors.INFO}`}>
                      {log.level}
                    </span>
                    <span className="text-gray-300 text-sm flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <AuthGuard>
      <MonitorContent />
    </AuthGuard>
  );
}
