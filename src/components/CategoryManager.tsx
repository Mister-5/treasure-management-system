/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Power, 
  PowerOff,
  AlertTriangle,
  FolderPlus,
  Eye,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Category, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface CategoryManagerProps {
  categories: Category[];
  currentUser: UserProfile | null;
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoryManager({ 
  categories, 
  currentUser, 
  onSaveCategory, 
  onDeleteCategory 
}: CategoryManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER].includes(currentUser.role);
  }, [currentUser]);

  const incomeCategories = useMemo(() => {
    return categories.filter(c => c.type === 'income');
  }, [categories]);

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense');
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Action denied. Administrators and Treasurers only.');
      return;
    }
    if (!name.trim()) {
      setFormError('Category Name cannot be blank.');
      return;
    }

    const nameExists = categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase() && c.type === type);
    if (nameExists) {
      setFormError('A category with this name already exists in this ledger section.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const newCat: Category = {
        id: `custom-${type}-${Date.now()}`,
        name: name.trim(),
        type,
        status,
        isCustom: true,
        createdAt: new Date().toISOString()
      };

      await onSaveCategory(newCat);
      setName('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    if (!canWrite) return;
    const updatedCat: Category = {
      ...cat,
      status: cat.status === 'active' ? 'inactive' : 'active'
    };
    await onSaveCategory(updatedCat);
  };

  return (
    <div className="space-y-6" id="category-manager-root">
      {/* Upper banner info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800" id="category-view-head">Account Ledger Layout (Categories)</h2>
          <p className="text-xs text-slate-500" id="category-view-subhead">Manage unlimited custom collections for church general accounts (Tithes, support systems, renovations)</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-add-category"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Add Custom Category
          </button>
        )}
      </div>

      {/* Slide form category draft */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-w-xl" id="form-category-draft">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1"><FolderPlus size={14} className="text-emerald-500" /> Draft Account Category</h3>
            <button 
              onClick={() => { setShowAddForm(false); setFormError(''); }}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100 font-medium">
                <AlertTriangle size={15} /> {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ledger Placement *</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition ${
                      type === 'income' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Income Flows
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition ${
                      type === 'expense' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    Expenses Paid
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Live Status *</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition ${
                      status === 'active' ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition ${
                      status === 'inactive' ? "bg-slate-300 text-slate-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category Label/Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Media Ministry Support, Thanksgiving Seed, Special Mission, etc."
                className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                maxLength={45}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setFormError(''); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Split categories columns display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="columns-categories">
        
        {/* Income Segment */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5" id="cols-categories-income">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3.5 mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-xs"></span>
              Inflow Ledgers ({incomeCategories.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">REVENUE LABELS</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {incomeCategories.map(cat => (
              <div key={cat.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition duration-150 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-700">{cat.name}</h5>
                  <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 uppercase">
                    {cat.isCustom ? "CUSTOM USER DEFINED" : "SYSTEM DEFAULT PRESET"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(cat)}
                    disabled={!canWrite}
                    className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border transition ${
                      cat.status === 'active' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/75" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/50"
                    } ${!canWrite && "pointer-events-none opacity-80"}`}
                    title={canWrite ? "Toggle Category Usage Status" : "Active status (View Only)"}
                  >
                    {cat.status === 'active' ? (
                      <>
                        <CheckCircle2 size={11} /> Active
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Disabled
                      </>
                    )}
                  </button>

                  {cat.isCustom && canWrite && (
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Segment */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5" id="cols-categories-expenses">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3.5 mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-3 bg-rose-500 rounded-xs"></span>
              Outflow Ledgers ({expenseCategories.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">EXPENDITURE LABELS</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {expenseCategories.map(cat => (
              <div key={cat.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition duration-150 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-700">{cat.name}</h5>
                  <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 uppercase">
                    {cat.isCustom ? "CUSTOM USER DEFINED" : "SYSTEM DEFAULT PRESET"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(cat)}
                    disabled={!canWrite}
                    className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border transition ${
                      cat.status === 'active' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/75" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/50"
                    } ${!canWrite && "pointer-events-none opacity-80"}`}
                    title={canWrite ? "Toggle Category Usage Status" : "Active status"}
                  >
                    {cat.status === 'active' ? (
                      <>
                        <CheckCircle2 size={11} /> Active
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Disabled
                      </>
                    )}
                  </button>

                  {cat.isCustom && canWrite && (
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
