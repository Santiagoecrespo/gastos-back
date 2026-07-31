// src/types/index.ts — Shared TypeScript interfaces

export interface UserBrief {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface GroupResponse {
  group_id: string;
  name: string;
  members: UserBrief[];
  invite_token: string;
}

export interface InviteInfo {
  group_id: string;
  group_name: string;
  invite_token: string;
}

export interface JoinGroupResult {
  group_id: string;
  group_name: string;
  message: string;
}

export interface ShareOut {
  user_id: string;
  amount_owed: number;
}

export interface ExpenseResponse {
  expense_id: string;
  amount: number;
  split_per_person: number;
  shares: ShareOut[];
}

export interface BalanceTransaction {
  from_user: UserBrief;
  to_user: UserBrief;
  amount_adjusted: number;
  reference_date: string;
}

export interface BalanceResponse {
  group_id: string;
  balances: BalanceTransaction[];
  total_transactions: number;
  all_settled: boolean;
}

export interface SettleResponse {
  message: string;
  expenses_settled: number;
}

export interface AuthUser {
  id: string;
  email: string;
}
