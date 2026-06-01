/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  FileText, 
  Paperclip, 
  X, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  FolderDot,
  Pencil
} from 'lucide-react';
import { Expense, Category, Project, PaymentMethod, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface ExpenseManagerProps {
  expenses: Expense[];
  categories: Category[];
  projects: Project[];
  currentUser: UserProfile | null;
  onSaveExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<{ url: string; name: string }>;
}

export default function ExpenseManager({ 
  expenses, 
  categories, 
  projects, 
  currentUser,
  onSaveExpense, 
  onDeleteExpense,
  onUploadReceipt 
}: ExpenseManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [uploadedReceipt, setUploadedReceipt] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const startEdit = (expense: Expense) => {
    setCategoryId(expense.categoryId);
    setProjectId(expense.projectId || '');
    setAmount(expense.amount.toString());
    setPaymentMethod(expense.paymentMethod);
    setDate(expense.date);
    setDescription(expense.description);
    if (expense.receiptUrl) {
      setUploadedReceipt({ url: expense.receiptUrl, name: expense.receiptName || 'supporting_doc' });
    } else {
      setUploadedReceipt(null);
    }
    setEditingId(expense.id);
    setShowAddForm(true);
  };

  // Check Write Permission
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER].includes(currentUser.role);
  }, [currentUser]);

  // Active Expense Categories
  const activeExpenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' && c.status === 'active');
  }, [categories]);

  // Drag over state
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDropPayload = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadReceiptFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadReceiptFile(files[0]);
    }
  };

  const uploadReceiptFile = async (file: File) => {
    setIsUploading(true);
    setFormError('');
    try {
      const res = await onUploadReceipt(file);
      setUploadedReceipt(res);
    } catch (err) {
      setFormError('Failed to capture document. Try another resolution/format.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeReceipt = () => {
    setUploadedReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Access Denied. Your active role does not permit record insertion.');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a valid expense category.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Amount must be positive values greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const selectedProj = projects.find(p => p.id === projectId);
      const existingExpense = editingId ? expenses.find(e => e.id === editingId) : null;

      const newExpense: Expense = {
        id: editingId || ("exp_" + Date.now() + "_" + Math.floor(Math.random() * 105)),
        categoryId,
        categoryName: selectedCat ? selectedCat.name : 'Other Expense',
        projectId: projectId || undefined,
        projectName: selectedProj ? selectedProj.name : undefined,
        amount: parseFloat(amount),
        paymentMethod,
        date,
        description: description || 'Regular Church Outflow Support',
        receiptUrl: uploadedReceipt?.url,
        receiptName: uploadedReceipt?.name,
        createdBy: existingExpense ? existingExpense.createdBy : (currentUser?.uid || 'anonymous'),
        createdByName: existingExpense ? existingExpense.createdByName : (currentUser?.displayName || 'Unknown Treasurer'),
        createdAt: existingExpense ? existingExpense.createdAt : new Date().toISOString()
      };

      await onSaveExpense(newExpense);

      // Reset
      setCategoryId('');
      setProjectId('');
      setAmount('');
      setPaymentMethod(PaymentMethod.CASH);
      setDate(new Date().toISOString().substring(0, 10));
      setDescription('');
      removeReceipt();
      setEditingId(null);
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredList = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = 
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.projectName && e.projectName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === '' || e.categoryId === filterCategory;
      const matchesProject = filterProject === '' || e.projectId === filterProject;

      return matchesSearch && matchesCategory && matchesProject;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, searchQuery, filterCategory, filterProject]);

  return (
    <div className="space-y-6" id="expense-manager-root">
      {/* Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800" id="expense-view-header">Outflow Voucher Registry (Expenses)</h2>
          <p className="text-xs text-slate-500" id="expense-view-subheader">Authorized expenses, project cost centers, supporting documents, and audit logs</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-trigger-add-expense"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Raise Voucher
          </button>
        )}
      </div>

      {/* Record Expense Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" id="form-record-expense">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Expenditure Voucher' : 'Raise New Expenditure Voucher'}</h3>
            <button 
              onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {formError && (
              <div className="col-span-1 md:col-span-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100 font-medium" id="form-error-banner">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            {/* Left Col inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Expense Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                  required
                >
                  <option value="">-- Choose Budget Allocation Line --</option>
                  {activeExpenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Link with active Church Project (Optional)</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                >
                  <option value="">Independent General Operating Cost</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name} (Budget: {proj.budget.toLocaleString()} Rwf)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Expense Amount (Rwf RWF) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Disbursement Channel *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                  >
                    <option value={PaymentMethod.CASH}>Handheld Petty Cash</option>
                    <option value={PaymentMethod.BANK}>Bank Direct Vault</option>
                    <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Right Col inputs */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Audit Explanation / Vendor notes *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Insert payment recipient address, purpose, check number, or material invoice receipts information..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 h-20 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium resize-none"
                  required
                />
              </div>

              {/* Receipt File upload UI logic */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Uploaded Voucher / Bill / Receipt copy</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropPayload}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    dragOver ? "border-slate-800 bg-slate-50/50" : "border-slate-200 hover:border-slate-400 bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    id="file-expense-receipt-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-slate-500 mt-2">Uploading voucher attachment...</span>
                    </div>
                  ) : uploadedReceipt ? (
                    <div className="flex items-center justify-between bg-slate-105 p-2 rounded-lg border border-slate-200 text-slate-700">
                      <div className="flex items-center gap-1.5 md:max-w-[210px] truncate pr-1">
                        <ImageIcon size={14} />
                        <span className="text-[10px] font-bold truncate">{uploadedReceipt.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeReceipt}
                        className="text-slate-400 hover:text-slate-600 p-0.5 pointer-events-auto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-expense-receipt-upload" className="block cursor-pointer">
                      <Paperclip size={20} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-600 block">Drag & drop voucher here, or <span className="text-slate-850 underline">Browse</span></span>
                      <span className="text-[9px] text-slate-400">PDF, PNG, JPG accepted</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} /> {isSubmitting ? 'Posting...' : (editingId ? 'Save Changes' : 'Write Outflow')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List filters and items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              id="inp-search-expense"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, budget code, linked projects or active categories..."
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-9 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
            />
          </div>

          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 self-start">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none font-semibold px-2 py-1"
            >
              <option value="">All Budgets</option>
              {activeExpenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-200"></div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none font-semibold px-2 py-1 select-filter-project"
            >
              <option value="">All Projects</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left" id="table-expense-transactions">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Cost Center Allocation</th>
                <th className="py-3.5 px-4">Linked Project</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Beneficiary notes</th>
                <th className="py-3.5 px-4">Voucher</th>
                <th className="py-3.5 px-4 text-right">Debit Outflow</th>
                {canWrite && <th className="py-3.5 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                    No operating expenses raised yet matching your constraints.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono">{item.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.categoryName}</td>
                    <td className="py-3 px-4">
                      {item.projectName ? (
                        <span className="flex items-center gap-1 text-[10px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700 font-medium border border-slate-200">
                          <FolderDot size={11} className="text-slate-500" />
                          {item.projectName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General Operations</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{item.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={item.description}>{item.description}</td>
                    <td className="py-3 px-4">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded-lg transition self-start w-fit cursor-pointer"
                        >
                          <FileText size={12} /> View
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-850 font-mono">
                      -{item.amount.toLocaleString('en-US')} Rwf
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-blue-500 hover:text-blue-700 p-1 focus:outline-none cursor-pointer"
                            title="Edit Voucher Entry"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateId(item.id)}
                            className="text-rose-400 hover:text-rose-600 p-1 focus:outline-none cursor-pointer"
                            title="Void Voucher Statement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Void Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-full text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Void Expense Voucher?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you absolutely sure you want to void this expense voucher entry? This action will reverse the payout from double entry records and recalculate balances.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer transition duration-150"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteCandidateId;
                  setDeleteCandidateId(null);
                  await onDeleteExpense(id);
                }}
                className="bg-rose-600 hover:bg-rose-750 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer transition duration-150 flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Void Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
