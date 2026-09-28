import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionType,
  type APIGuildMember,
  type APIUser,
} from "@discordjs/core";

import Command from "@/classes/Command";
import {
  ActionRow,
  Buttons,
  Container,
  Section,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";
import { icons } from "@/utils/icons";
import { avatarURL } from "@/utils/user";

type MemberInfo = Pick<APIGuildMember, "nick" | "joined_at" | "premium_since">;

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

  options: [
    {
      name: "user",
      description: "The user to look up (defaults to you)",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  async execute(client, interaction) {
    if (
      interaction.type !== InteractionType.ApplicationCommand ||
      interaction.data.type !== ApplicationCommandType.ChatInput
    ) {
      return;
    }

    const targetId = interaction.getOptionValue(
      "user",
      ApplicationCommandOptionType.User,
    );

    let user: APIUser | undefined;
    let member: MemberInfo | undefined;

    if (targetId) {
      member = interaction.data.resolved?.members?.[targetId];
      user = await client.api.users.get(targetId);
    } else {
      const currentUser = interaction.member?.user ?? interaction.user;

      if (!currentUser) {
        await interaction.reply({
          ...v2(new Container().text(Text("Couldn't find that user."))),
          ephemeral: true,
        });

        return;
      }

      user = await client.api.users.get(currentUser.id);
      member = interaction.member;
    }

    if (!user) {
      await interaction.reply({
        ...v2(new Container().text(Text("Couldn't find that user."))),
        ephemeral: true,
      });

      return;
    }

    const displayName = member?.nick ?? user.global_name ?? user.username;

    await interaction.reply({
      ...v2(
        new Container()
          .section(
            Section({
              description: [
                `-# ${icons.Person} **${displayName}** · ${user.username}`,
                `\`${user.id}\``,
                " ",
                `Created: **<t:${createdAt(user.id)}:D> (<t:${createdAt(user.id)}:R>)**`,
                member?.joined_at
                  ? `Joined: **<t:${unix(member.joined_at)}:D> (<t:${unix(member.joined_at)}:R>)**`
                  : "",
                member?.premium_since
                  ? `Boosting: **<t:${unix(member.premium_since)}:D> (<t:${unix(member.premium_since)}:R>)**`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
              thumbnail: avatarURL(user),
            }),
          )
          .separator(Separator())
          .actionRow(
            ActionRow(
              Buttons.secondary(
                "Avatar",
                `user:avatar:${user.id}`,
                icons.Person,
              ),
              ...(user.banner
                ? [
                    Buttons.secondary(
                      "Banner",
                      `user:banner:${user.id}`,
                      icons.image,
                    ),
                  ]
                : []),
            ),
          ),
      ),
      allowed_mentions: { parse: [] },
    });
  },
});
