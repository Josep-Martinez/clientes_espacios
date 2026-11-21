import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addConversationMessage,
  getConversationsForUser,
  requestConversation,
  updateConversationStatus,
} from '../src/domain/conversations.ts';

const request = {
  id: 'conversation-1',
  clientId: 'client-1',
  clientName: 'Nerea Demo',
  professionalId: 'pro-1',
  requestedAt: '2026-11-21T10:00:00.000Z',
};

describe('client and professional conversations', () => {
  it('creates a pending request and avoids duplicate open threads', () => {
    const pending = requestConversation([], request);
    const duplicate = requestConversation(pending, { ...request, id: 'conversation-2' });

    assert.equal(pending.length, 1);
    assert.equal(pending[0].status, 'pending');
    assert.equal(duplicate.length, 1);
    assert.equal(duplicate[0].id, 'conversation-1');
  });

  it('allows only the addressed professional to accept or decline a pending request', () => {
    const pending = requestConversation([], request);
    const rejectedActor = updateConversationStatus(pending, 'conversation-1', 'pro-2', 'accepted');
    assert.equal(rejectedActor[0].status, 'pending');

    const accepted = updateConversationStatus(pending, 'conversation-1', 'pro-1', 'accepted');
    assert.equal(accepted[0].status, 'accepted');
    const cannotChangeTwice = updateConversationStatus(accepted, 'conversation-1', 'pro-1', 'declined');
    assert.equal(cannotChangeTwice[0].status, 'accepted');
  });

  it('keeps pending or declined requests from sending messages', () => {
    const pending = requestConversation([], request);
    const message = { id: 'message-1', conversationId: 'conversation-1', senderId: 'client-1', body: 'Hola', createdAt: request.requestedAt };
    assert.equal(addConversationMessage(pending, message)[0].messages.length, 0);

    const declined = updateConversationStatus(pending, 'conversation-1', 'pro-1', 'declined');
    assert.equal(addConversationMessage(declined, message)[0].messages.length, 0);
  });

  it('lets only the client or professional send a non-empty message after acceptance', () => {
    const accepted = updateConversationStatus(requestConversation([], request), 'conversation-1', 'pro-1', 'accepted');
    const message = { id: 'message-1', conversationId: 'conversation-1', senderId: 'client-1', body: '  Hola, quiero consultar disponibilidad.  ', createdAt: request.requestedAt };
    const sent = addConversationMessage(accepted, message);

    assert.equal(sent[0].messages[0].body, 'Hola, quiero consultar disponibilidad.');
    assert.equal(addConversationMessage(sent, { ...message, id: 'message-2', senderId: 'stranger' })[0].messages.length, 1);
    assert.equal(addConversationMessage(sent, { ...message, id: 'message-3', body: '   ' })[0].messages.length, 1);
    assert.equal(addConversationMessage(sent, { ...message, id: 'message-4', body: 'x'.repeat(501) })[0].messages.length, 1);
  });

  it('returns conversations only to their participants', () => {
    const conversations = requestConversation([], request);
    assert.equal(getConversationsForUser(conversations, 'client-1').length, 1);
    assert.equal(getConversationsForUser(conversations, 'pro-1').length, 1);
    assert.equal(getConversationsForUser(conversations, 'space-owner').length, 0);
  });
});
