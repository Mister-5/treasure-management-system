/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  FileText, 
  Paperclip, 
  X, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { Income, Category, Member, PaymentMethod, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface IncomeManagerProps {
  incomes: Income[];
  categories: Category[];
  members: Member[];
  currentUser: UserProfile | null;
  onSaveIncome: (income: Income) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<{ url: string; name: string }>;
}

export default function IncomeManager({ 
  incomes, 
  categories, 
  members, 
  currentUser,
  onSaveIncome, 
  onDeleteIncome,
  onUploadReceipt 
}: IncomeManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const startEdit = (income: Income) => {
    setCategoryId(income.categoryId);
    setMemberId(income.memberId || '');
    setAmount(income.amount.toString());
    setPaymentMethod(income.paymentMethod);
    setDate(income.date);
    setDescription(income.description);
    if (income.receiptUrl) {
      setUploadedReceipt({ url: income.receiptUrl, name: income.receiptName || 'supporting_doc' });
    } else {
      setUploadedReceipt(null);
    }
    setEditingId(income.id);
    setShowAddForm(true);
  };

  // Check Write Permission
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER].includes(currentUser.role);
  }, [currentUser]);

  // Active Income Categories
  const activeIncomeCategories = useMemo(() => {
    return categories.filter(c => c.type === 'income' && c.status === 'active');
  }, [categories]);

  // Handle Drag-and-Drop Receipt
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
      setReceiptFile(file);
    } catch (err) {
      setFormError('Failed to capture document. Try another resolution/format.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setUploadedReceipt(null);
  };

  // Submit Income Entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Access Denied. Your active role does not permit record insertion.');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a valid income category.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Amount must be positive values greater than zero.');
      return;
    }
    if (!date) {
      setFormError('Please input a valid date.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const selectedMem = members.find(m => m.id === memberId);
      const existingIncome = editingId ? incomes.find(i => i.id === editingId) : null;

      const newIncome: Income = {
        id: editingId || ("inc_" + Date.now() + "_" + Math.floor(Math.random() * 105)),
        categoryId,
        categoryName: selectedCat ? selectedCat.name : 'Other Income',
        memberId: memberId || undefined,
        memberName: selectedMem ? selectedMem.fullName : undefined,
        amount: parseFloat(amount),
        paymentMethod,
        date,
        description: description || 'Regular Contribution',
        receiptUrl: uploadedReceipt?.url,
        receiptName: uploadedReceipt?.name,
        createdBy: existingIncome ? existingIncome.createdBy : (currentUser?.uid || 'anonymous'),
        createdByName: existingIncome ? existingIncome.createdByName : (currentUser?.displayName || 'Unknown Treasurer'),
        createdAt: existingIncome ? existingIncome.createdAt : new Date().toISOString()
      };

      await onSaveIncome(newIncome);

      // Reset Form State
      setCategoryId('');
      setMemberId('');
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

  // Filtering & Sorting List
  const filteredList = useMemo(() => {
    return incomes.filter(i => {
      const matchesSearch = 
        i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.memberName && i.memberName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === '' || i.categoryId === filterCategory;
      const matchesPayment = filterPayment === '' || i.paymentMethod === filterPayment;

      return matchesSearch && matchesCategory && matchesPayment;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, searchQuery, filterCategory, filterPayment]);

  return (
    <div className="space-y-6 font-sans" id="income-manager-root">
      {/* Title & Action Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h2 id="income-view-title" className="text-lg font-bold text-slate-900 dark:text-white">Income Ledger Management</h2>
          <p id="income-view-subtitle" className="text-xs text-slate-500 dark:text-slate-400 mt-1">Log tithes, offerings, fundraising drives, and other corporate financial inflows</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-trigger-add-income"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Record Income
          </button>
        )}
      </div>

      {/* Record Income Slide-In Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-6 space-y-4" id="form-record-income">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Income Transaction' : 'Record New Income Flow'}</h3>
            <button 
              onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {formError && (
              <div className="col-span-1 md:col-span-2 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2 border border-rose-100 dark:border-rose-900/30 font-medium animate-fade-in" id="form-error-banner">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            {/* Left Hand inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Financial Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                >
                  <option value="" className="bg-white dark:bg-slate-900">-- Choose Income Source Category --</option>
                  {activeIncomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900">{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Contributing Member (Optional)</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="" className="bg-white dark:bg-slate-900">Anonymous Contribution (Non-Registered or Guest)</option>
                  {members.map(mem => (
                    <option key={mem.id} value={mem.id} className="bg-white dark:bg-slate-900">{mem.fullName} ({mem.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Amount (Rwf RWF) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Inflow Channel *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value={PaymentMethod.CASH} className="bg-white dark:bg-slate-900">Handheld Petty Cash</option>
                    <option value={PaymentMethod.BANK} className="bg-white dark:bg-slate-900">Bank Direct Vault</option>
                    <option value={PaymentMethod.MOBILE_MONEY} className="bg-white dark:bg-slate-900">Mobile Money Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Valuation Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Right Hand inputs & File Drag Section */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Audit Explanation / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Insert auxiliary bank code details, check numbers, or memorial descriptions..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
              </div>

              {/* Upload Section - Satisfies Touch vs Drag Requirements */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Receipt / Invoice supporting documentation</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropPayload}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
                    dragOver ? "border-blue-500 bg-blue-50/20" : "border-slate-200 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-550 bg-slate-50 dark:bg-slate-850"
                  }`}
                >
                  <input
                    type="file"
                    id="file-receipt-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Uploading receipt attachment...</span>
                    </div>
                  ) : uploadedReceipt ? (
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-1.5 md:max-w-[210px] truncate pr-1">
                        <ImageIcon size={14} />
                        <span className="text-[10px] font-bold truncate">{uploadedReceipt.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeReceipt}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-receipt-upload" className="block cursor-pointer">
                      <Paperclip size={20} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">Drag & drop receipt here, or <span className="text-blue-600 dark:text-blue-400">Browse</span></span>
                      <span className="text-[9px] text-slate-450 dark:text-slate-500">PDF, PNG, JPG accepted (Stored Securely)</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} /> {isSubmitting ? 'Posting...' : (editingId ? 'Save Changes' : 'Post & Disburse')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Advanced Filtering, Searching and list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              id="inp-search-income"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search donor description, category name, or member list..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 px-9 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="flex bg-slate-50 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-700 gap-1 self-start">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none font-semibold px-2 py-1 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900">All Categories</option>
              {activeIncomeCategories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900">{cat.name}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none font-semibold px-2 py-1 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900">All Methods</option>
              {Object.values(PaymentMethod).map(method => (
                <option key={method} value={method} className="bg-white dark:bg-slate-900">{method}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left" id="table-income-transactions">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Contributor</th>
                <th className="py-3.5 px-4">Revenue Category</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Explanation</th>
                <th className="py-3.5 px-4">Receipt</th>
                <th className="py-3.5 px-4 text-right">Inflow Amount</th>
                {canWrite && <th className="py-3.5 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No matching income records matching your filter parameters.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors duration-100">
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 date-cell">{item.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {item.memberName ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block"></span>
                          {item.memberName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Anonymous Member</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">{item.categoryName}</td>
                    <td className="py-3 px-4 font-semibold text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.paymentMethod === PaymentMethod.BANK ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/30" :
                        item.paymentMethod === PaymentMethod.MOBILE_MONEY ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30" :
                        "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/30"
                      }`}>
                        {item.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={item.description}>{item.description}</td>
                    <td className="py-3 px-4">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded transition self-start w-fit cursor-pointer"
                        >
                          <FileText size={12} /> View
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{item.amount.toLocaleString('en-US')} Rwf
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                             onClick={() => startEdit(item)}
                             className="text-blue-500 hover:text-blue-700 p-1 focus:outline-none cursor-pointer"
                             title="Edit Income Entry"
                          >
                             <Pencil size={14} />
                          </button>
                          <button
                             onClick={() => setDeleteCandidateId(item.id)}
                             className="text-rose-400 hover:text-rose-600 p-1 focus:outline-none cursor-pointer"
                             title="Void Income Entry"
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Void Income Entry?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to void this income entry? Accurate registers depend on verified transactions and this action will alter cashbook balance ledgers.
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
                  await onDeleteIncome(id);
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
