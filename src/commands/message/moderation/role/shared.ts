import { MessageFlags, type Role } from "discord.js";

import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { ArgumentRegistry } from "@/utils/parser/Resolver";
import { canBotManageRole } from "@/utils/role";

export const ROLE_ICON = icons.roles;

export function guildOnlyReply(client: any, message: any) {
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(ROLE_ICON + " " + client.i18n.t("commands.role.guild_only")),
      ),
    ],
  });
}

export async function replyKey(
  client: any,
  message: any,
  icon: string,
  key: string,
  vars?: Record<string, unknown>,
) {
  const iconChar = (icons as Record<string, string>)[icon] ?? ROLE_ICON;
  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(Text(iconChar + " " + client.i18n.t(key, vars))),
    ],
  });
}

export async function replyText(client: any, message: any, text: string) {
  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [new Container().text(Text(text))],
  });
}

export function ensureGuild(message: any): message is any & {
  guild: NonNullable<typeof message.guild>;
  guildId: string;
} {
  return Boolean(message.guild);
}

export function isManagedOrEveryone(role: Role): boolean {
  return role.managed || role.id === role.guild.roles.everyone.id;
}

export async function resolveRoleList(
  client: any,
  message: any,
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

export async function checkManageable(
  client: any,
  message: any,
  role: Role,
): Promise<
  { ok: true } | { ok: false; key: string; vars?: Record<string, unknown> }
> {
  if (isManagedOrEveryone(role)) {
    return { ok: false, key: "commands.role.cannot_manage" };
  }

  const botCheck = canBotManageRole(message.guild, role);
  if (!botCheck.ok) {
    return {
      ok: false,
      key: "commands.role.bot_hierarchy",
      vars: { reason: botCheck.reason ?? "" },
    };
  }

  return { ok: true };
}
