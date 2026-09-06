export type AfkUser = {
  guildId: string;
  userId: string;
  reason?: string;
  createdAt: Date;
};

export type AfkMention = {
  guildId: string;
  userId: string;
  mentionerId: string;
  messageId: string;
  channelId: string;
  createdAt: Date;
};
