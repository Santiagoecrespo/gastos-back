// src/types/index.ts

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

// Replaces UserBrief — participants have a name, not an email
export interface ParticipantOut {
  id: string;
  name: string;
}

export interface GroupResponse {
  group_id: string;
  name: string;
  invite_token: string;
  participants: ParticipantOut[];
}

export interface InvitePageResponse {
  group_id: string;
  group_name: string;
  invite_token: string;
  participants: ParticipantOut[];
}

export interface JoinResponse {
  participant_id: string;
  participant_name: string;
  group_id: string;
  group_name: string;
  token: string;
}

export interface ShareOut {
  participant_id: string;
  amount_owed: number;
}

export interface ExpenseResponse {
  expense_id: string;
  amount: number;
  split_per_person: number;
  shares: ShareOut[];
}

export interface BalanceTransaction {
  from_participant: ParticipantOut;
  to_participant: ParticipantOut;
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
