import { MessageFlags, type Message, type Role } from "discord.js";

import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { ArgumentRegistry } from "@/utils/parser/Resolver";
import { canBotManageRole } from "@/utils/role";
import type { TranslationVariables } from "@/libs/i18n";

export const ROLE_ICON = icons.roles;

export function guildOnlyReply(client: { i18n: { t: (key: string) => string } }, message: Message): void {
  void message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(ROLE_ICON + " " + client.i18n.t("commands.role.guild_only")),
      ),
    ],
  });
}

export async function replyKey(
  client: { i18n: { t: (key: string, vars?: TranslationVariables) => string } },
  message: Message,
  icon: string,
  key: string,
  vars?: TranslationVariables,
): Promise<void> {
  const iconChar = (icons as Record<string, string>)[icon] ?? ROLE_ICON;
  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(Text(iconChar + " " + client.i18n.t(key, vars))),
    ],
  });
}

export async function replyText(client: { i18n: { t: (key: string) => string } }, message: Message, text: string): Promise<void> {
  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [new Container().text(Text(text))],
  });
}

export function ensureGuild(message: Message): message is Message & {
  guild: NonNullable<Message["guild"]>;
  guildId: string;
} {
  return Boolean(message.guild);
}

export function isManagedOrEveryone(role: Role): boolean {
  return role.managed || role.id === role.guild.roles.everyone.id;
}

export async function resolveRoleList(
  client: { i18n: { t: (key: string) => string } },
  message: Message,
  raw: string,
): Promise<{ roles: Role[]; errors: string[] }> {
  const roleArg = ArgumentRegistry.get("role");
  if (!roleArg) return { roles: [], errors: ["role resolver missing"] };

  const tokens = raw.split(/\s+/).filter(Boolean);
  const roles: Role[] = [];
  const errors: string[] = [];

  for (const token of tokens) {
    const result = await roleArg.resolve(token, {
      client,
      message,
      raw: token,
    });
    if (result.success) {
      roles.push(result.value as Role);
    } else {
      errors.push(`"${token}": ${result.error}`);
    }
  }

  return { roles, errors };
}

export function checkManageable(
  client: { i18n: { t: (key: string) => string } },
  message: Message,
  role: Role,
): { ok: true } | { ok: false; key: string; vars?: TranslationVariables } {
  if (isManagedOrEveryone(role)) {
    return { ok: false, key: "commands.role.cannot_manage" };
  }

  const botCheck = canBotManageRole(message.guild, role);
  if (!botCheck.ok) {
    return {
      ok: false,
      key: "commands.role.bot_hierarchy",
      vars: botCheck.reason ? { reason: botCheck.reason } : undefined,
    };
  }

  return { ok: true };
}
