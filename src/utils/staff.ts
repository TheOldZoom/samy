import {
  type GuildMember,
  type PermissionResolvable,
  type Role,
} from "discord.js";
import prisma from "@/libs/prisma";
import { ensureGuild } from "@/utils/guild";

export const STAFF_PERMISSIONS: PermissionResolvable[] = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "ManageChannels",
  "BanMembers",
  "KickMembers",
  "ModerateMembers",
  "ManageMessages",
  "ManageWebhooks",
  "ManageThreads",
  "ViewAuditLog",
];

export async function getStaffRoles(guildId: string) {
  return prisma.staffRole.findMany({
    where: { guildId },
  });
}

export async function addStaffRole(guildId: string, roleId: string) {
  await ensureGuild(guildId);
  return prisma.staffRole.upsert({
    where: {
      guildId_roleId: {
        guildId,
        roleId,
      },
    },
    create: {
      guildId,
      roleId,
    },
    update: {},
  });
}

export async function removeStaffRole(guildId: string, roleId: string) {
  const result = await prisma.staffRole.deleteMany({
    where: {
      guildId,
      roleId,
    },
  });
  return result.count > 0;
}

export async function getMemberStaffRoles(
  member: GuildMember,
): Promise<Role[]> {
  const configured = await getStaffRoles(member.guild.id);
  const configuredRoleIds = new Set(configured.map((c) => c.roleId));

  const staffRoles: Role[] = [];

  for (const role of member.roles.cache.values()) {
    if (role.id === member.guild.id || role.managed) continue;

    if (configuredRoleIds.has(role.id)) {
      staffRoles.push(role);
      continue;
    }

    const hasStaffPerm = STAFF_PERMISSIONS.some((perm) =>
      role.permissions.has(perm),
    );

    if (hasStaffPerm) {
      staffRoles.push(role);
    }
  }

  return staffRoles;
}
