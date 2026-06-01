/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  FolderLock, 
  Trash2, 
  Calendar,
  Layers,
  Activity,
  CheckCircle,
  TrendingUp,
  X,
  AlertCircle
} from 'lucide-react';
import { Project, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface ProjectTrackerProps {
  projects: Project[];
  currentUser: UserProfile | null;
  onSaveProject: (project: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export default function ProjectTracker({ 
  projects, 
  currentUser, 
  onSaveProject, 
  onDeleteProject 
}: ProjectTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<Project['status']>('Active');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER].includes(currentUser.role);
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Access Denied. Secretarial/Treasury status required.');
      return;
    }
    if (!name.trim()) {
      setFormError('Project full folder name is required.');
      return;
    }
    if (!budget || parseFloat(budget) <= 0) {
      setFormError('Valid project budget capital threshold required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const newProj: Project = {
        id: "proj_" + Date.now(),
        name: name.trim(),
        budget: parseFloat(budget),
        incomeReceived: 0,
        expensesSpent: 0,
        remainingBalance: 0,
        status,
        description: description || 'No summary registered',
        createdAt: new Date().toISOString()
      };

      await onSaveProject(newProj);
      setName('');
      setBudget('');
      setStatus('Active');
      setDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });
  }, [projects, searchQuery]);

  return (
    <div className="space-y-6" id="project-tracker-root">
      
      {/* Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800" id="project-view-title">Church Capital Projects Funds</h2>
          <p className="text-xs text-slate-500" id="project-view-sub">Plan construction drives, track donor allocation streams, and review active project ledger accounts</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-add-project"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Launch Project
          </button>
        )}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-2xl" id="form-record-project">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><FolderLock size={15} /> Draft Corporate Capital Project</h3>
            <button 
              onClick={() => { setShowAddForm(false); setFormError(''); }}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formError && (
              <div className="col-span-1 sm:col-span-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100 font-medium">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Project Folder Title *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. New Sanctuary Construction"
                className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-semibold"
                maxLength={45}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Budget (Rwf RWF) *</label>
                <input
                  type="number"
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="15000000"
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Project Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-slate-500 font-semibold text-bold"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Covenant drive summary / specifications</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly detail what materials, plans or contracts fall under this cost center portfolio..."
                className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 h-20 focus:outline-none focus:ring-1 focus:ring-slate-500 font-semibold resize-none"
                maxLength={200}
              />
            </div>

            <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 pt-2">
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
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
              >
                Launch Cost Center
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Search */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            id="inp-search-projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active church project dossiers via keyword, description summaries, or building status..."
            className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-9 focus:outline-none focus:ring-1 focus:ring-indigo-505 font-semibold"
          />
        </div>
      </div>

      {/* Visual listing list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="projects-grid-items">
        {filteredProjects.length === 0 ? (
          <div className="col-span-1 md:col-span-3 text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-semibold">
            No capital development projects logged.
          </div>
        ) : (
          filteredProjects.map(item => {
            const spendingRatio = item.incomeReceived > 0 
              ? Math.min(100, Math.round((item.expensesSpent / item.incomeReceived) * 100))
              : 0;

            const collectionRatio = Math.round((item.incomeReceived / item.budget) * 100);

            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-sm transition flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      item.status === 'Planning' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                      item.status === 'Active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                      item.status === 'Completed' ? "bg-slate-100 text-slate-700 border border-slate-200" :
                      "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}>
                      <Activity size={10} />
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">COST GROUP</span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 tracking-tight">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-3 h-12" title={item.description}>{item.description}</p>
                  </div>

                  {/* Progressive stats bar */}
                  <div className="space-y-3.5 pt-2">
                    
                    {/* Collection gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Pledges Fulfilled ({collectionRatio}%)</span>
                        <span className="font-mono text-emerald-600">{item.incomeReceived.toLocaleString()} / {item.budget.toLocaleString()} Rwf</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${Math.min(100, collectionRatio)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Spent gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Debit Utilized: ({spendingRatio}%)</span>
                        <span className="font-mono text-rose-600">{item.expensesSpent.toLocaleString()} spent Rwf</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-400 rounded-full" 
                          style={{ width: `${spendingRatio}%` }}
                        ></div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">NET ACCRUED FUND</span>
                    <span className={`text-sm font-extrabold font-mono ${item.remainingBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {item.remainingBalance.toLocaleString()} Rwf
                    </span>
                  </div>

                  {canWrite && (
                    <button
                      onClick={async () => {
                        if (window.confirm("Archive physical project directory? Balance ledgers remain historically untouched.")) {
                          await onDeleteProject(item.id);
                        }
                      }}
                      className="text-slate-350 hover:text-rose-600 p-1 focus:outline-none cursor-pointer"
                      title="Archive Project cost center"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
