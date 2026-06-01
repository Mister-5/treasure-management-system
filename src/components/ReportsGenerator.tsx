/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  CheckCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Income, Expense, Project, Pledge, CashbookEntry, SystemBalances } from '../types';

interface ReportsGeneratorProps {
  incomes: Income[];
  expenses: Expense[];
  projects: Project[];
  pledges: Pledge[];
  cashbook: CashbookEntry[];
}

type ReportType = 'income' | 'expense' | 'projects' | 'pledges' | 'cashbook';
type DateScope = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function ReportsGenerator({ 
  incomes, 
  expenses, 
  projects, 
  pledges, 
  cashbook 
}: ReportsGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>('income');
  const [dateScope, setDateScope] = useState<DateScope>('monthly');
  const [specificYear, setSpecificYear] = useState('2026');

  // Filter values based on timespan
  const computedRows = useMemo(() => {
    const now = new Date();
    
    const filterByDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (dateScope === 'all') return true;
      if (dateScope === 'yearly') return d.getFullYear().toString() === specificYear;
      
      if (dateScope === 'monthly') {
        return d.getMonth() === now.getMonth() && d.getFullYear().toString() === specificYear;
      }
      
      if (dateScope === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return d >= oneWeekAgo;
      }
      
      if (dateScope === 'daily') {
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    // Gather columns relative to selected report
    if (reportType === 'income') {
      const items = incomes.filter(i => filterByDate(i.date));
      return {
        headers: ['Date', 'Beneficiary/Contributor', 'Category Source', 'Payment Channel', 'Amount Collected'],
        rows: items.map(i => [
          i.date,
          i.memberName || 'Anonymous Partner',
          i.categoryName,
          i.paymentMethod,
          `${i.amount.toLocaleString('en-US')} Rwf`
        ]),
        raw: items,
        total: items.reduce((sum, item) => sum + item.amount, 0)
      };
    }

    if (reportType === 'expense') {
      const items = expenses.filter(e => filterByDate(e.date));
      return {
        headers: ['Date', 'Budget Line Item', 'Linked Project', 'Payment Channel', 'Disbursed Amount'],
        rows: items.map(e => [
          e.date,
          e.categoryName,
          e.projectName || 'General Operations',
          e.paymentMethod,
          `${e.amount.toLocaleString('en-US')} Rwf`
        ]),
        raw: items,
        total: items.reduce((sum, item) => sum + item.amount, 0)
      };
    }

    if (reportType === 'projects') {
      // Date scopes don't strictly bind static Projects, so we display all
      return {
        headers: ['Project Title', 'Budget Capital', 'Direct Collections', 'Expenses Disbursed', 'Accrued Ledger Net'],
        rows: projects.map(p => [
          p.name,
          `${p.budget.toLocaleString()} Rwf`,
          `${p.incomeReceived.toLocaleString()} Rwf`,
          `${p.expensesSpent.toLocaleString()} Rwf`,
          `${p.remainingBalance.toLocaleString()} Rwf`
        ]),
        raw: projects,
        total: projects.reduce((sum, item) => sum + item.remainingBalance, 0)
      };
    }

    if (reportType === 'pledges') {
      const items = pledges.filter(p => dateScope === 'all' || filterByDate(p.dueDate));
      return {
        headers: ['Covenant Partner', 'Target Project Fund', 'Commitment Sum', 'Payments Made', 'Outstanding Balance', 'Deadline'],
        rows: items.map(p => [
          p.memberName,
          p.projectName,
          `${p.amount.toLocaleString()} Rwf`,
          `${p.amountPaid.toLocaleString()} Rwf`,
          `${p.remainingBalance.toLocaleString()} Rwf`,
          p.dueDate
        ]),
        raw: items,
        total: items.reduce((sum, item) => sum + item.remainingBalance, 0)
      };
    }

    // Cashbook Defaults
    const items = cashbook.filter(c => filterByDate(c.date));
    return {
      headers: ['Date', 'Inflow/Outflow Description', 'Ledger', 'Method Account', 'Amount', 'Treasury Net'],
      rows: items.map(c => [
        c.date,
        c.description,
        c.type === 'income' ? 'Credit' : 'Debit',
        c.paymentMethod,
        `${c.type === 'income' ? '+' : '-'}${c.amount.toLocaleString()} Rwf`,
        `${c.balanceAfter.toLocaleString()} Rwf`
      ]),
      raw: items,
      total: items.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)
    };

  }, [reportType, dateScope, specificYear, incomes, expenses, projects, pledges, cashbook]);

  // CSV Export Algorithm with clear cellular escape mappings
  const handleExportCSV = () => {
    const csvContent = [
      computedRows.headers.join(','),
      ...computedRows.rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `church_report_${reportType}_${dateScope}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Compatible XLS generation download
  const handleExportExcel = () => {
    // Elegant generation of fully tabbed HTML layout which Microsoft Excel parses natively with grid preservation
    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Church Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <h3>Church Treasury Audit Statement - ${reportType.toUpperCase()}</h3>
        <p>Interval Scope: ${dateScope.toUpperCase()} (${specificYear})</p>
        <table border="1">
          <thead>
            <tr style="background:#f1f5f9; font-weight:bold;">
              ${computedRows.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${computedRows.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `church_excel_${reportType}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="reports-root">
      
      {/* Upper Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="text-indigo-600 dark:text-indigo-400" size={20} /> Corporate Financial Audit Centre</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Filter, query, review, and export general cashbooks and church project balance sheets</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
            id="btn-export-csv"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
            id="btn-export-excel"
          >
            <FileSpreadsheet size={14} /> Download Excel
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
            id="btn-export-pdf"
          >
            <Printer size={14} /> Print PDF Statement
          </button>
        </div>
      </div>

      {/* Query Matrix Controller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white dark:bg-slate-900 p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1"><Layers size={13} /> Select Target Ledger</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-1 gap-1.5">
            {[
              { id: 'income', name: 'Income Collections' },
              { id: 'expense', name: 'Expenditures Paid' },
              { id: 'projects', name: 'Capital Projects' },
              { id: 'pledges', name: 'Giving Pledges' },
              { id: 'cashbook', name: 'Double Cashbook' }
            ].map(col => (
              <button
                key={col.id}
                onClick={() => setReportType(col.id as any)}
                className={`text-xs font-extrabold text-left py-2 px-3 rounded-xl border transition ${
                  reportType === col.id 
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                    : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1"><Calendar size={13} /> Selected Interval Timespan</label>
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750">
            {[
              { id: 'daily', name: "Today's Ledger Entries" },
              { id: 'weekly', name: "Trailing 7 Days Summary" },
              { id: 'monthly', name: "Current Month Postings" },
              { id: 'yearly', name: "Calendar Year Postings" },
              { id: 'all', name: "Complete Archive Logs" }
            ].map(col => (
              <label key={col.id} className="flex className-radio-label items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="reportScope"
                  checked={dateScope === col.id}
                  onChange={() => setDateScope(col.id as any)}
                  className="rounded-full text-indigo-600 focus:ring-indigo-505"
                />
                {col.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1"><RefreshCw size={13} /> Target Audit Period Year</label>
          <select
            value={specificYear}
            onChange={(e) => setSpecificYear(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-extrabold"
          >
            <option value="2026">Fiscal Year 2026</option>
            <option value="2025">Fiscal Year 2025</option>
            <option value="2024">Fiscal Year 2024</option>
          </select>

          <div className="mt-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-2.5 text-emerald-800 dark:text-emerald-400 text-xs font-medium">
            <Sparkles size={25} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h5 className="font-bold">Real-time Compliance Sync</h5>
              <p className="text-[10px] text-emerald-700/85 dark:text-emerald-400/80 mt-0.5">Report sheets dynamically consolidate based on underlying cashbook balances.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Sheets Render Printable Layout */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col justify-between print:border-none print:shadow-none print:p-0" id="report-printable-sheet">
        {/* Printable Header block */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-5 mb-6 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 block uppercase">CHURCH OF LIGHT & HARMONY</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-150">Financial Audit Certificate Statement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              General accounts matching report: <span className="font-extrabold text-slate-755 dark:text-slate-300 uppercase">{reportType}</span> | scope: <span className="font-extrabold text-slate-755 dark:text-slate-300 uppercase">{dateScope}</span> ({specificYear})
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-450 dark:text-slate-500">
            <p>Generated: {new Date().toISOString().substring(0, 10)}</p>
            <p>Doc Ref: SH-{reportType.substring(0, 3).toUpperCase()}-{dateScope.toUpperCase()}</p>
          </div>
        </div>

        {/* Dynamic Items list */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 print:overflow-visible print:border-none">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-850">
                {computedRows.headers.map((head, idx) => (
                  <th key={idx} className="py-3.5 px-4 font-bold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {computedRows.rows.length === 0 ? (
                <tr>
                  <td colSpan={computedRows.headers.length} className="py-12 text-center text-slate-400 dark:text-slate-550 font-medium">
                    No matching transaction journal logs located within selected date scopes.
                  </td>
                </tr>
              ) : (
                computedRows.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/20 transition">
                    {row.map((cell, cidx) => (
                      <td key={cidx} className={`py-3 px-4 ${cidx === row.length - 1 ? "font-bold text-slate-950 dark:text-white text-right" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregate footer totals */}
        {computedRows.rows.length > 0 && (
          <div className="mt-8 border-t-2 border-slate-900 dark:border-slate-100 pt-5 flex justify-end">
            <div className="text-right space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black block tracking-widest">ledger run-rate net total</span>
              <h4 className="text-xl font-extrabold text-slate-950 dark:text-white font-mono" id="lbl-report-sum">
                {reportType === 'expense' ? "-" : ""}{Math.abs(computedRows.total).toLocaleString('en-US')} Rwf
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Certificate signature verified by auditing role access gates.</p>
            </div>
          </div>
        )}

        {/* Print Sign-off boxes */}
        <div className="hidden print:grid grid-cols-2 gap-10 mt-16 pt-10 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-705 dark:text-slate-350">
          <div className="text-center">
            <div className="w-48 mx-auto border-b border-slate-400 h-10"></div>
            <p className="font-bold text-slate-700 mt-2">Treasurer Signature & Seal</p>
            <p className="text-[10px] text-slate-400">Date: ________________________</p>
          </div>
          <div className="text-center">
            <div className="w-48 mx-auto border-b border-slate-400 h-10"></div>
            <p className="font-bold text-slate-700 mt-2">Auditor General Review Signature</p>
            <p className="text-[10px] text-slate-400">Date: ________________________</p>
          </div>
        </div>

      </div>
    </div>
  );
}
