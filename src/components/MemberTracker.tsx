/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Phone, 
  Trash2, 
  Calendar,
  DollarSign,
  ArrowRight,
  TrendingUp,
  X,
  FileSpreadsheet,
  Pencil
} from 'lucide-react';
import { Member, Income, UserProfile, UserRole } from '../types';
import { getFirestoreErrorMessage } from '../lib/firebase';

interface MemberTrackerProps {
  members: Member[];
  incomes: Income[];
  currentUser: UserProfile | null;
  onSaveMember: (member: Member) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

export default function MemberTracker({ 
  members, 
  incomes, 
  currentUser, 
  onSaveMember, 
  onDeleteMember 
}: MemberTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEdit = (member: Member) => {
    setFullName(member.fullName);
    setPhone(member.phone === 'N/A' ? '' : member.phone);
    setEmail(member.email === 'N/A' ? '' : member.email);
    setStatus(member.status);
    setEditingId(member.id);
    setShowAddForm(true);
  };

  // Write authorization (Auditor is read-only. Secretaries can register members!)
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.TREASURER, UserRole.SECRETARY].includes(currentUser.role);
  }, [currentUser]);

  // Handle Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setFormError('Access Denied. Secretarial/Treasury status required.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const existingMember = editingId ? members.find(m => m.id === editingId) : null;
      const newMem: Member = {
        id: editingId || ("mem_" + Date.now()),
        fullName: fullName.trim(),
        phone: phone.trim() || 'N/A',
        email: email.trim() || 'N/A',
        status,
        createdAt: existingMember ? existingMember.createdAt : new Date().toISOString()
      };

      await onSaveMember(newMem);
      setFullName('');
      setPhone('');
      setEmail('');
      setStatus('active');
      setEditingId(null);
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute contribution analytics for each member
  const memberSummaries = useMemo(() => {
    return members.map(m => {
      const memberIncomes = incomes.filter(inc => inc.memberId === m.id);
      const totalDonated = memberIncomes.reduce((sum, current) => sum + current.amount, 0);
      const lastIncome = memberIncomes.length > 0 
        ? memberIncomes.sort((a, b) => b.date.localeCompare(a.date))[0]
        : null;

      return {
        ...m,
        totalDonated,
        contributionCount: memberIncomes.length,
        lastDonationDate: lastIncome ? lastIncome.date : 'No contributions recorded'
      };
    });
  }, [members, incomes]);

  // Search filter
  const filteredMembers = useMemo(() => {
    return memberSummaries.filter(m => {
      const q = searchQuery.toLowerCase();
      return m.fullName.toLowerCase().includes(q) || 
             m.phone.toLowerCase().includes(q) || 
             m.email.toLowerCase().includes(q);
    });
  }, [memberSummaries, searchQuery]);

  // Detailed selected member contributions stream
  const selectedMemberDetails = useMemo(() => {
    if (!selectedMemberId) return null;
    const member = memberSummaries.find(m => m.id === selectedMemberId);
    if (!member) return null;

    const contributionsStream = incomes
      .filter(inc => inc.memberId === selectedMemberId)
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      member,
      contributions: contributionsStream
    };
  }, [selectedMemberId, memberSummaries, incomes]);

  return (
    <div className="space-y-6" id="member-root">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 id="members-title" className="text-xl font-bold text-slate-800">Church Member Registry</h2>
          <p id="members-subtitle" className="text-xs text-slate-500">Track profiles, individual pledges, and voluntary giving index folders</p>
        </div>
        {canWrite && !showAddForm && (
          <button
            id="btn-add-member"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            <Plus size={15} /> Register Member
          </button>
        )}
      </div>

      {/* Main Grid: Listings + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: directory list */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Register Member Form block */}
          {showAddForm && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs space-y-4" id="form-register-member">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest">{editingId ? 'Edit Congregant Profile' : 'Register New Church Member'}</h3>
                <button 
                  onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formError && (
                  <div className="col-span-1 sm:col-span-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-1.5 font-medium">
                    <User size={13} /> {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Full Corporate Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Primary Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0123"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="johndoe@church.com"
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Membership Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-bold"
                  >
                    <option value="active">Active Congregant</option>
                    <option value="inactive">Inactive / Moved</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setFormError(''); setEditingId(null); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
                  >
                    {editingId ? 'Save Changes' : 'Register Member'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Search block */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                id="inp-search-member"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search congregation roster via full name, telephone networks, or email domain..."
                className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-9 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          {/* Desktop/Tablet List Roster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="member-cards-layout">
            {filteredMembers.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 bg-white text-center py-10 rounded-2xl border border-slate-100 text-slate-400 text-xs font-semibold">
                No congregational members matching your search.
              </div>
            ) : (
              filteredMembers.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedMemberId(item.id)}
                  className={`bg-white rounded-2xl p-5 border cursor-pointer transition duration-150 flex flex-col justify-between hover:border-indigo-400 group relative ${
                    selectedMemberId === item.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-100"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100/70 transition">
                          <User size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 text-base flex items-center gap-1">{item.fullName}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition translate-x-0 group-hover:translate-x-1" />
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500 font-semibold">
                      <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {item.phone}</div>
                      <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400 truncate" /> {item.email}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-50 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Contributed</span>
                      <span className="text-xs font-extrabold text-indigo-600 font-mono">{item.totalDonated.toLocaleString('en-US')} Rwf</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Giving index</span>
                      <span className="text-xs font-bold text-slate-700">{item.contributionCount} payments</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Right Detail Panel: Individual history or placeholder */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 pb-6 flex flex-col justify-between" id="member-drawer-subview">
          {selectedMemberDetails ? (
            <div className="space-y-5 flex-1">
              {/* Drawer Title */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">MEMBER CONTRIBUTION HISTORY</span>
                  <h3 className="text-sm font-extrabold text-slate-800" id="lbl-drawer-member-name">{selectedMemberDetails.member.fullName}</h3>
                </div>
                <button 
                  onClick={() => setSelectedMemberId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Total Aggregate Statistics */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Aggregated Tithes</span>
                  <h4 className="text-lg font-black text-slate-850 font-mono" id="lbl-drawer-member-sum">
                    {selectedMemberDetails.member.totalDonated.toLocaleString('en-US')} Rwf
                  </h4>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <TrendingUp size={22} />
                </div>
              </div>

              {/* Streams lists */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Payment History</h5>
                <div className="space-y-2.5 overflow-y-auto max-h-[290px] pr-1" id="drawer-contributions-feed">
                  {selectedMemberDetails.contributions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium">
                      No contributions logged for this member yet.
                    </div>
                  ) : (
                    selectedMemberDetails.contributions.map(inc => (
                      <div key={inc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center shrink-0">
                        <div>
                          <h6 className="text-xs font-bold text-slate-700">{inc.categoryName}</h6>
                          <p className="text-[10px] text-slate-400 font-mono">{inc.date} • {inc.paymentMethod}</p>
                        </div>
                        <span className="text-xs font-extrabold text-indigo-600 font-mono">
                          +{inc.amount.toLocaleString()} Rwf
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Edit/Delete profile gate - Only for highly authorized personnel (Treasurer, Admin, Secretary) */}
              {canWrite && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => startEdit(selectedMemberDetails.member)}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
                  >
                    <Pencil size={13} /> Edit Profile / Rename
                  </button>
                  
                  {(currentUser && [UserRole.ADMIN, UserRole.TREASURER].includes(currentUser.role)) && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you absolutely sure you want to delete ${selectedMemberDetails.member.fullName}'s profile? Historic ledger entries will remain intact.`)) {
                          await onDeleteMember(selectedMemberDetails.member.id);
                          setSelectedMemberId(null);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete Member Profile
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 flex flex-col items-center justify-center space-y-3 flex-1">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl">
                <User size={30} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">No Congregant Selected</h4>
                <p className="text-[10px] text-slate-550 max-w-[200px] mx-auto mt-0.5">Click any card on the directory registry to examine specific contributing history and audit dates.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
