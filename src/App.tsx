/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Church, 
  LayoutDashboard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FolderGit, 
  Scroll, 
  BookOpen, 
  Users, 
  Tags, 
  FilePieChart, 
  ShieldAlert, 
  Moon, 
  Sun,
  Menu,
  X,
  UserCheck,
  Activity,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { ChurchStore } from './lib/store';
import { 
  UserProfile, 
  UserRole, 
  UserStatus, 
  Member, 
  Category, 
  Income, 
  Expense, 
  Pledge, 
  Project, 
  CashbookEntry, 
  AuditLog, 
  SystemBalances 
} from './types';

// Importing Visual Modular views
import { auth, firebaseAvailable, db, sanitizeFirestoreData, getFirestoreErrorMessage } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import IncomeManager from './components/IncomeManager';
import ExpenseManager from './components/ExpenseManager';
import ProjectTracker from './components/ProjectTracker';
import PledgeTracker from './components/PledgeTracker';
import MemberTracker from './components/MemberTracker';
import CategoryManager from './components/CategoryManager';
import ReportsGenerator from './components/ReportsGenerator';
import AuditLogViewer from './components/AuditLogViewer';
import CashbookViewer from './components/CashbookViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Firebase auth state
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // States mirroring underlying ChurchStore data
  const [balances, setBalances] = useState<SystemBalances>({ cash: 0, bank: 0, mobileMoney: 0, total: 0 });
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cashbook, setCashbook] = useState<CashbookEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Firestore automatic/manual cloud sync progress states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');

  // Authenticated/Simulated Roles
  const simulatedUsers: UserProfile[] = useMemo(() => ChurchStore.getUsers(), []);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);

  const currentUser = useMemo(() => {
    if (!authUser) return null;
    const activeSimulated = simulatedUsers[selectedUserIndex];
    return {
      ...authUser,
      role: activeSimulated ? activeSimulated.role : authUser.role
    };
  }, [simulatedUsers, selectedUserIndex, authUser]);

  // Synchronize dynamic local state from memory storage
  const syncWorkspaceState = () => {
    setBalances(ChurchStore.getSystemBalances());
    setIncomes(ChurchStore.getIncome());
    setExpenses(ChurchStore.getExpenses());
    setProjects(ChurchStore.getProjects());
    setPledges(ChurchStore.getPledges());
    setMembers(ChurchStore.getMembers());
    setCategories(ChurchStore.getCategories());
    setCashbook(ChurchStore.getCashbookEntries());
    setAuditLogs(ChurchStore.getAuditLogs());
  };

  const handleManualSync = async () => {
    if (!firebaseAvailable || !authUser) return;
    setIsSyncing(true);
    setSyncStatus(null);
    setSyncErrorMessage('');
    try {
      await ChurchStore.syncAllFromCloud(currentUser);
      setSyncStatus('success');
      syncWorkspaceState();
      setTimeout(() => {
        setSyncStatus(null);
      }, 4000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncErrorMessage(getFirestoreErrorMessage(err));
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on startup (handles firebase state listeners and cloud syncing)
  useEffect(() => {
    // Check local preferences for Dark Mode
    const savedDark = localStorage.getItem("church_dark_mode") === "true";
    setDarkMode(savedDark);
    syncWorkspaceState();

    if (firebaseAvailable && auth && db) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Fetch profile details from Firestore
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            let profile: UserProfile;

            if (docSnap.exists()) {
              profile = docSnap.data() as UserProfile;
            } else {
              // Register new registration in system
              profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Treasury Officer',
                role: UserRole.TREASURER,
                status: UserStatus.ACTIVE,
                createdAt: new Date().toISOString()
              };
              await setDoc(docRef, sanitizeFirestoreData(profile));
            }

            // Sync database records dynamically with visual feedback
            setIsSyncing(true);
            setSyncStatus(null);
            setSyncErrorMessage('');
            try {
              await ChurchStore.syncAllFromCloud(profile);
              setSyncStatus('success');
              setTimeout(() => {
                setSyncStatus(null);
              }, 4000);
            } catch (syncErr: any) {
              setSyncStatus('error');
              setSyncErrorMessage(getFirestoreErrorMessage(syncErr));
            } finally {
              setIsSyncing(false);
            }
            
            setAuthUser(profile);
            syncWorkspaceState();
          } catch (err) {
            console.error("Error setting up credentials:", err);
            // Dynamic offline sandbox fallback details
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Authorized Member',
              role: UserRole.TREASURER,
              status: UserStatus.ACTIVE,
              createdAt: new Date().toISOString()
            };
            setAuthUser(fallbackProfile);
          }
        } else {
          setAuthUser(null);
        }
        setAuthLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Local caching fallback if no cloud credentials
      const savedUser = localStorage.getItem("church_mock_user");
      if (savedUser) {
        try {
          setAuthUser(JSON.parse(savedUser));
        } catch {
          setAuthUser(null);
        }
      }
      setAuthLoading(false);
    }
  }, []);

  // Update body dark tag when toggled
  useEffect(() => {
    localStorage.setItem("church_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle user authentication screen success callback
  const handleAuthSuccess = async (profile: UserProfile) => {
    setAuthUser(profile);
    if (!firebaseAvailable) {
      localStorage.setItem("church_mock_user", JSON.stringify(profile));
    }
    syncWorkspaceState();
  };

  // Sign out functionality
  const handleLogout = async () => {
    if (firebaseAvailable && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem("church_mock_user");
    }
    setAuthUser(null);
  };

  // --- ACTIONS INTERFACING WITH STORE ---
  const handleSaveIncome = async (income: Income) => {
    await ChurchStore.saveIncome(income, currentUser);
    syncWorkspaceState();
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await ChurchStore.deleteIncome(id, currentUser);
      syncWorkspaceState();
    } catch (err: any) {
      alert(getFirestoreErrorMessage(err));
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    await ChurchStore.saveExpense(expense, currentUser);
    syncWorkspaceState();
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await ChurchStore.deleteExpense(id, currentUser);
      syncWorkspaceState();
    } catch (err: any) {
      alert(getFirestoreErrorMessage(err));
    }
  };

  const handleSaveCategory = async (category: Category) => {
    await ChurchStore.saveCategory(category, currentUser);
    syncWorkspaceState();
  };

  const handleDeleteCategory = async (id: string) => {
    await ChurchStore.deleteCategory(id, currentUser);
    syncWorkspaceState();
  };

  const handleSaveMember = async (member: Member) => {
    await ChurchStore.saveMember(member, currentUser);
    syncWorkspaceState();
  };

  const handleDeleteMember = async (id: string) => {
    await ChurchStore.deleteMember(id, currentUser);
    syncWorkspaceState();
  };

  const handleSavePledge = async (pledge: Pledge) => {
    await ChurchStore.savePledge(pledge, currentUser);
    syncWorkspaceState();
  };

  const handleDeletePledge = async (id: string) => {
    await ChurchStore.deletePledge(id, currentUser);
    syncWorkspaceState();
  };

  const handleSaveProject = async (project: Project) => {
    await ChurchStore.saveProject(project, currentUser);
    syncWorkspaceState();
  };

  const handleDeleteProject = async (id: string) => {
    await ChurchStore.deleteProject(id, currentUser);
    syncWorkspaceState();
  };

  const handleUploadReceipt = async (file: File) => {
    return await ChurchStore.uploadReceipt(file);
  };

  // Sidebar list configurations
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'income', name: 'Income Collections', icon: ArrowUpCircle },
    { id: 'expense', name: 'Expense Vouchers', icon: ArrowDownCircle },
    { id: 'cashbook', name: 'Double Entry Cashbook', icon: BookOpen },
    { id: 'projects', name: 'Capital Projects', icon: FolderGit },
    { id: 'pledges', name: 'Giving Pledges', icon: Scroll },
    { id: 'members', name: 'Member Profiles', icon: Users },
    { id: 'categories', name: 'Account Categories', icon: Tags },
    { id: 'reports', name: 'Financial Reports', icon: FilePieChart },
    { id: 'auditLogs', name: 'Auditor Trail logs', icon: ShieldAlert },
  ];

  const currentTabComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard balances={balances} incomes={incomes} expenses={expenses} cashbook={cashbook} />;
      case 'income':
        return (
          <IncomeManager 
            incomes={incomes} 
            categories={categories} 
            members={members} 
            currentUser={currentUser}
            onSaveIncome={handleSaveIncome}
            onDeleteIncome={handleDeleteIncome}
            onUploadReceipt={handleUploadReceipt}
          />
        );
      case 'expense':
        return (
          <ExpenseManager 
            expenses={expenses} 
            categories={categories} 
            projects={projects} 
            currentUser={currentUser}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onUploadReceipt={handleUploadReceipt}
          />
        );
      case 'projects':
        return (
          <ProjectTracker 
            projects={projects} 
            currentUser={currentUser}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case 'pledges':
        return (
          <PledgeTracker 
            pledges={pledges} 
            members={members} 
            projects={projects} 
            currentUser={currentUser}
            onSavePledge={handleSavePledge}
            onDeletePledge={handleDeletePledge}
          />
        );
      case 'members':
        return (
          <MemberTracker 
            members={members} 
            incomes={incomes} 
            currentUser={currentUser}
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDeleteMember}
          />
        );
      case 'categories':
        return (
          <CategoryManager 
            categories={categories} 
            currentUser={currentUser}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'cashbook':
        return <CashbookViewer cashbook={cashbook} balances={balances} />;
      case 'reports':
        return (
          <ReportsGenerator 
            incomes={incomes} 
            expenses={expenses} 
            projects={projects} 
            pledges={pledges} 
            cashbook={cashbook} 
          />
        );
      case 'auditLogs':
        return <AuditLogViewer logs={auditLogs} currentUser={currentUser} />;
      default:
        return <Dashboard balances={balances} incomes={incomes} expenses={expenses} cashbook={cashbook} />;
    }
  };

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'JD';

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${darkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-550 dark:text-slate-400">Verifying secure treasury gate...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} darkMode={darkMode} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`} id="app-root-container">
      
      {/* Main Framework Content Grid */}
      <div className="flex min-h-screen">
        
        {/* Left Sidebar Menu (Desktop only) */}
        <aside className="w-64 bg-slate-900 text-white shrink-0 hidden lg:flex flex-col justify-between p-0 print:hidden font-sans">
          <div className="flex flex-col flex-1">
            {/* Logo details (Full Size Display) */}
            <div className="p-6 flex flex-col items-center text-center gap-3 border-b border-slate-800">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-slate-700 shadow-md shadow-black/30 shrink-0 p-1">
                <img 
                  src="https://i.ibb.co/sJyvLb1D/GBU.jpg" 
                  alt="GBU Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-white tracking-tight leading-snug">Treasury Management</h1>
                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mt-0.5 pb-0.5">SYSTEM</span>
              </div>
            </div>

            {/* Menu Options */}
            <nav className="flex-1 py-6 px-4 space-y-1.5">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer text-left select-menu-${item.id} ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={16} className={`${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Details Footer aligned with template */}
          <div className="flex flex-col p-4 border-t border-slate-800 gap-3.5 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase shadow-inner">
                {initials}
              </div>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-bold text-white truncate">{currentUser?.displayName}</p>
                <p className="text-slate-400 uppercase tracking-widest text-[9px] font-medium truncate mt-0.5">{currentUser?.role}</p>
              </div>
            </div>

            {/* Sandbox Simulation & Firestore Sync Controls */}
            <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <span>Simulation Console</span>
                {firebaseAvailable && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Force refresh database sync with Firestore cloud"
                  >
                    {isSyncing ? (
                      <Loader2 size={10} className="animate-spin text-blue-500" />
                    ) : (
                      <RefreshCw size={10} className="hover:rotate-45 transition duration-150" />
                    )}
                    <span>Sync</span>
                  </button>
                )}
              </div>
              
              <div className="flex bg-slate-850 rounded border border-slate-800 text-[10px]">
                <span className="text-[9px] text-slate-400 font-bold px-2 py-1.5 bg-slate-800 border-r border-slate-800 uppercase flex items-center select-none">
                  Role
                </span>
                <select
                  value={selectedUserIndex}
                  onChange={(e) => {
                    setSelectedUserIndex(Number(e.target.value));
                    syncWorkspaceState();
                  }}
                  className="bg-transparent text-slate-300 focus:outline-none cursor-pointer p-1 font-bold select-role-simulation flex-1 text-[10px] [&>option]:bg-slate-900 [&>option]:text-white font-sans"
                >
                  {simulatedUsers.map((u, index) => (
                    <option key={u.uid} value={index}>
                      {u.role} ({u.displayName.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sync Status Label */}
              {syncStatus && (
                <div className={`p-1.5 rounded text-[9px] font-bold text-center border ${
                  syncStatus === 'success' 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' 
                    : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                }`}>
                  {syncStatus === 'success' ? '✓ Synced with Cloud' : `⚠ ${syncErrorMessage}`}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] pt-1 text-slate-500 border-t border-slate-850">
              <button
                onClick={handleLogout}
                className="text-rose-500 hover:text-rose-450 font-bold uppercase transition"
              >
                Sign Out
              </button>
              {/* Dark Mode toggle pill */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition text-slate-300 cursor-pointer hover:text-white"
                title="Toggle look theme"
              >
                {darkMode ? 'Light UI' : 'Dark UI'}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile slide drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-xs transition" id="mobile-overlay font-sans">
            <div className="w-64 bg-slate-900 text-white min-h-screen p-0 flex flex-col justify-between">
              <div className="flex flex-col flex-1">
                <div className="p-6 flex flex-col items-center justify-center border-b border-slate-800 relative">
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition absolute right-3 top-3">
                    <X size={18} />
                  </button>
                  
                  {/* Logo details (Full Size Display for Mobile) */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-700 shadow-md shadow-black/30 shrink-0 mb-2 p-1">
                    <img 
                      src="https://i.ibb.co/sJyvLb1D/GBU.jpg" 
                      alt="GBU Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xs font-extrabold text-white tracking-tight uppercase leading-none">Treasury System</h1>
                  </div>
                </div>

                <nav className="py-6 px-4 space-y-1.5">
                  {menuItems.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon size={16} />
                        {item.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-4 border-t border-slate-850 bg-slate-950/40 gap-3 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
                    {initials}
                  </div>
                  <div className="text-xs min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{currentUser?.displayName}</p>
                    <p className="text-slate-400 uppercase tracking-widest text-[9px] truncate">{currentUser?.role}</p>
                  </div>
                </div>

                {/* Sandbox Simulation & Firestore Sync Controls for Mobile */}
                <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                    <span>Simulation Console</span>
                    {firebaseAvailable && (
                      <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Force refresh database sync with Firestore cloud"
                      >
                        {isSyncing ? (
                          <Loader2 size={10} className="animate-spin text-blue-500" />
                        ) : (
                          <RefreshCw size={10} className="hover:rotate-45 transition duration-150" />
                        )}
                        <span>Sync</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex bg-slate-850 rounded border border-slate-800 text-[10px]">
                    <span className="text-[9px] text-slate-400 font-bold px-2 py-1 bg-slate-800 border-r border-slate-800 uppercase flex items-center select-none">
                      Role
                    </span>
                    <select
                      value={selectedUserIndex}
                      onChange={(e) => {
                        setSelectedUserIndex(Number(e.target.value));
                        syncWorkspaceState();
                      }}
                      className="bg-transparent text-slate-300 focus:outline-none cursor-pointer p-1 font-bold select-role-simulation flex-1 text-[10px] [&>option]:bg-slate-900 [&>option]:text-white font-sans"
                    >
                      {simulatedUsers.map((u, index) => (
                        <option key={u.uid} value={index}>
                          {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                  <button onClick={handleLogout} className="text-rose-500 hover:text-rose-455 font-bold uppercase">Sign Out</button>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-1 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                  >
                    {darkMode ? 'Light' : 'Dark'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right workspace core body */}
        <main className="flex-1 flex flex-col justify-between overflow-x-hidden min-w-0" id="main-workspace-frame">
          {/* Header Mobile Toolbar */}
          <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center lg:hidden print:hidden dark:bg-slate-900 dark:border-slate-850">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-755 shrink-0 p-0.5">
                <img 
                  src="https://i.ibb.co/sJyvLb1D/GBU.jpg" 
                  alt="GBU Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">Treasury Management System</h2>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 text-slate-600 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              id="btn-toggle-mobile-menu"
            >
              <Menu size={18} />
            </button>
          </header>

          {/* Dynamic Render Workspace Section */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1 bg-slate-50 dark:bg-slate-950 transition-colors duration-200" id="dynamic-component-viewport">
            {currentTabComponent()}
          </div>

          {/* Footer details consistent with Professional Polish */}
          <footer className="px-8 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 print:hidden dark:bg-slate-900 dark:border-slate-850">
            <div className="flex gap-4">
              <span>Database Sync: <span className="text-emerald-500 font-bold uppercase">Synced</span></span>
              <span>Logged Workspace Session: <span className="text-slate-600 font-semibold dark:text-slate-300">{currentUser?.displayName}</span></span>
            </div>
            <div className="flex gap-4 mt-1 sm:mt-0 font-medium">
              <span>System v2.4.0</span>
              <span>Treasurer-Auditor Secured Gateway</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
