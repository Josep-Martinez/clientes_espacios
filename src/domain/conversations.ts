import type { DemoConversation, DemoConversationMessage } from './models.ts';

export interface NewConversationRequest {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  requestedAt: string;
}

export interface NewConversationMessage extends DemoConversationMessage {
  conversationId: string;
}

export function requestConversation(
  conversations: DemoConversation[],
  request: NewConversationRequest,
): DemoConversation[] {
  const fields = [request.id, request.clientId, request.clientName, request.professionalId, request.requestedAt];
  if (fields.some((field) => typeof field !== 'string' || !field.trim())) return conversations;
  if (conversations.some((conversation) => conversation.id === request.id)) return conversations;

  const existingOpenRequest = conversations.some((conversation) =>
    conversation.clientId === request.clientId &&
    conversation.professionalId === request.professionalId &&
    conversation.status !== 'declined',
  );
  if (existingOpenRequest) return conversations;

  return [...conversations, {
    ...request,
    status: 'pending',
    messages: [],
  }];
}

export function updateConversationStatus(
  conversations: DemoConversation[],
  conversationId: string,
  professionalId: string,
  status: 'accepted' | 'declined',
): DemoConversation[] {
  const target = conversations.find((conversation) => conversation.id === conversationId);
  if (!target || target.professionalId !== professionalId || target.status !== 'pending') return conversations;

  return conversations.map((conversation) => conversation.id === conversationId
    ? { ...conversation, status }
    : conversation);
}

export function addConversationMessage(
  conversations: DemoConversation[],
  message: NewConversationMessage,
): DemoConversation[] {
  const body = message.body.trim();
  if (
    !message.id.trim() ||
    !message.conversationId.trim() ||
    !message.senderId.trim() ||
    !message.createdAt.trim() ||
    !body ||
    body.length > 500
  ) return conversations;

  const target = conversations.find((conversation) => conversation.id === message.conversationId);
  if (
    !target ||
    target.status !== 'accepted' ||
    (message.senderId !== target.clientId && message.senderId !== target.professionalId)
  ) return conversations;

  const { conversationId: _conversationId, ...storedMessage } = message;
  return conversations.map((conversation) => conversation.id === message.conversationId
    ? { ...conversation, messages: [...conversation.messages, { ...storedMessage, body }] }
    : conversation);
}

export function getConversationsForUser(
  conversations: DemoConversation[],
  userId: string,
): DemoConversation[] {
  if (!userId.trim()) return [];
  return conversations
    .filter((conversation) => conversation.clientId === userId || conversation.professionalId === userId)
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}
