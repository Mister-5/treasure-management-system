/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, firebaseAvailable, handleFirestoreError, OperationType, sanitizeFirestoreData } from './firebase';
import { 
  UserProfile, 
  Member, 
  Category, 
  Income, 
  Expense, 
  Pledge, 
  Project, 
  CashbookEntry, 
  AuditLog, 
  PaymentMethod, 
  SystemBalances,
  UserRole,
  UserStatus
} from '../types';

// Initial Mock Seed Data if Local Storage is empty
const DEFAULT_CATEGORIES: Category[] = [
  // Income categories
  { id: "inc-membership", name: "Membership fees", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "inc-thanksgiving", name: "Thanksgiving", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "inc-contribution", name: "Contribution fees", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "inc-tithes", name: "Tithes", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "inc-offerings", name: "Offerings", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "inc-donations", name: "Donations", type: "income", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  
  // Expense categories
  { id: "exp-fellowship", name: "Fellowship", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-transport", name: "Transport", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-communication", name: "Communication", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-supporting", name: "Supporting", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-buying-service-items", name: "Buying service items (Sunday and Friday)", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-welcoming-year1", name: "Welcoming year1 students", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-meeting", name: "Meeting", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() },
  { id: "exp-others", name: "Others", type: "expense", status: "active", isCustom: false, createdAt: new Date().toISOString() }
];

const DEFAULT_MEMBERS: Member[] = [];

const DEFAULT_PROJECTS: Project[] = [];

const DEFAULT_PLEDGES: Pledge[] = [];

const DEFAULT_INCOMES: Income[] = [];

const DEFAULT_EXPENSES: Expense[] = [];

const DEFAULT_USERS: UserProfile[] = [
  { uid: "admin-id", email: "ngiruwonsang078900171@gmail.com", displayName: "Administrator", role: UserRole.ADMIN, status: UserStatus.ACTIVE, createdAt: new Date().toISOString() },
  { uid: "treasurer-id", email: "treasurer@church.org", displayName: "Grace Miller", role: UserRole.TREASURER, status: UserStatus.ACTIVE, createdAt: new Date().toISOString() },
  { uid: "pastor-id", email: "pastor@church.org", displayName: "Rev. Thomas Green", role: UserRole.PASTOR, status: UserStatus.ACTIVE, createdAt: new Date().toISOString() },
  { uid: "secretary-id", email: "secretary@church.org", displayName: "Evelyn Carter", role: UserRole.SECRETARY, status: UserStatus.ACTIVE, createdAt: new Date().toISOString() },
  { uid: "auditor-id", email: "auditor@church.org", displayName: "Arthur Pendelton", role: UserRole.AUDITOR, status: UserStatus.ACTIVE, createdAt: new Date().toISOString() }
];

// LocalStorage Keys
const KEYS = {
  USERS: "church_users",
  MEMBERS: "church_members",
  CATEGORIES: "church_categories",
  INCOMES: "church_incomes",
  EXPENSES: "church_expenses",
  PLEDGES: "church_pledges",
  PROJECTS: "church_projects",
  CASHBOOK: "church_cashbook",
  AUDIT_LOGS: "church_audit_logs"
};

// Initialize helper for Local Storage
function loadLocal<T>(key: string, backup: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(backup));
    return backup;
  }
  try {
    return JSON.parse(data) as T[];
  } catch {
    return backup;
  }
}

function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Re-computes absolute cashbook balances dynamically.
 * Updates bank, mobile money, and cash balances across chronological sequence.
 * This satisfies: "Create a digital cashbook with automatic running balance calculations."
 */
