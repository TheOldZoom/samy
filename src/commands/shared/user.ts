import { time, TimestampStyles, type GuildMember, type User } from "discord.js";

import { icons } from "@/utils/icons";

import type Client from "@/classes/client";
import { getBirthday } from "@/commands/shared/birthday";
import { getTimezone } from "@/commands/shared/timezone";
import { Container, Text } from "@/ui/components";

export async function UserInfo(
  client: Client,
  target: User,
  member?: GuildMember | null,
) {
  const [lastfm, bday, tz] = await Promise.all([
    client.prisma.lastFM.findUnique({ where: { userId: target.id } }),
    getBirthday(client, target.id).catch(() => null),
    getTimezone(client, target.id),
  ]);

  const displayName = member?.nickname ?? target.displayName ?? target.username;

  const joined = member?.joinedAt
    ? client.i18n.t("commands.user.joined", {
        date: time(member.joinedAt, TimestampStyles.LongDate),
      })
    : "";

  const boosting = member?.premiumSince
    ? client.i18n.t("commands.user.boosting", {
        date: time(member.premiumSince, TimestampStyles.LongDate),
      })
    : "";

  const footerParts = [
    lastfm
      ? client.i18n.t("commands.user.footer_lastfm", {
          username: `[${lastfm.username}](https://last.fm/user/${lastfm.username})`,
        })
      : null,
    bday
      ? client.i18n.t("commands.user.footer_birthday", {
          next: time(bday.nextBirthdayTimestamp, TimestampStyles.RelativeTime),
        })
      : null,
  ].filter(Boolean);

  const footer = footerParts.length ? `-# ${footerParts.join(" · ")}` : "";

  const timezone = tz
    ? client.i18n.t("commands.user.footer_timezone", {
        timezone: tz.timezone,
        time: tz.timeString,
        date: tz.dateString,
      })
    : "";

  return new Container().addSectionComponents((section) => {
    section.addTextDisplayComponents(
      Text(icons.Person + " " + client.i18n.t("commands.user.details", {
          tag: target.tag,
          id: target.id,
          displayName,
          created: time(target.createdAt, TimestampStyles.LongDate),
          joined,
          boosting,
          footer,
          timezone,
        }),
      ),
    );

    section.setThumbnailAccessory((thumbnail) =>
      thumbnail.setURL(target.displayAvatarURL({ size: 256 })),
    );

    return section;
  });
}
