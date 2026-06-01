/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Smartphone, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter,
  Coins,
  Calendar
} from 'lucide-react';
import { Income, Expense, SystemBalances, CashbookEntry, UserRole } from '../types';

interface DashboardProps {
  balances: SystemBalances;
  incomes: Income[];
  expenses: Expense[];
  cashbook: CashbookEntry[];
}

export default function Dashboard({ balances, incomes, expenses, cashbook }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('30');

  // Compute monthly summation trends for the custom SVG high-contrast charts
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    
    const monthlySummaryList = Array.from({ length: 12 }, (_, i) => ({
      month: months[i],
      income: 0,
      expense: 0
    }));

    // Aggregate Incomes
    incomes.forEach(inc => {
      const d = new Date(inc.date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlySummaryList[m].income += inc.amount;
      }
    });

    // Aggregate Expenses
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlySummaryList[m].expense += exp.amount;
      }
    });

    return monthlySummaryList;
  }, [incomes, expenses]);

  // Find max value to auto-scale high-fidelity SVG chart bars
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense, 1000)));
    return Math.ceil(maxVal / 1000) * 1000;
  }, [chartData]);

  // Sums filtered by active time scale
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() - parseInt(timeRange));

    const ins = incomes.filter(i => new Date(i.date) >= limitDate);
    const exs = expenses.filter(e => new Date(e.date) >= limitDate);

    const totalIn = ins.reduce((acc, c) => acc + c.amount, 0);
    const totalOut = exs.reduce((acc, c) => acc + c.amount, 0);

    return {
      incomeSum: totalIn,
      expenseSum: totalOut,
      netSum: totalIn - totalOut
    };
  }, [incomes, expenses, timeRange]);

  const recentEntries = useMemo(() => {
    return [...cashbook].slice(-5).reverse();
  }, [cashbook]);

  return (
    <div className="space-y-6 font-sans" id="dashboard-container">
      {/* Upper Action Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white" id="dash-greeting-title">Financial Treasury Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" id="dash-greeting-subtitle">Unified accounts balance ledger, dynamic cashflow trends, and transaction logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Filter size={14} /> Timescale:
          </span>
          <select 
            id="dash-timescale-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365 font-medium">This Calendar Year</option>
          </select>
        </div>
      </div>

      {/* Primary Financial KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="dash-balance-grid">
        {/* Core Balance Card with Left blue bar border highlight */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-6 shadow-sm border border-slate-800 relative overflow-hidden" id="card-running-balance">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
            <Coins size={180} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Church Treasury</span>
            <Wallet className="text-blue-400 animate-pulse" size={20} />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold tracking-tight" id="lbl-running-balance">
              {balances.total.toLocaleString('en-US')} Rwf
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">Verified Balance</p>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-800 pt-3 text-xs">
            <div className="flex items-center gap-1 text-slate-300">
              <TrendingUp className="text-blue-400" size={14} />
              <span>Collected this period: <strong className="text-white">+{summaryMetrics.incomeSum.toLocaleString()} Rwf</strong></span>
            </div>
          </div>
        </div>

        {/* Bank & Mobile Money Breakdowns (Professional Polish UI) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between" id="card-bank-momo">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 block">Account Allocations</span>
            <div className="space-y-4">
              <div className="flex justify-between items-center" id="row-bank-balance">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Bank Vault Code</h5>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5" id="lbl-bank-balance">{balances.bank.toLocaleString('en-US')} Rwf</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                  {balances.total > 0 ? Math.round((balances.bank / balances.total) * 100) : 0}%
                </span>
              </div>

              <div className="flex justify-between items-center" id="row-momo-balance">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Mobile Money Gateway</h5>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5" id="lbl-momo-balance">{balances.mobileMoney.toLocaleString('en-US')} Rwf</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                  {balances.total > 0 ? Math.round((balances.mobileMoney / balances.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400" id="row-cash-balance">
            <span>Handheld Petty Cash:</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200" id="lbl-cash-balance">{balances.cash.toLocaleString('en-US')} Rwf</span>
          </div>
        </div>

        {/* Selected Timescale Statistics */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-600" id="card-period-statistics">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-4">Run-Rate: {timeRange} Days</span>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Income Recorded
                </span>
                <span className="text-sm font-bold text-slate-855 dark:text-white" id="lbl-period-income">+{summaryMetrics.incomeSum.toLocaleString()} Rwf</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Expenses Disbursed
                </span>
                <span className="text-sm font-bold text-slate-855 dark:text-white" id="lbl-period-expense">-{summaryMetrics.expenseSum.toLocaleString()} Rwf</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Period Net Variance:</span>
            <span className={`text-sm font-extrabold px-2 py-0.5 rounded ${summaryMetrics.netSum >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"}`}>
              {summaryMetrics.netSum >= 0 ? "+" : ""}{summaryMetrics.netSum.toLocaleString()} Rwf
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout (Chart + Recent Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Customized SVG Financial Trend Chart aligned back to Professional theme */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between" id="chart-panel">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Cashflow Analytics</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Church fund collections vs Operations disbursements comparison</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-600 rounded-xs inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-400 rounded-xs inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Expense</span>
                </div>
              </div>
            </div>
 
            {/* Custom Responsive SVG Chart Grid */}
            <div className="w-full h-64 mt-4 relative">
              <svg className="w-full h-full overflow-visible" id="dashboard-svg-chart">
                {/* Horizontal Guide Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 30 + ratio * 180;
                  const value = Math.round(maxChartValue * (1 - ratio));
                  return (
                    <g key={index}>
                      <line x1="45" y1={y} x2="100%" y2={y} stroke="#e2e8f0" strokeWidth="1" className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3,3" />
                      <text x="0" y={y + 4} className="text-[10px] font-bold text-slate-450 dark:text-slate-500 fill-current">
                        {value > 1000 ? `${(value/1000).toFixed(0)}k` : value} Rwf
                      </text>
                    </g>
                  );
                })}

                {/* Draw Columns for each month */}
                {chartData.map((data, idx) => {
                  const colWidth = 40;
                  const gap = 16;
                  const startX = 55 + idx * (colWidth + gap);

                  // Calculate heights
                  const incHeight = (data.income / maxChartValue) * 180;
                  const expHeight = (data.expense / maxChartValue) * 180;

                  // Positions
                  const incY = 210 - incHeight;
                  const expY = 210 - expHeight;

                  return (
                    <g key={idx} className="group cursor-pointer">
                      {/* Income Bar (Left side of slice using theme primary blue) */}
                      <rect 
                        x={startX} 
                        y={incY} 
                        width="14" 
                        height={Math.max(incHeight, 2)} 
                        rx="3" 
                        className="fill-blue-600 hover:fill-blue-700 transition-colors duration-150"
                        title={`Income: ${data.income.toLocaleString()} Rwf`}
                      />
                      {/* Expense Bar (Right side of slice) */}
                      <rect 
                        x={startX + 16} 
                        y={expY} 
                        width="14" 
                        height={Math.max(expHeight, 2)} 
                        rx="3" 
                        className="fill-slate-400 hover:fill-slate-500 dark:fill-slate-600 dark:hover:fill-slate-500 transition-colors duration-150"
                        title={`Expense: ${data.expense.toLocaleString()} Rwf`}
                      />
                      
                      {/* Month Text */}
                      <text 
                        x={startX + 15} 
                        y="230" 
                        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 fill-current text-center" 
                        textAnchor="middle"
                      >
                        {data.month}
                      </text>

                      {/* Tooltip Hover Overlay */}
                      <title>{`${data.month}: +${data.income.toLocaleString()} Rwf | -${data.expense.toLocaleString()} Rwf`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="text-[10.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 font-semibold uppercase tracking-wider">
            <Calendar size={12} /> Realtime analytics tracking year {new Date().getFullYear()}
          </div>
        </div>

        {/* Recent Transactions List with high contrast */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col" id="recent-transactions-panel">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Recent Postings</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit-ready cashbook entries</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1" id="recent-transactions-list">
            {recentEntries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-550 text-xs font-semibold italic">
                No recorded transaction movements yet.
              </div>
            ) : (
              recentEntries.map(entry => {
                const isIncome = entry.type === "income";
                return (
                  <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition duration-150 flex justify-between items-center border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isIncome ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                        {isIncome ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      </div>
                      <div className="max-w-[140px] md:max-w-xs">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate leading-snug">{entry.description}</h5>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono tracking-tight mt-0.5">
                          {entry.date} • {entry.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-extrabold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isIncome ? "+" : "-"}{entry.amount.toLocaleString()} Rwf
                      </span>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter mt-0.5">Bal: {Math.round(entry.balanceAfter).toLocaleString()} Rwf</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