export function recalculateCashbookAndBalances() {
  const incomes = loadLocal<Income>(KEYS.INCOMES, DEFAULT_INCOMES);
  const expenses = loadLocal<Expense>(KEYS.EXPENSES, DEFAULT_EXPENSES);

  // Combine both into list of movements
  interface Movement {
    id: string;
    type: "income" | "expense";
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
    description: string;
    referenceId: string;
    createdBy: string;
    createdAt: string;
  }

  const movements: Movement[] = [];
  incomes.forEach(inc => {
    movements.push({
      id: "cb-" + inc.id,
      type: "income",
      amount: inc.amount,
      paymentMethod: inc.paymentMethod,
      date: inc.date,
      description: `Income: ${inc.categoryName}${inc.memberName ? ` from ${inc.memberName}` : ""}. ${inc.description}`,
      referenceId: inc.id,
      createdBy: inc.createdBy,
      createdAt: inc.createdAt
    });
  });

  expenses.forEach(exp => {
    movements.push({
      id: "cb-" + exp.id,
      type: "expense",
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      date: exp.date,
      description: `Expense: ${exp.categoryName}${exp.projectName ? ` for ${exp.projectName}` : ""}. ${exp.description}`,
      referenceId: exp.id,
      createdBy: exp.createdBy,
      createdAt: exp.createdAt
    });
  });

  // Sort chronologically (by primary date string, tie-break by createdAt)
  movements.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let runningBalance = 0;
  let bankBalance = 0;
  let momoBalance = 0;
  let cashBalance = 0;

  const cashbookEntries: CashbookEntry[] = movements.map(move => {
    const factor = move.type === "income" ? 1 : -1;
    const delta = move.amount * factor;

    runningBalance += delta;

    if (move.paymentMethod === PaymentMethod.BANK) {
      bankBalance += delta;
    } else if (move.paymentMethod === PaymentMethod.MOBILE_MONEY) {
      momoBalance += delta;
    } else {
      cashBalance += delta;
    }

    return {
      id: move.id,
      type: move.type,
      amount: move.amount,
      balanceAfter: runningBalance,
      paymentMethod: move.paymentMethod,
      referenceId: move.referenceId,
      date: move.date,
      description: move.description,
      createdBy: move.createdBy,
      createdAt: move.createdAt
    };
  });

  // Save recalculated cashbook
  saveLocal(KEYS.CASHBOOK, cashbookEntries);

  // Recalculate Project Balances as well
  const projects = loadLocal<Project>(KEYS.PROJECTS, DEFAULT_PROJECTS);
  const updatedProjects = projects.map(proj => {
    // Project Income: Sum of income transactions with matching pledge/project if tagged or via pledges
    // But simplified model: Let's sum incomes that are building funds or direct project support,
    // and Expenses spent for this project ID.
    const projectExpenses = expenses
      .filter(e => e.projectId === proj.id)
      .reduce((sum, e) => sum + e.amount, 0);

    // Sum of pledge payments toward this project
    const pledges = loadLocal<Pledge>(KEYS.PLEDGES, DEFAULT_PLEDGES);
    const projectPledgeIncome = pledges
      .filter(p => p.projectId === proj.id)
      .reduce((sum, p) => sum + p.amountPaid, 0);

    return {
      ...proj,
      incomeReceived: projectPledgeIncome, // Tracked from verified pledge contributions
      expensesSpent: projectExpenses,
      remainingBalance: projectPledgeIncome - projectExpenses
    };
  });
  saveLocal(KEYS.PROJECTS, updatedProjects);

  // Return final financial balances summary
  return {
    cash: cashBalance,
    bank: bankBalance,
    mobileMoney: momoBalance,
    total: runningBalance
  };
}

/**
 * Sync LocalStorage updates to/from Firestore if available
 */
