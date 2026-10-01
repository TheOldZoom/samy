import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";

import Command, { Subcommand, SubcommandGroup } from "@/classes/Command";
import prisma from "@/libs/Prisma";
import {
  adoptionRestrictionReason,
  loadFamilyGraph,
  marriageRestrictionReason,
} from "@/utils/family";
import { icons } from "@/utils/icons";
import { findMarriage, partnerUser } from "@/utils/marriage";
import { renderAdoptionCard } from "@/utils/ui/cards/adoption";
import { renderFamilyTreeCard } from "@/utils/ui/cards/familyTree";
import { renderMarriageCard } from "@/utils/ui/cards/marriage";
import { cacheDiscordUsers } from "@/utils/userCache";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";

const requiredUser = {
  name: "user",
  description: "The user",
  type: ApplicationCommandOptionType.User,
  required: true,
} as const;

const message = (content: string) => v2(new Container().text(Text(content)));

const marry = new SubcommandGroup({
  name: "marry",
  description: "Manage marriages",
  subcommands: [
    new Subcommand({
      name: "propose",
      description: "Propose marriage to another user",
      options: [requiredUser],
      async execute(_client, interaction) {
        await interaction.defer();
        const proposer = interaction.user;
        const recipient = interaction.options.getUser("user", true);
        await cacheDiscordUsers(proposer, recipient);

        if (recipient.id === proposer.id) {
          await interaction.reply(message("You cannot marry yourself."));
          return;
        }
        if (recipient.bot) {
          await interaction.reply(message("You cannot propose to a bot."));
          return;
        }

        const [proposerMarriage, recipientMarriage] = await Promise.all([
          findMarriage(proposer.id),
          findMarriage(recipient.id),
        ]);
        if (proposerMarriage || recipientMarriage) {
          await interaction.reply(
            message(
              proposerMarriage
                ? "You are already married."
                : "That user is already married.",
            ),
          );
          return;
        }

        const [adoptions, marriages] = await Promise.all([
          prisma.adoption.findMany(),
          prisma.marriage.findMany({ include: { members: true } }),
        ]);
        const restriction = marriageRestrictionReason(
          proposer.id,
          recipient.id,
          adoptions,
          marriages,
        );
        if (restriction) {
          await interaction.reply(message(restriction));
          return;
        }

        const card = await renderMarriageCard(proposer, recipient, "proposal");
        const proposerName = escapeMarkdown(
          proposer.globalName ?? proposer.username,
        );
        const recipientName = escapeMarkdown(
          recipient.globalName ?? recipient.username,
        );
        const id = `${proposer.id}.${recipient.id}`;

        await interaction.reply({
          files: [{ name: "marriage.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://marriage.png"))
              .text(
                Text(
                  `-# ${icons.heart} · Marriage proposal\n**${proposerName}** has proposed to **${recipientName}**.`,
                ),
              )
              .separator(Separator())
              .actionRow(
                ActionRow(
                  Buttons.success(
                    "Accept",
                    `family:marry-accept:${id}`,
                    icons.heart,
                  ),
                  Buttons.danger("Decline", `family:marry-decline:${id}`),
                ),
              ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "status",
      description: "View a user's marriage",
      options: [{ ...requiredUser, required: false }],
      async execute(_client, interaction) {
        await interaction.defer();
        const requestedUser =
          interaction.options.getUser("user") ?? interaction.user;
        const targetId = requestedUser.id;
        await cacheDiscordUsers(requestedUser);
        const marriage = await findMarriage(targetId);
        const target = marriage?.members.find(
          (member) => member.userId === targetId,
        )?.user;
        const spouse = partnerUser(marriage, targetId);

        if (!marriage || !target || !spouse) {
          await interaction.reply(message("That user is not married."));
          return;
        }

        const card = await renderMarriageCard(target, spouse, "married");
        const targetName = escapeMarkdown(target.username);
        const spouseName = escapeMarkdown(spouse.username);
        const marriedAt = Math.floor(marriage.createdAt.getTime() / 1000);

        await interaction.reply({
          files: [{ name: "marriage.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://marriage.png"))
              .text(
                Text(
                  `-# ${icons.heart} · Marriage\n**${targetName}** and **${spouseName}** have been married since <t:${marriedAt}:D> (<t:${marriedAt}:R>).`,
                ),
              )
              .separator(Separator()),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "divorce",
      description: "End your current marriage",
      ephemeral: true,
      async execute(_client, interaction) {
        await interaction.defer();
        await cacheDiscordUsers(interaction.user);
        const marriage = await findMarriage(interaction.user.id);
        const requester = marriage?.members.find(
          (member) => member.userId === interaction.user.id,
        )?.user;
        const spouse = partnerUser(marriage, interaction.user.id);
        if (!marriage || !requester || !spouse) {
          await interaction.reply(message("You are not married."));
          return;
        }

        const card = await renderMarriageCard(requester, spouse, "divorce");
        const id = `${requester.id}.${spouse.id}`;

        await interaction.reply({
          files: [{ name: "marriage.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://marriage.png"))
              .text(Text("Are you sure you want to end this marriage?"))
              .separator(Separator())
              .actionRow(
                ActionRow(
                  Buttons.danger(
                    "Confirm divorce",
                    `family:marry-divorce:${id}`,
                  ),
                  Buttons.secondary("Cancel", `family:marry-cancel:${id}`),
                ),
              ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
  ],
});

export default new Command({
  name: "family",
  description: "Make a wholesame family with other users",
  everywhere: true,
  subcommandGroups: [marry],
  subcommands: [
    new Subcommand({
      name: "adopt",
      description: "Ask another user to become your child",
      options: [requiredUser],
      async execute(_client, interaction) {
        await interaction.defer();
        const parent = interaction.user;
        const child = interaction.options.getUser("user", true);
        await cacheDiscordUsers(parent, child);

        if (parent.id === child.id) {
          await interaction.reply(message("You cannot adopt yourself."));
          return;
        }
        if (child.bot) {
          await interaction.reply(message("You cannot adopt a bot."));
          return;
        }

        const [adoptions, marriages] = await Promise.all([
          prisma.adoption.findMany(),
          prisma.marriage.findMany({ include: { members: true } }),
        ]);
        const restriction = adoptionRestrictionReason(
          parent.id,
          child.id,
          adoptions,
          marriages,
        );
        if (restriction) {
          await interaction.reply(message(restriction));
          return;
        }

        const card = await renderAdoptionCard(parent, child, "proposal");
        const parentName = escapeMarkdown(parent.globalName ?? parent.username);
        const childName = escapeMarkdown(child.globalName ?? child.username);
        const id = `${parent.id}.${child.id}`;

        await interaction.reply({
          files: [{ name: "adoption.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://adoption.png"))
              .text(
                Text(
                  `-# ${icons.friends} · Adoption proposal\n**${parentName}** would like to adopt **${childName}**.`,
                ),
              )
              .separator(Separator())
              .actionRow(
                ActionRow(
                  Buttons.success(
                    "Join family",
                    `family:adopt-accept:${id}`,
                    icons.friends,
                  ),
                  Buttons.danger("Decline", `family:adopt-decline:${id}`),
                ),
              ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "related",
      description: "List a user's partner and adopted children",
      options: [{ ...requiredUser, required: false }],
      async execute(_client, interaction) {
        await interaction.defer();
        const requestedUser =
          interaction.options.getUser("user") ?? interaction.user;
        await cacheDiscordUsers(requestedUser);

        const user = await prisma.user.findUnique({
          where: { id: requestedUser.id },
          include: {
            marriageMembership: {
              include: {
                marriage: {
                  include: { members: { include: { user: true } } },
                },
              },
            },
            parentAdoptions: {
              include: { child: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user) {
          await interaction.reply(message("Couldn't find that user."));
          return;
        }

        const partner =
          user.marriageMembership?.marriage.members.find(
            (member) => member.userId !== user.id,
          )?.user ?? null;
        const partnerLine = partner
          ? `- **${escapeMarkdown(partner.username)}** · \`${partner.id}\``
          : "- None";
        const children = user.parentAdoptions.length
          ? user.parentAdoptions.map(
              ({ child }) =>
                `- **${escapeMarkdown(child.username)}** · \`${child.id}\``,
            )
          : ["- None"];

        await interaction.reply({
          ...v2(
            new Container()
              .text(
                Text(
                  [
                    `-# ${icons.friends} · Related users`,
                    "### Partner",
                    partnerLine,
                    "### Adopted children",
                    ...children,
                  ].join("\n"),
                ),
              )
              .separator(Separator()),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "unadopt",
      description: "Unadopt a child or leave your parent",
      ephemeral: true,
      options: [{ ...requiredUser, required: false }],
      async execute(_client, interaction) {
        await interaction.defer();
        const relative = interaction.options.getUser("user");
        await cacheDiscordUsers(
          interaction.user,
          ...(relative ? [relative] : []),
        );

        const relationship = await prisma.adoption.findFirst({
          where: relative
            ? {
                OR: [
                  {
                    parentId: interaction.user.id,
                    childId: relative.id,
                  },
                  {
                    parentId: relative.id,
                    childId: interaction.user.id,
                  },
                ],
              }
            : { childId: interaction.user.id },
          include: { parent: true, child: true },
        });

        if (!relationship) {
          await interaction.reply(
            message(
              relative
                ? "You do not have a parent-child relationship with that user."
                : "You do not have an adoption parent. Select a child if you want to unadopt them.",
            ),
          );
          return;
        }

        const { parent, child } = relationship;
        const card = await renderAdoptionCard(parent, child, "separate");
        const parentName = escapeMarkdown(parent.username);
        const childName = escapeMarkdown(child.username);
        const requesterIsParent = interaction.user.id === parent.id;
        const id = `${interaction.user.id}.${parent.id}.${child.id}`;

        await interaction.reply({
          files: [{ name: "adoption.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://adoption.png"))
              .text(
                Text(
                  requesterIsParent
                    ? `Stop being **${childName}**'s parent?`
                    : `Leave **${parentName}** as your parent?`,
                ),
              )
              .separator(Separator())
              .actionRow(
                ActionRow(
                  Buttons.danger(
                    requesterIsParent ? "Unadopt child" : "Leave parent",
                    `family:unadopt-confirm:${id}`,
                  ),
                  Buttons.secondary("Cancel", `family:unadopt-cancel:${id}`),
                ),
              ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "tree",
      description: "View a user's complete family tree",
      options: [{ ...requiredUser, required: false }],
      async execute(_client, interaction) {
        await interaction.defer();
        const rootUser =
          interaction.options.getUser("user") ?? interaction.user;
        const rootId = rootUser.id;
        await cacheDiscordUsers(rootUser);
        const graph = await loadFamilyGraph(rootId);
        const users = graph.users;
        const available = new Set(users.map((user) => user.id));
        const edges = graph.edges.filter(
          (edge) => available.has(edge.from) && available.has(edge.to),
        );
        const card = await renderFamilyTreeCard(rootId, users, edges);
        const root = users.find((user) => user.id === rootId);
        const name = escapeMarkdown(root?.username ?? "Unknown user");

        await interaction.reply({
          files: [{ name: "family-tree.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://family-tree.png"))
              .text(
                Text(
                  `-# ${icons.friends} · **${name}**'s family tree\n${users.length} member${users.length === 1 ? "" : "s"}${graph.truncated ? " · limited to the first 24 connected members" : ""}`,
                ),
              )
              .separator(Separator()),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
  ],
});
