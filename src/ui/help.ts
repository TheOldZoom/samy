import { ButtonStyle } from "discord.js";

import { icons } from "@/utils/icons";

import type Client from "@/classes/client";
import type { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { buildHelp } from "@/utils/parser/HelpGenerator";
import {
  ActionRow,
  Button,
  Buttons,
  Container,
  SelectMenu,
  Separator,
  Text,
} from "@/ui/components";

const PAGE_SIZE = 5;

function categorize(client: Client) {
  const categories = new Map<string, MessageCommand[]>();

  for (const command of client.messageCommands.values()) {
    const category = command.options.category ?? "Uncategorized";
    const list = categories.get(category) ?? [];

    list.push(command);
    categories.set(category, list);
  }

  for (const list of categories.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return categories;
}

function metaLines(
  client: Client,
  entity: {
    cooldown?: number;
    guildOnly?: boolean;
    ownerOnly?: boolean;
  },
) {
  return [
    entity.cooldown
      ? client.i18n.t("commands.help.cooldown", {
          cooldown: entity.cooldown,
        })
      : null,

    entity.guildOnly ? client.i18n.t("commands.help.guild_only") : null,

    entity.ownerOnly ? client.i18n.t("commands.help.owner_only") : null,
  ].filter((line): line is string => line !== null);
}

function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const current = Math.min(Math.max(page, 0), totalPages - 1);

  const start = current * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    totalPages,
  };
}

function pageIndicator(
  client: Client,
  userId: string,
  page: number,
  totalPages: number,
) {
  return Button({
    label: client.i18n.t("commands.help.page_indicator", {
      current: page + 1,
      total: totalPages,
    }),

    customId: `help::noop::${userId}`,

    style: ButtonStyle.Secondary,
    disabled: true,
  });
}

export function resolveSubcommand(
  command: MessageCommand,
  subPath: string[],
): {
  sub: MessageSubcommand;
  canonicalPath: string[];
} | null {
  if (subPath.length === 0) {
    return null;
  }

  let current: MessageCommand | MessageSubcommand = command;
  const canonicalPath: string[] = [];

  for (const name of subPath) {
    const next = current.find(name);

    if (!next) {
      return null;
    }

    canonicalPath.push(next.name);
    current = next;
  }

  return {
    sub: current,
    canonicalPath,
  };
}