async function syncToCloud<T>(collectionName: string, docId: string, data: any) {
  if (!firebaseAvailable) return;
  try {
    await setDoc(doc(db, collectionName, docId), sanitizeFirestoreData(data));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

async function deleteFromCloud(collectionName: string, docId: string) {
  if (!firebaseAvailable) return;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

// Initial balances setup
recalculateCashbookAndBalances();

export const ChurchStore = {
  // ---- AUDIT LOG ENGINE ----
  getAuditLogs(): AuditLog[] {
    return loadLocal<AuditLog>(KEYS.AUDIT_LOGS, []);
  },

  async addAuditLog(action: string, entityType: any, entityId: string, details: string, user: UserProfile | null) {
    const logs = loadLocal<AuditLog>(KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      action,
      entityType,
      entityId,
      performedBy: user?.uid || "anonymous",
      performedByName: user?.displayName || "Anonymous User",
      performedByRole: user?.role || UserRole.TREASURER,
      timestamp: new Date().toISOString(),
      details
    };
    logs.unshift(newLog); // Prepend new logs first
    saveLocal(KEYS.AUDIT_LOGS, logs);
    await syncToCloud("auditLogs", newLog.id, newLog);
  },

  // ---- USER AUTHENTICATION & PROFILES ----
  async syncAllFromCloud(user: UserProfile | null): Promise<boolean> {
    if (!firebaseAvailable || !db || !user) return false;
    
    // Collections of data with matching Firestore paths and local keys
    const collectionsToSync = [
      { key: KEYS.CATEGORIES, colName: "categories" },
      { key: KEYS.MEMBERS, colName: "members" },
      { key: KEYS.INCOMES, colName: "income" },
      { key: KEYS.EXPENSES, colName: "expenses" },
      { key: KEYS.PLEDGES, colName: "pledges" },
      { key: KEYS.PROJECTS, colName: "projects" },
      { key: KEYS.AUDIT_LOGS, colName: "auditLogs" }
    ];

    let updatedSomething = false;

    // Iterate through each collection, retrieving all documents and saving to client cache
    for (const { key, colName } of collectionsToSync) {
      try {
        const querySnapshot = await getDocs(collection(db, colName));
        const items: any[] = [];
        querySnapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        
        // Save to browser cache
        saveLocal(key, items);
        updatedSomething = true;
      } catch (err) {
        console.warn(`Could not sync collection "${colName}" from Firestore:`, err);
      }
    }

    if (updatedSomething) {
      recalculateCashbookAndBalances();
    }
    return updatedSomething;
  },

  getUsers(): UserProfile[] {
    return loadLocal<UserProfile>(KEYS.USERS, DEFAULT_USERS);
  },

  async syncUser(profile: UserProfile) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.uid === profile.uid);
    if (idx >= 0) {
      users[idx] = profile;
    } else {
      users.push(profile);
    }
    saveLocal(KEYS.USERS, users);
    await syncToCloud("users", profile.uid, profile);
  },

  // ---- MEMBERS ----
  getMembers(): Member[] {
    return loadLocal<Member>(KEYS.MEMBERS, DEFAULT_MEMBERS);
  },

  async saveMember(member: Member, user: UserProfile | null) {
    const list = this.getMembers();
    const isEdit = list.some(m => m.id === member.id);
    const updatedList = isEdit 
      ? list.map(m => m.id === member.id ? member : m)
      : [...list, member];
    
    saveLocal(KEYS.MEMBERS, updatedList);
    await syncToCloud("members", member.id, member);
    await this.addAuditLog(
      isEdit ? "EDIT_MEMBER" : "CREATE_MEMBER",
      "member",
      member.id,
      `${isEdit ? 'Modified' : 'Registered'} member profile of "${member.fullName}"`,
      user
    );
  },

  async deleteMember(id: string, user: UserProfile | null) {
    const list = this.getMembers();
    const member = list.find(m => m.id === id);
    if (!member) return;

    saveLocal(KEYS.MEMBERS, list.filter(m => m.id !== id));
    await deleteFromCloud("members", id);
    await this.addAuditLog(
      "DELETE_MEMBER",
      "member",
      id,
      `Archived member profile of "${member.fullName}"`,
      user
    );
  },

  // ---- CATEGORIES ----
  getCategories(): Category[] {
    const list = loadLocal<Category>(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    // Ensure any new default categories are automatically merged in if not present
    const missing = DEFAULT_CATEGORIES.filter(def => !list.some(item => item.id === def.id));
    if (missing.length > 0) {
      const merged = [...list, ...missing];
      saveLocal(KEYS.CATEGORIES, merged);
      return merged;
    }
    return list;
  },

  async saveCategory(category: Category, user: UserProfile | null) {
    const list = this.getCategories();
    const isEdit = list.some(c => c.id === category.id);
    const updatedList = isEdit 
      ? list.map(c => c.id === category.id ? category : c)
      : [...list, category];

    saveLocal(KEYS.CATEGORIES, updatedList);
    await syncToCloud("categories", category.id, category);
    await this.addAuditLog(
      isEdit ? "EDIT_CATEGORY" : "CREATE_CATEGORY",
      "category",
      category.id,
      `${isEdit ? 'Updated' : 'Created'} ${category.type} category "${category.name}" (Status: ${category.status})`,
      user
    );
  },

  async deleteCategory(id: string, user: UserProfile | null) {
    const list = this.getCategories();
    const cat = list.find(c => c.id === id);
    if (!cat) return;

    saveLocal(KEYS.CATEGORIES, list.filter(c => c.id !== id));
    await deleteFromCloud("categories", id);
    await this.addAuditLog(
      "DELETE_CATEGORY",
      "category",
      id,
      `Removed financial category "${cat.name}"`,
      user
    );
  },

  // ---- INCOME MANAGEMENT ----
  getIncome(): Income[] {
    return loadLocal<Income>(KEYS.INCOMES, DEFAULT_INCOMES);
  },

  async saveIncome(income: Income, user: UserProfile | null) {
    const list = this.getIncome();
    const isEdit = list.some(i => i.id === income.id);
    const updatedList = isEdit
      ? list.map(i => i.id === income.id ? income : i)
      : [...list, income];

    saveLocal(KEYS.INCOMES, updatedList);
    await syncToCloud("income", income.id, income);
    
    // Auto Update associated pledge if income tracks a member's thanksgiving/pledge
    if (!isEdit && income.memberId) {
      this.adjustPledgeBalanceOnIncome(income.memberId, income.amount, user);
    }

    recalculateCashbookAndBalances();

    await this.addAuditLog(
      isEdit ? "EDIT_INCOME" : "CREATE_INCOME",
      "income",
      income.id,
      `${isEdit ? 'Corrected' : 'Recorded'} income of Rwf ${income.amount} under "${income.categoryName}" via ${income.paymentMethod}`,
      user
    );
  },

  async deleteIncome(id: string, user: UserProfile | null) {
    const list = this.getIncome();
    const income = list.find(i => i.id === id);
    if (!income) return;

    saveLocal(KEYS.INCOMES, list.filter(i => i.id !== id));
    await deleteFromCloud("income", id);

    // Rollback associated pledge balance if deleted
    if (income.memberId) {
      this.adjustPledgeBalanceOnIncome(income.memberId, -income.amount, user);
    }

    recalculateCashbookAndBalances();

    await this.addAuditLog(
      "DELETE_INCOME",
      "income",
      id,
      `Deleted income record of Rwf ${income.amount} under "${income.categoryName}"`,
      user
    );
  },

  // Helper: auto-allocate income to member's unpaid or active pledges to keep remaining balances perfectly computed
  adjustPledgeBalanceOnIncome(memberId: string, amount: number, user: UserProfile | null) {
    const pledges = this.getPledges();
    // Find active pledges for this member with outstanding balances
    const activePledges = pledges.filter(p => p.memberId === memberId && p.status !== "Fully Paid");
    if (activePledges.length === 0) return;

    // Allocate payment incrementally to first outstanding pledge
    const targetPledge = activePledges[0];
    const newPaid = Math.max(0, targetPledge.amountPaid + amount);
    const newRemaining = Math.max(0, targetPledge.amount - newPaid);
    
    let nextStatus: "Pending" | "Partially Paid" | "Fully Paid" | "Overdue" = "Pending";
    if (newRemaining === 0) {
      nextStatus = "Fully Paid";
    } else if (newPaid > 0) {
      nextStatus = "Partially Paid";
    }

    const updatedPledge: Pledge = {
      ...targetPledge,
      amountPaid: newPaid,
      remainingBalance: newRemaining,
      status: nextStatus
    };

    this.savePledge(updatedPledge, user);
  },

  // ---- EXPENSES MANAGEMENT ----
  getExpenses(): Expense[] {
    return loadLocal<Expense>(KEYS.EXPENSES, DEFAULT_EXPENSES);
  },

  async saveExpense(expense: Expense, user: UserProfile | null) {
    const list = this.getExpenses();
    const isEdit = list.some(e => e.id === expense.id);
    const updatedList = isEdit
      ? list.map(e => e.id === expense.id ? expense : e)
      : [...list, expense];

    saveLocal(KEYS.EXPENSES, updatedList);
    await syncToCloud("expenses", expense.id, expense);
    recalculateCashbookAndBalances();

    await this.addAuditLog(
      isEdit ? "EDIT_EXPENSE" : "CREATE_EXPENSE",
      "expense",
      expense.id,
      `${isEdit ? 'Modified' : 'Paid out'} expense of Rwf ${expense.amount} for "${expense.categoryName}" via ${expense.paymentMethod}`,
      user
    );
  },

  async deleteExpense(id: string, user: UserProfile | null) {
    const list = this.getExpenses();
    const expense = list.find(e => e.id === id);
    if (!expense) return;

    saveLocal(KEYS.EXPENSES, list.filter(e => e.id !== id));
    await deleteFromCloud("expenses", id);
    recalculateCashbookAndBalances();

    await this.addAuditLog(
      "DELETE_EXPENSE",
      "expense",
      id,
      `Volded expense voucher of Rwf ${expense.amount} under "${expense.categoryName}"`,
      user
    );
  },

  // ---- PLEDGES ----
  getPledges(): Pledge[] {
    return loadLocal<Pledge>(KEYS.PLEDGES, DEFAULT_PLEDGES);
  },

  async savePledge(pledge: Pledge, user: UserProfile | null) {
    const list = this.getPledges();
    const isEdit = list.some(p => p.id === pledge.id);
    const updatedList = isEdit
      ? list.map(p => p.id === pledge.id ? pledge : p)
      : [...list, pledge];

    saveLocal(KEYS.PLEDGES, updatedList);
    await syncToCloud("pledges", pledge.id, pledge);
    recalculateCashbookAndBalances();

    await this.addAuditLog(
      isEdit ? "EDIT_PLEDGE" : "CREATE_PLEDGE",
      "pledge",
      pledge.id,
      `${isEdit ? 'Adjusted' : 'Recorded'} pledge of Rwf ${pledge.amount} from "${pledge.memberName}" toward "${pledge.projectName}"`,
      user
    );
  },

  async deletePledge(id: string, user: UserProfile | null) {
    const list = this.getPledges();
    const pledge = list.find(p => p.id === id);
    if (!pledge) return;

    saveLocal(KEYS.PLEDGES, list.filter(p => p.id !== id));
    await deleteFromCloud("pledges", id);
    recalculateCashbookAndBalances();

    await this.addAuditLog(
      "DELETE_PLEDGE",
      "pledge",
      id,
      `Voided pledge commitment of Rwf ${pledge.amount} from "${pledge.memberName}"`,
      user
    );
  },

  // ---- PROJECTS ----
  getProjects(): Project[] {
    return loadLocal<Project>(KEYS.PROJECTS, DEFAULT_PROJECTS);
  },

  async saveProject(project: Project, user: UserProfile | null) {
    const list = this.getProjects();
    const isEdit = list.some(p => p.id === project.id);
    const updatedList = isEdit
      ? list.map(p => p.id === project.id ? project : p)
      : [...list, project];

    saveLocal(KEYS.PROJECTS, updatedList);
    await syncToCloud("projects", project.id, project);

    await this.addAuditLog(
      isEdit ? "EDIT_PROJECT" : "CREATE_PROJECT",
      "project",
      project.id,
      `${isEdit ? 'Updated status of' : 'Launched'} project "${project.name}" (Status: ${project.status}, Budget: Rwf ${project.budget})`,
      user
    );
  },

  async deleteProject(id: string, user: UserProfile | null) {
    const list = this.getProjects();
    const proj = list.find(p => p.id === id);
    if (!proj) return;

    saveLocal(KEYS.PROJECTS, list.filter(p => p.id !== id));
    await deleteFromCloud("projects", id);

    await this.addAuditLog(
      "DELETE_PROJECT",
      "project",
      id,
      `Archived project planning folder for "${proj.name}"`,
      user
    );
  },

  // ---- CASHBOOK & METRICS ----
  getCashbookEntries(): CashbookEntry[] {
    return loadLocal<CashbookEntry>(KEYS.CASHBOOK, []);
  },

  getSystemBalances(): SystemBalances {
    return recalculateCashbookAndBalances();
  },

  // ---- SUPPORTING FILE STORAGE MOCK / REAL ----
  async uploadReceipt(file: File): Promise<{ url: string; name: string }> {
    if (firebaseAvailable && storage) {
      try {
        const fileRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { url, name: file.name };
      } catch (err) {
        console.error("Storage upload failed, fallback to local URL:", err);
      }
    }

    // Elegant fallback: create a web compatible Local Data URL so the receipt preview functions instantly offline!
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    });
  }
};
