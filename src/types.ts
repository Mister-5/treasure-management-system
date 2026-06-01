/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Administrator",
  TREASURER = "Treasurer",
  PASTOR = "Pastor",
  SECRETARY = "Secretary",
  AUDITOR = "Auditor"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive"
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  status: "active" | "inactive";
  isCustom: boolean;
  createdAt: string;
}

export enum PaymentMethod {
  BANK = "Bank",
  MOBILE_MONEY = "Mobile Money",
  CASH = "Cash"
}

export interface Income {
  id: string;
  categoryId: string;
  categoryName: string;
  memberId?: string; // Opt for non-members
  memberName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  description: string;
  receiptUrl?: string;
  receiptName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  description: string;
  projectId?: string; // Linked project if any
  projectName?: string;
  receiptUrl?: string;
  receiptName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Pledge {
  id: string;
  memberId: string;
  memberName: string;
  projectId: string;
  projectName: string;
  amount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate: string;
  status: "Pending" | "Partially Paid" | "Fully Paid" | "Overdue";
  description: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  budget: number;
  incomeReceived: number;
  expensesSpent: number;
  remainingBalance: number;
  status: "Planning" | "Active" | "Completed" | "Suspended";
  description: string;
  createdAt: string;
}

export interface CashbookEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  balanceAfter: number;
  paymentMethod: PaymentMethod;
  referenceId: string; // ID of Income or Expense
  date: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string; // e.g., "CREATE_INCOME", "UPDATE_PROJECT", "DELETE_MEMBER"
  entityType: "income" | "expense" | "member" | "pledge" | "project" | "category";
  entityId: string;
  performedBy: string; // UID
  performedByName: string;
  performedByRole: UserRole;
  timestamp: string;
  details: string;
}

export interface SystemBalances {
  cash: number;
  bank: number;
  mobileMoney: number;
  total: number;
}
