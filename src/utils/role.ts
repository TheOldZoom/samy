import {
  GuildMember,
  type ColorResolvable,
  type Guild,
  type Role,
} from "discord.js";

export const HEX_COLOR_REGEX = /^#?([0-9a-fA-F]{6})$/;

export const GRADIENT_REGEX =
  /^#?([0-9a-fA-F]{6}),\s*#?([0-9a-fA-F]{6})(?:,\s*(\d+))?$/;

export function parseColor(input: string): number | null {
  const trimmed = input.trim();

  const gradient = trimmed.match(GRADIENT_REGEX);
  if (gradient) {
    return parseInt(gradient[1]!, 16);
  }

  const match = trimmed.match(HEX_COLOR_REGEX);
  if (!match) return null;

  const value = parseInt(match[1]!, 16);
  if (Number.isNaN(value)) return null;
  return value;
}

export function colorToHex(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "#000000";
  return `#${value.toString(16).padStart(6, "0").toUpperCase()}`;
}

export function canBotManageRole(
  guild: Guild,
  role: Role,
): { ok: boolean; reason?: string } {
  const botMember = guild.members.me;
  if (!botMember) return { ok: false, reason: "Bot is not in the guild." };

  if (role.managed) {
    return {
      ok: false,
      reason: "Cannot manage a role managed by an integration.",
    };
  }

  if (role.position >= botMember.roles.highest.position) {
    return {
      ok: false,
      reason:
        "The bot's highest role must be above the role you are trying to manage.",
    };
  }

  return { ok: true };
}

export function canAuthorManageRole(
  member: GuildMember,
  role: Role,
): { ok: boolean; reason?: string } {
  if (role.position >= member.roles.highest.position) {
    return {
      ok: false,
      reason: "The role is at or above your highest role.",
    };
  }
  return { ok: true };
}

export function isHigherPosition(
  a: { position: number },
  b: { position: number },
): boolean {
  return a.position > b.position;
}

export function buildRoleChanges(
  current: Role,
  updates: {
    name?: string;
    color?: ColorResolvable | null;
    hoist?: boolean;
    mentionable?: boolean;
    icon?: string | null;
    unicodeEmoji?: string | null;
    permissions?: bigint;
    position?: number;
  },
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  if (updates.name !== undefined && updates.name !== current.name) {
    changes.name = updates.name;
  }
  if (
    updates.color !== undefined &&
    updates.color !== null &&
    updates.color !== current.color
  ) {
    changes.color = updates.color;
  }
  if (updates.hoist !== undefined && updates.hoist !== current.hoist) {
    changes.hoist = updates.hoist;
  }
  if (
    updates.mentionable !== undefined &&
    updates.mentionable !== current.mentionable
  ) {
    changes.mentionable = updates.mentionable;
  }
  if (updates.icon !== undefined) {
    changes.icon = updates.icon;
  }
  if (updates.unicodeEmoji !== undefined) {
    changes.unicodeEmoji = updates.unicodeEmoji;
  }
  if (
    updates.permissions !== undefined &&
    updates.permissions !== current.permissions.bitfield
  ) {
    changes.permissions = updates.permissions;
  }
  if (
    updates.position !== undefined &&
    updates.position !== current.position
  ) {
    changes.position = updates.position;
  }

  return changes;
}