export function buildOverview(client: Client, userId: string, page = 0) {
  const t = client.i18n.t.bind(client.i18n);

  const categories = [...categorize(client).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const { pageItems, page: current, totalPages } = paginate(categories, page);

  const container = new Container()
    .text(
      Text(
        `${icons.info} **${t("commands.help.overview_description", {
          command: `${client.prefix}help <command>`,
        })}**`,
      ),
    )
    .separator(Separator())
    .text(
      Text(
        pageItems
          .map(([category, commands]) =>
            t("commands.help.category_summary", {
              category,
              count: commands.length,
              noun: commands.length === 1 ? "command" : "commands",
            }),
          )
          .join("\n"),
      ),
    );

  const select = SelectMenu({
    customId: `help::categories::${current}::${userId}`,

    placeholder: t("commands.help.select_category_placeholder"),

    options: pageItems.map(([category, commands]) => ({
      label: category,
      value: category,
      description: `${commands.length} ${
        commands.length === 1 ? "command" : "commands"
      }`,
    })),
  });

  container.actionRow(ActionRow(select));

  container.actionRow(
    ActionRow(
      Buttons.secondary(
        "◀",
        `help::home::${current - 1}::${userId}`,
      ).setDisabled(current === 0),

      pageIndicator(client, userId, current, totalPages),

      Buttons.secondary(
        "▶",
        `help::home::${current + 1}::${userId}`,
      ).setDisabled(current >= totalPages - 1),
    ),
  );

  return container;
}

export function buildCategoryView(
  client: Client,
  userId: string,
  category: string,
  page = 0,
) {
  const t = client.i18n.t.bind(client.i18n);

  const commands = categorize(client).get(category);

  if (!commands) {
    return null;
  }

  const { pageItems, page: current, totalPages } = paginate(commands, page);

  const container = new Container()
    .text(
      Text(
        `icons.info ${t("commands.help.category_title", {
          category,
        })}`,
      ),
    )
    .text(
      Text(
        icons.info + " " + t("commands.help.category_description", {
          count: commands.length,
          noun: commands.length === 1 ? "command" : "commands",
        }),
      ),
    )
    .separator(Separator())
    .text(
      Text(
        pageItems
          .map((cmd) =>
            t("commands.help.command_line", {
              prefix: client.prefix,
              name: cmd.name,
              description: cmd.description ? ` - ${cmd.description}` : "",
            }),
          )
          .join("\n"),
      ),
    );

  const select = SelectMenu({
    customId: `help::commands::${category}::${current}::${userId}`,

    placeholder: t("commands.help.select_command_placeholder"),

    options: pageItems.map((cmd) => ({
      label: cmd.name,
      value: cmd.name,
      description: cmd.description?.slice(0, 100),
    })),
  });

  container.actionRow(ActionRow(select));

  container.actionRow(
    ActionRow(
      Buttons.secondary(
        "◀",
        `help::category::${category}::${current - 1}::${userId}`,
      ).setDisabled(current === 0),

      pageIndicator(client, userId, current, totalPages),

      Buttons.secondary(
        "▶",
        `help::category::${category}::${current + 1}::${userId}`,
      ).setDisabled(current >= totalPages - 1),
    ),
  );

  container.actionRow(
    ActionRow(
      Buttons.secondary(
        t("commands.help.home_button"),
        `help::home::0::${userId}`,
      ),
    ),
  );

  return container;
}

export function buildCommandView(
  client: Client,
  userId: string,
  category: string,
  commandName: string,
  categoryPage = 0,
  subPage = 0,
) {
  const t = client.i18n.t.bind(client.i18n);

  const command = client.messageCommands.get(commandName);

  if (!command) {
    return null;
  }

  const prefix = client.prefix;

  const lines = [
    `${icons.info} **${t("commands.help.command_title", {
      prefix,
      name: command.name,
    })}**`,

    command.description || t("commands.help.no_description"),

    "",
  ];

  if (command.hasExecute) {
    lines.push(
      "```",

      buildHelp(
        {
          prefix,
          name: command.name,
        },
        command.arguments,
      ),

      "```",
    );
  } else if (command.subcommands.length > 0) {
    lines.push(t("commands.help.group_no_execute"));
  }

  if (command.aliases.length > 0) {
    lines.push(
      t("commands.help.aliases", {
        aliases: command.aliases.map((alias) => `\`${alias}\``).join(", "),
      }),
    );
  }

  const meta = metaLines(client, command);

  if (meta.length > 0) {
    lines.push(meta.join(" • "));
  }

  const container = new Container().text(Text(lines.join("\n")));

  if (command.subcommands.length > 0) {
    const {
      pageItems,
      page: current,
      totalPages,
    } = paginate(command.subcommands, subPage);

    const select = SelectMenu({
      customId: `help::subcommands::${category}::${command.name}::-::${categoryPage}::${current}::${userId}`,

      placeholder: t("commands.help.select_subcommand_placeholder"),

      options: pageItems.map((sub) => ({
        label: sub.name,
        value: sub.name,
        description: sub.description?.slice(0, 100),
      })),
    });

    container.actionRow(ActionRow(select));

    if (totalPages > 1) {
      container.actionRow(
        ActionRow(
          Buttons.secondary(
            "◀",
            `help::command::${category}::${command.name}::${categoryPage}::${current - 1}::${userId}`,
          ).setDisabled(current === 0),

          pageIndicator(client, userId, current, totalPages),

          Buttons.secondary(
            "▶",
            `help::command::${category}::${command.name}::${categoryPage}::${current + 1}::${userId}`,
          ).setDisabled(current >= totalPages - 1),
        ),
      );
    }
  }

  container.actionRow(
    ActionRow(
      Buttons.secondary(
        t("commands.help.back_button"),
        `help::category::${category}::${categoryPage}::${userId}`,
      ),

      Buttons.secondary(
        t("commands.help.home_button"),
        `help::home::0::${userId}`,
      ),
    ),
  );

  return container;
}

export function buildSubcommandView(
  client: Client,
  userId: string,
  category: string,
  commandName: string,
  subPath: string[],
  categoryPage = 0,
  subPage = 0,
) {
  const t = client.i18n.t.bind(client.i18n);

  const command = client.messageCommands.get(commandName);

  if (!command) {
    return null;
  }

  const resolved = resolveSubcommand(command, subPath);

  if (!resolved) {
    return null;
  }

  const { sub, canonicalPath } = resolved;

  const prefix = client.prefix;

  const usageName = [command.name, ...canonicalPath].join(" ");

  const pathKey = canonicalPath.join(",");

  const parentPathKey = canonicalPath.slice(0, -1).join(",");

  const lines = [
    `${icons.info} **${t("commands.help.command_title", {
      prefix,
      name: usageName,
    })}**`,

    sub.description || t("commands.help.no_description"),

    "",
  ];

  if (sub.hasExecute) {
    lines.push(
      "```",

      buildHelp(
        {
          prefix,
          name: usageName,
        },
        sub.arguments,
      ),

      "```",
    );
  } else if (sub.subcommands.length > 0) {
    lines.push(t("commands.help.group_no_execute"));
  }

  if (sub.aliases.length > 0) {
    lines.push(
      t("commands.help.aliases", {
        aliases: sub.aliases.map((alias) => `\`${alias}\``).join(", "),
      }),
    );
  }

  const meta = metaLines(client, sub);

  if (meta.length > 0) {
    lines.push(meta.join(" • "));
  }

  const container = new Container().text(Text(lines.join("\n")));

  if (sub.subcommands.length > 0) {
    const {
      pageItems,
      page: current,
      totalPages,
    } = paginate(sub.subcommands, subPage);

    const select = SelectMenu({
      customId: `help::subcommands::${category}::${command.name}::${pathKey}::${categoryPage}::${current}::${userId}`,

      placeholder: t("commands.help.select_subcommand_placeholder"),

      options: pageItems.map((child) => ({
        label: child.name,
        value: child.name,
        description: child.description?.slice(0, 100),
      })),
    });

    container.actionRow(ActionRow(select));

    if (totalPages > 1) {
      container.actionRow(
        ActionRow(
          Buttons.secondary(
            "◀",
            `help::subcommand::${category}::${command.name}::${pathKey}::${categoryPage}::${current - 1}::${userId}`,
          ).setDisabled(current === 0),

          pageIndicator(client, userId, current, totalPages),

          Buttons.secondary(
            "▶",
            `help::subcommand::${category}::${command.name}::${pathKey}::${categoryPage}::${current + 1}::${userId}`,
          ).setDisabled(current >= totalPages - 1),
        ),
      );
    }
  }

  const backCustomId =
    canonicalPath.length > 1
      ? `help::subcommand::${category}::${command.name}::${parentPathKey}::${categoryPage}::0::${userId}`
      : `help::command::${category}::${command.name}::${categoryPage}::0::${userId}`;

  container.actionRow(
    ActionRow(
      Buttons.secondary(t("commands.help.back_button"), backCustomId),

      Buttons.secondary(
        t("commands.help.home_button"),
        `help::home::0::${userId}`,
      ),
    ),
  );

  return container;
}
