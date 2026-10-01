import {
  ApplicationCommandOptionType,
  type APIGuildMember,
  type User,
} from "discord.js";

import Command from "@/classes/Command";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Section,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";
import { icons } from "@/utils/icons";
import { renderUserCard } from "@/utils/ui/cards/user";

type MemberInfo = Pick<APIGuildMember, "nick" | "joined_at" | "premium_since">;

function normalizeMember(member: unknown): MemberInfo | undefined {
  if (!member || typeof member !== "object") {
    return undefined;
  }

  if ("joined_at" in member) {
    return member as MemberInfo;
  }

  const guildMember = member as {
    nickname?: string | null;
    joinedAt?: Date | null;
    premiumSince?: Date | null;
  };

  return {
    nick: guildMember.nickname ?? null,
    joined_at: guildMember.joinedAt?.toISOString() ?? null,
    premium_since: guildMember.premiumSince?.toISOString() ?? null,
  };
}

function unix(date: string) {
  return Math.floor(Date.parse(date) / 1000);
}

function createdAt(id: string) {
  return Math.floor(Number((BigInt(id) >> 22n) + 1420070400000n) / 1000);
}

export default new Command({
  name: "user",
  description: "Shows information about a user",
  everywhere: true,
  ephemeral: true,
  options: [
    {
      name: "user",
      description: "The user to look up (defaults to you)",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  async execute(client, interaction) {
    const targetId = interaction.getOptionValue(
      "user",
      ApplicationCommandOptionType.User,
    );

    let user: User | undefined;
    let member: MemberInfo | undefined;

    await interaction.defer();

    if (targetId) {
      member = interaction.inCachedGuild()
        ? normalizeMember(interaction.guild.members.cache.get(targetId))
        : undefined;
      user = await client.users.fetch(targetId, { force: true });
    } else {
      user = await client.users.fetch(interaction.user.id, { force: true });
      member = normalizeMember(interaction.member);
    }

    if (!user) {
      await interaction.reply(
        v2(new Container().text(Text("Couldn't find that user."))),
      );

      return;
    }

    const displayName = member?.nick ?? user.globalName ?? user.username;

    const card = await renderUserCard({ user, member });

    await interaction.reply({
      files: [{ name: `user.${card.ext}`, attachment: card.data }],

      ...v2(
        new Container()
          .media(Media(`attachment://user.${card.ext}`))
          .text(
            Text(
              [
                `-# ${icons.Person} · **${displayName}** · ${user.username}`,
                `\`${user.id}\``,
                " ",
                `Created: **<t:${createdAt(user.id)}:D> (<t:${createdAt(user.id)}:R>)**`,
                member?.joined_at
                  ? `Joined: **<t:${unix(member.joined_at)}:D> (<t:${unix(member.joined_at)}:R>)**`
                  : "",
                member?.premium_since
                  ? `Boosted: **<t:${unix(member.premium_since)}:D> (<t:${unix(member.premium_since)}:R>)**`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          )
          .separator(Separator())
          .actionRow(
            ActionRow(
              Buttons.secondary(
                "Avatar",
                `user:avatar:${user.id}`,
                icons.Person,
              ),
              Buttons.secondary(
                "Banner",
                `user:banner:${user.id}`,
                icons.image,
              ),
            ),
          ),
      ),

      flags: 1 << 15,

      allowedMentions: {
        parse: [],
      },
    });
  },
});
