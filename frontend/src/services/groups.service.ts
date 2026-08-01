// src/services/groups.service.ts
import client from "../api/client";
import type {
  GroupResponse,
  ExpenseResponse,
  BalanceResponse,
  SettleResponse,
  InvitePageResponse,
  JoinResponse,
} from "../types";

export async function createGroup(
  name: string,
  participantNames: string[] = []
): Promise<GroupResponse> {
  const { data } = await client.post<GroupResponse>("/api/groups", {
    name,
    participant_names: participantNames,
  });
  return data;
}

export async function getGroups(): Promise<GroupResponse[]> {
  const { data } = await client.get<GroupResponse[]>("/api/groups");
  return data;
}

export async function getGroupById(groupId: string): Promise<GroupResponse> {
  const { data } = await client.get<GroupResponse>(`/api/groups/${groupId}`);
  return data;
}

export async function addExpense(
  groupId: string,
  payload: { amount: number; description: string; date: string; payer_id: string }
): Promise<ExpenseResponse> {
  const { data } = await client.post<ExpenseResponse>(
    `/api/groups/${groupId}/expenses`,
    payload
  );
  return data;
}

export async function getBalances(groupId: string): Promise<BalanceResponse> {
  const { data } = await client.get<BalanceResponse>(
    `/api/groups/${groupId}/balances`
  );
  return data;
}

export async function settleGroup(groupId: string): Promise<SettleResponse> {
  const { data } = await client.patch<SettleResponse>(
    `/api/groups/${groupId}/settle`
  );
  return data;
}

export async function getInvitePage(inviteToken: string): Promise<InvitePageResponse> {
  const { data } = await client.get<InvitePageResponse>(
    `/api/groups/invite/${inviteToken}`
  );
  return data;
}

export async function joinGroup(
  inviteToken: string,
  participantName: string
): Promise<JoinResponse> {
  const { data } = await client.post<JoinResponse>(
    `/api/groups/invite/${inviteToken}/join`,
    { participant_name: participantName }
  );
  return data;
}
}
