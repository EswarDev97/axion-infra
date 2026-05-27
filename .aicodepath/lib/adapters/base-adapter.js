/**
 * Base Adapter Interface for Multi-AI Conversation Systems
 */
class BaseAdapter {
  get id() { throw new Error('Not implemented'); }
  get name() { throw new Error('Not implemented'); }
  get icon() { throw new Error('Not implemented'); }
  async detect(projectRoot) { throw new Error('Not implemented'); }
  async listSessions(projectRoot) { throw new Error('Not implemented'); }
  async getMessages(sessionID) { throw new Error('Not implemented'); }
  async getUsage(sessionID) { throw new Error('Not implemented'); }
  async watch(projectRoot) { throw new Error('Not implemented'); }
  async close() { /* optional */ }
}

class Session {
  constructor(data) {
    this.id = data.id;
    this.adapterID = data.adapterID;
    this.adapterName = data.adapterName;
    this.adapterIcon = data.adapterIcon;
    this.name = data.name || '';
    this.slug = data.slug || '';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.duration = data.duration || 0;
    this.isActive = data.isActive || false;
    this.totalTokens = data.totalTokens || 0;
    this.estimatedCost = data.estimatedCost || 0;
    this.messageCount = data.messageCount || 0;
    this.filePath = data.filePath || '';
    this.worktreeName = data.worktreeName || '';
    this.worktreePath = data.worktreePath || '';
  }
}

class Message {
  constructor(data) {
    this.id = data.id;
    this.sessionID = data.sessionID;
    this.role = data.role;
    this.content = data.content || '';
    this.timestamp = data.timestamp;
    this.model = data.model || '';
    this.tokenUsage = data.tokenUsage || {};
    this.toolUses = data.toolUses || [];
    this.thinkingBlocks = data.thinkingBlocks || [];
    this.contentBlocks = data.contentBlocks || [];
  }
}

class UsageStats {
  constructor(data) {
    this.sessionID = data.sessionID;
    this.totalInputTokens = data.totalInputTokens || 0;
    this.totalOutputTokens = data.totalOutputTokens || 0;
    this.totalCacheReadTokens = data.totalCacheReadTokens || 0;
    this.totalCacheWriteTokens = data.totalCacheWriteTokens || 0;
    this.estimatedCost = data.estimatedCost || 0;
    this.messageCount = data.messageCount || 0;
  }
}

module.exports = { BaseAdapter, Session, Message, UsageStats };
