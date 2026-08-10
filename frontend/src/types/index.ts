// src/types/index.ts

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  mp_alias: string | null;
}

export interface ParticipantOut {
  id: string;
  name: string;
  mp_alias?: string | null;
  pending_contribution: number;
}

export interface GroupResponse {
  group_id: string;
  name: string;
  invite_token: string;
  host_participant_id?: string | null;
  participants: ParticipantOut[];
}

export interface InvitePageResponse {
  group_id: string;
  group_name: string;
  invite_token: string;
  host_participant_id?: string | null;
  host_mp_alias?: string | null;
  participants: ParticipantOut[];
}

export interface JoinResponse {
  participant_id: string;
  participant_name: string;
  group_id: string;
  group_name: string;
  token: string;
}

export interface ContributionIn {
  participant_id: string;
  amount: number;
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
  inflation_note: string;
}

export interface SettleResponse {
  message: string;
  expenses_settled: number;
}

export interface ExpenseListItem {
  expense_id: string;
  description: string;
  amount: number;
  date: string;
  payer_name: string;
}

export interface PaymentButtonProps {
  alias: string | null;
  amount: number;
}

export interface ToastState {
  message: string;
  visible: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
}
