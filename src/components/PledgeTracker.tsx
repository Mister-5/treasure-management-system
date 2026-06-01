/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Award, 
  Calendar, 
  Trash2, 
  Check, 
  FolderOpen,
  PieChart,
  UserCheck,
  Percent,
  X,
  AlertCircle
} from 'lucide-react';
import { Pledge, Member, Project, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface PledgeTrackerProps {
  pledges: Pledge[];
  members: Member[];
  projects: Project[];
  currentUser: UserProfile | null;
  onSavePledge: (pledge: Pledge) => Promise<void>;
  onDeletePledge: (id: string) => Promise<void>;
}

export default function PledgeTracker({ 
  pledges, 
  members, 
  projects, 
  currentUser, 
  onSavePledge, 
  onDeletePledge 
}: PledgeTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form State
  const [memberId, setMemberId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER, UserRole.SECRETARY].includes(currentUser.role);
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Access Denied. Secretarial/Treasury status required.');
      return;
    }
    if (!memberId) {
      setFormError('Please select a valid member.');
      return;
    }
    if (!projectId) {
      setFormError('Please select a target project.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Pledge amount must be greater than zero.');
      return;
    }
    if (parseFloat(amountPaid) < 0 || parseFloat(amountPaid) > parseFloat(amount)) {
      setFormError('Amount paid must be between 0 and the total pledge amount.');
      return;
    }
    if (!dueDate) {
      setFormError('Please choose a valid commitment due date.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const selectedMem = members.find(m => m.id === memberId);
      const selectedProj = projects.find(p => p.id === projectId);

      const amtVal = parseFloat(amount);
      const paidVal = parseFloat(amountPaid);
      const remainingVal = Math.max(0, amtVal - paidVal);

      let statusVal: 'Pending' | 'Partially Paid' | 'Fully Paid' | "Overdue";
      if (remainingVal === 0) {
        statusVal = 'Fully Paid';
      } else if (paidVal > 0) {
        statusVal = 'Partially Paid';
      } else {
        statusVal = 'Pending';
      }

      const newPledge: Pledge = {
        id: "pledge_" + Date.now(),
        memberId,
        memberName: selectedMem ? selectedMem.fullName : 'Guest',
        projectId,
        projectName: selectedProj ? selectedProj.name : 'General Fund',
        amount: amtVal,
        amountPaid: paidVal,
        remainingBalance: remainingVal,
        dueDate,
        status: statusVal,
        description: description || 'Special Development Commitment',
        createdAt: new Date().toISOString()
      };

      await onSavePledge(newPledge);
      setMemberId('');
      setProjectId('');
      setAmount('');
      setAmountPaid('0');
      setDueDate('');
      setDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline offsets (Allowing quick manual payment registry on pledges!)
  const handleQuickPay = async (pledge: Pledge, extraAmount: number) => {
    if (!canWrite) return;
    const newPaid = Math.min(pledge.amount, pledge.amountPaid + extraAmount);
    const newRemaining = Math.max(0, pledge.amount - newPaid);
    
    let nextStatus: any = "Pending";
    if (newRemaining === 0) {
      nextStatus = "Fully Paid";
    } else if (newPaid > 0) {
      nextStatus = "Partially Paid";
    }

    const updated: Pledge = {
      ...pledge,
      amountPaid: newPaid,
      remainingBalance: newRemaining,
      status: nextStatus
    };
    await onSavePledge(updated);
  };

  // Aggregated analytics
  const aggregates = useMemo(() => {
    let totalCommitted = 0;
    let totalCollected = 0;
    let outstanding = 0;

    pledges.forEach(p => {
      totalCommitted += p.amount;
      totalCollected += p.amountPaid;
      outstanding += p.remainingBalance;
    });

    return {
      committed: totalCommitted,
      collected: totalCollected,
      remaining: outstanding,
      progress: totalCommitted > 0 ? Math.round((totalCollected / totalCommitted) * 100) : 0
    };
  }, [pledges]);

  const filteredPledges = useMemo(() => {
    return pledges.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.memberName.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q);
      const matchesProject = filterProject === '' || p.projectId === filterProject;
      const matchesStatus = filterStatus === '' || p.status === filterStatus;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [pledges, searchQuery, filterProject, filterStatus]);

  return (
    <div className="space-y-6" id="pledge-manager-root">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800" id="pledge-view-title">Member Commitments & Pledges</h2>
          <p className="text-xs text-slate-500" id="pledge-view-sub">Track fundraising covenants, special building fund drives, and collection benchmarks</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-add-pledge"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Log Commitment
          </button>
        )}
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="pledges-aggregate-grid">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Total Pledged</span>
            <h4 className="text-base font-extrabold text-slate-800 font-mono">{aggregates.committed.toLocaleString()} Rwf</h4>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Award size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Fulfilled Payments</span>
            <h4 className="text-base font-extrabold text-emerald-600 font-mono">{aggregates.collected.toLocaleString()} Rwf</h4>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Outstanding balances</span>
            <h4 className="text-base font-extrabold text-amber-600 font-mono">{aggregates.remaining.toLocaleString()} Rwf</h4>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <PieChart size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Fulfillment %</span>
            <h4 className="text-base font-extrabold text-slate-800 font-mono">{aggregates.progress}%</h4>
          </div>
          <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
            <Percent size={16} />
          </div>
        </div>
      </div>

      {/* Record pledge form block */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" id="form-record-pledge">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Record Member Giving Covenant</h3>
            <button 
              onClick={() => { setShowAddForm(false); setFormError(''); }}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {formError && (
              <div className="col-span-1 md:col-span-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100 font-medium">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Covenant Member *</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  required
                >
                  <option value="">-- Select Member from Ledger --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Church Project *</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  required
                >
                  <option value="">-- Choose Project Fund Target --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Budget: {p.budget.toLocaleString()} Rwf)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Pledge Sum Committed (Rwf RWF) *</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100000"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Upfront Paid Offset</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Final Fulfillment Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Contribution drive notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Special anniversary dedication notes, installments commitment timetables..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 h-20 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold resize-none"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
                >
                  Log Pledge
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List display matrix */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
        {/* Search selectors */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              id="inp-search-pledges"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search covenants via member name, linked project title, or special purpose tags..."
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-9 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 self-start">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none font-semibold px-2 py-1 fill-project-combo"
            >
              <option value="">All Projects</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-200"></div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none font-semibold px-2 py-1 select-filter-status"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Fully Paid">Fully Paid</option>
            </select>
          </div>
        </div>

        {/* Directory ledger items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="pledges-grid-cards">
          {filteredPledges.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-10 rounded-2xl border border-slate-100 text-slate-400 text-xs font-semibold bg-slate-50/50">
              No registered pledge accounts logged under matching criteria.
            </div>
          ) : (
            filteredPledges.map(item => {
              const payRate = Math.round((item.amountPaid / item.amount) * 100);
              return (
                <div key={item.id} className="bg-white border border-slate-150 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-xs transition duration-150 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{item.memberName}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold mt-0.5"><FolderOpen size={11} /> {item.projectName}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Fully Paid' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        item.status === 'Partially Paid' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-550 h-8 line-clamp-2" title={item.description}>{item.description}</p>
                    
                    {/* Visual Progress Bar - 100% compliant custom design */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Fulfillment: {payRate}%</span>
                        <span className="font-mono">{item.amountPaid.toLocaleString()} / {item.amount.toLocaleString()} Rwf</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${payRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-medium">
                    <span className="text-[10px] text-slate-450 uppercase flex items-center gap-1"><Calendar size={12} /> Due: {item.dueDate}</span>
                    
                    {/* Quick increment option for Treasurers */}
                    {canWrite && item.status !== 'Fully Paid' && (
                      <div className="flex gap-1.5" id={`actions-pledge-${item.id}`}>
                        <button
                          onClick={() => handleQuickPay(item, 50000)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 transition focus:outline-none cursor-pointer"
                        >
                          +50k
                        </button>
                        <button
                          onClick={() => handleQuickPay(item, item.remainingBalance)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 transition focus:outline-none cursor-pointer text-quick-settle"
                        >
                          Settle
                        </button>
                      </div>
                    )}

                    {canWrite && (
                      <button
                        onClick={async () => {
                          if (window.confirm("Void member's total covenant pledge?")) {
                            await onDeletePledge(item.id);
                          }
                        }}
                        className="text-slate-300 hover:text-rose-500 p-0.5 focus:outline-none cursor-pointer ml-1"
                        title="Delete Pledge Account"
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
    </div>
  );
}
