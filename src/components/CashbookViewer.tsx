/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Building, 
  Smartphone, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Filter
} from 'lucide-react';
import { CashbookEntry, SystemBalances, PaymentMethod } from '../types';

interface CashbookViewerProps {
  cashbook: CashbookEntry[];
  balances: SystemBalances;
}

export default function CashbookViewer({ cashbook, balances }: CashbookViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('');

  const filteredEntries = useMemo(() => {
    return cashbook.filter(entry => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = entry.description.toLowerCase().includes(q) || 
                            entry.createdBy.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesMethod = methodFilter === '' || entry.paymentMethod === methodFilter;

      return matchesSearch && matchesType && matchesMethod;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [cashbook, searchQuery, typeFilter, methodFilter]);

  return (
    <div className="space-y-6 font-sans" id="cashbook-root">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="text-blue-600" size={18} /> Unified General Cashbook Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" id="cashbook-view-sub">Standard double-entry digital cashbook auditing vault with automatic chronological balance offsets</p>
        </div>
      </div>

      {/* Account balance pill meters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="cashbook-balances-row">
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-5 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Total Treasury Consolidated</span>
            <h4 className="text-lg font-extrabold tracking-tight font-mono mt-1" id="lbl-cashbook-total">
              {balances.total.toLocaleString('en-US')} Rwf
            </h4>
          </div>
          <div className="p-2 bg-slate-800 text-blue-400 rounded-lg">
            <Wallet size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">Bank Direct Vault</span>
            <h4 className="text-base font-extrabold text-slate-850 dark:text-slate-100 font-mono mt-1" id="lbl-cashbook-bank">
              {balances.bank.toLocaleString('en-US')} Rwf
            </h4>
          </div>
          <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg">
            <Building size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">Mobile Money Purse</span>
            <h4 className="text-base font-extrabold text-slate-855 dark:text-slate-100 font-mono mt-1" id="lbl-cashbook-momo">
              {balances.mobileMoney.toLocaleString('en-US')} Rwf
            </h4>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <Smartphone size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">General Petty Cashbox</span>
            <h4 className="text-base font-extrabold text-slate-855 dark:text-slate-100 font-mono mt-1" id="lbl-cashbook-cash">
              {balances.cash.toLocaleString('en-US')} Rwf
            </h4>
          </div>
          <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-lg">
            <CalendarDays size={16} />
          </div>
        </div>
      </div>

      {/* Grid ledger review with filtering capabilities */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              id="inp-search-cashbook"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ledger descriptions, transaction keys, or author signatures..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-9 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="flex bg-slate-50 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-700 gap-1 self-start">
            <div className="flex items-center gap-1.5 px-2">
              <Filter size={13} className="text-slate-400" />
            </div>
            
            <button
              onClick={() => setTypeFilter('all')}
              className={`text-[11px] font-bold py-1 px-3 roundedTransition rounded-md transition duration-150 cursor-pointer ${
                typeFilter === 'all' ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`text-[11px] font-bold py-1 px-3 rounded-md transition duration-150 cursor-pointer ${
                typeFilter === 'income' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-450 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              }`}
            >
              Credits
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`text-[11px] font-bold py-1 px-3 rounded-md transition duration-150 cursor-pointer ${
                typeFilter === 'expense' ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-450 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Debits
            </button>
            
            <div className="w-[1px] bg-slate-200 dark:bg-slate-750 my-1"></div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-[11px] bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none font-bold px-2 select-method-filter cursor-pointer"
            >
              <option value="">All Accounts</option>
              {Object.values(PaymentMethod).map(m => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger items */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left" id="table-cashbook-ledger">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 font-mono">Date</th>
                <th className="py-3.5 px-4">Ledger Code Reference</th>
                <th className="py-3.5 px-4">Description of entry</th>
                <th className="py-3.5 px-4">Financial Channel</th>
                <th className="py-3.5 px-4 text-right">Debit (-)</th>
                <th className="py-3.5 px-4 text-right">Credit (+)</th>
                <th className="py-3.5 px-4 text-right">Running Net Treasury Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No cashbook transaction entries available for the current query filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(item => {
                  const isIncome = item.type === "income";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors duration-100">
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{item.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 uppercase font-mono">{item.referenceId.substring(0, 12)}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.paymentMethod === PaymentMethod.BANK ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/30" :
                          item.paymentMethod === PaymentMethod.MOBILE_MONEY ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30" :
                          "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/30"
                        }`}>
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">
                        {!isIncome ? `-${item.amount.toLocaleString()} Rwf` : <span className="text-slate-300 dark:text-slate-700">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {isIncome ? `+${item.amount.toLocaleString()} Rwf` : <span className="text-slate-300 dark:text-slate-700">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                        {item.balanceAfter.toLocaleString('en-US')} Rwf
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
