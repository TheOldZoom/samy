import { MessageFlags } from "discord.js";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import {
  INVOKE_COMMANDS,
  isInvokeCommand,
  getInvokeMessage,
  setInvokeMessage,
  deleteInvokeMessage,
  getAllInvokeMessages,
  validateInvokeScript,
  type InvokeCommand,
  type InvokeType,
} from "@/utils/invoke";

export default new MessageCommand({
  name: "invoke",
  description: "Customize response messages and DMs for moderation actions.",
  aliases: ["punishmentmessage", "custompunish"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageGuild"],

  subcommands: [
    new MessageSubcommand({
      name: "list",
      aliases: ["all", "show"],
      description:
        "List all moderation commands and their invoke message status.",
      userPermissions: ["ManageGuild"],
      async execute(client, message) {
        if (!message.guild) return;

        const all = await getAllInvokeMessages(message.guild.id);
        const map = new Map<string, { message?: boolean; dm?: boolean }>();

        for (const item of all) {
          const current = map.get(item.command) ?? {};
          if (item.type === "message") current.message = true;
          if (item.type === "dm") current.dm = true;
          map.set(item.command, current);
        }

        const lines = INVOKE_COMMANDS.map((cmd) => {
          const status = map.get(cmd);
          const msgIcon = status?.message ? icons.Correct : icons.Wrong;
          const dmIcon = status?.dm ? icons.Correct : icons.Wrong;
          return client.i18n.t("commands.invoke.list_item", {
            command: cmd,
            msgIcon,
            dmIcon,
          });
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.settings} ${client.i18n.t(
                  "commands.invoke.list_title",
                  {
                    lines: lines.join("\n"),
                    footer: client.i18n.t("commands.invoke.list_footer_use"),
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "message",
      aliases: ["msg", "channel"],
      description: "Set a custom public channel message for an action.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "action",
          aliases: ["cmd", "command"],
          type: "string",
          description: "The moderation action (e.g. ban, kick, jail, timeout).",
          required: true,
        },
        {
          name: "content",
          aliases: ["script", "text"],
          type: "string",
          description: "Plain text, an {embed} script, or a {cv2} script.",
          required: true,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const action = args.getString("action")?.toLowerCase();
        const content = args.getString("content");

        if (!action || !isInvokeCommand(action)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.invalid_action",
                    {
                      action: action ?? "",
                      actions: INVOKE_COMMANDS.map((c) => `\`${c}\``).join(
                        ", ",
                      ),
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        if (!content) return;

        const validation = validateInvokeScript(content);
        if (!validation.valid) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.validation_error",
                    {
                      error: validation.error ?? "Unknown error",
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        await setInvokeMessage(message.guild.id, action, "message", content);

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.invoke.set_message_success",
                  {
                    action,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "dm",
      aliases: ["directmessage"],
      description: "Set a custom direct message (DM) sent to punished users.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "action",
          aliases: ["cmd", "command"],
          type: "string",
          description: "The moderation action (e.g. ban, kick, jail, timeout).",
          required: true,
        },
        {
          name: "content",
          aliases: ["script", "text"],
          type: "string",
          description: "Plain text, an {embed} script, or a {cv2} script.",
          required: true,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const action = args.getString("action")?.toLowerCase();
        const content = args.getString("content");

        if (!action || !isInvokeCommand(action)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.invalid_action",
                    {
                      action: action ?? "",
                      actions: INVOKE_COMMANDS.map((c) => `\`${c}\``).join(
                        ", ",
                      ),
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        if (!content) return;

        const validation = validateInvokeScript(content);
        if (!validation.valid) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.validation_error",
                    {
                      error: validation.error ?? "Unknown error",
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        await setInvokeMessage(message.guild.id, action, "dm", content);

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.invoke.set_dm_success",
                  {
                    action,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "view",
      aliases: ["show", "info"],
      description: "View the custom message and DM configured for an action.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "action",
          aliases: ["cmd", "command"],
          type: "string",
          description: "The moderation action to inspect.",
          required: true,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const action = args.getString("action")?.toLowerCase();
        if (!action || !isInvokeCommand(action)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.invalid_action",
                    {
                      action: action ?? "",
                      actions: INVOKE_COMMANDS.map((c) => `\`${c}\``).join(
                        ", ",
                      ),
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        const [msgContent, dmContent] = await Promise.all([
          getInvokeMessage(message.guild.id, action, "message"),
          getInvokeMessage(message.guild.id, action, "dm"),
        ]);

        const text = [
          client.i18n.t("commands.invoke.view_title", { action }),
          "",
          client.i18n.t("commands.invoke.view_channel_label"),
          msgContent
            ? `\`\`\`\n${msgContent}\n\`\`\``
            : client.i18n.t("commands.invoke.view_default", {
                type: "response",
              }),
          "",
          client.i18n.t("commands.invoke.view_dm_label"),
          dmContent
            ? `\`\`\`\n${dmContent}\n\`\`\``
            : client.i18n.t("commands.invoke.view_default", { type: "DM" }),
        ].join("\n");

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new Container().text(Text(text))],
        });
      },
    }),

    new MessageSubcommand({
      name: "reset",
      aliases: ["clear", "delete", "remove"],
      description: "Reset custom punishment message or DM for an action.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "action",
          aliases: ["cmd", "command"],
          type: "string",
          description: "The moderation action to reset.",
          required: true,
        },
        {
          name: "type",
          aliases: ["target"],
          type: "string",
          description: "Either 'message', 'dm', 'jail', or 'all'.",
          required: false,
          default: "all",
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const action = args.getString("action")?.toLowerCase();
        const typeInput = (args.getString("type") ?? "all").toLowerCase();

        if (!action || !isInvokeCommand(action)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t(
                    "commands.invoke.invalid_action",
                    {
                      action: action ?? "",
                      actions: INVOKE_COMMANDS.map((c) => `\`${c}\``).join(
                        ", ",
                      ),
                    },
                  )}`,
                ),
              ),
            ],
          });
          return;
        }

        let deleted = 0;
        if (
          typeInput === "message" ||
          typeInput === "dm" ||
          typeInput === "jail"
        ) {
          deleted = await deleteInvokeMessage(
            message.guild.id,
            action,
            typeInput as InvokeType,
          );
        } else {
          deleted = await deleteInvokeMessage(message.guild.id, action);
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                deleted > 0
                  ? `${icons.Correct} ${client.i18n.t(
                      "commands.invoke.reset_success",
                      {
                        action,
                        type: typeInput,
                      },
                    )}`
                  : `${icons.info} ${client.i18n.t(
                      "commands.invoke.reset_none",
                      {
                        action,
                      },
                    )}`,
              ),
            ),
          ],
        });
      },
    }),
  ],

  arguments: [
    {
      name: "action",
      type: "string",
      description: "The moderation action (or 'list').",
      required: false,
      default: "list",
    },
    {
      name: "type",
      type: "string",
      description: "'message', 'dm', 'view', or 'reset'.",
      required: false,
    },
    {
      name: "content",
      type: "string",
      description: "Custom message script/content.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) return;

    const action = args.getString("action")?.toLowerCase();

    if (!action || action === "list") {
      const all = await getAllInvokeMessages(message.guild.id);
      const map = new Map<string, { message?: boolean; dm?: boolean }>();

      for (const item of all) {
        const current = map.get(item.command) ?? {};
        if (item.type === "message") current.message = true;
        if (item.type === "dm") current.dm = true;
        map.set(item.command, current);
      }

      const lines = INVOKE_COMMANDS.map((cmd) => {
        const status = map.get(cmd);
        const msgIcon = status?.message ? icons.Correct : icons.Wrong;
        const dmIcon = status?.dm ? icons.Correct : icons.Wrong;
        return client.i18n.t("commands.invoke.list_item", {
          command: cmd,
          msgIcon,
          dmIcon,
        });
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.settings} ${client.i18n.t("commands.invoke.list_title", {
                lines: lines.join("\n"),
                footer: client.i18n.t("commands.invoke.list_footer_syntax"),
              })}`,
            ),
          ),
        ],
      });
      return;
    }

    if (!isInvokeCommand(action)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t(
                "commands.invoke.unknown_action",
                {
                  action,
                  actions: INVOKE_COMMANDS.map((c) => `\`${c}\``).join(", "),
                },
              )}`,
            ),
          ),
        ],
      });
      return;
    }

    const type = args.getString("type")?.toLowerCase();
    const content = args.getString("content");

    if (!type || type === "view") {
      const [msgContent, dmContent, jailContent] = await Promise.all([
        getInvokeMessage(message.guild.id, action, "message"),
        getInvokeMessage(message.guild.id, action, "dm"),
        getInvokeMessage(message.guild.id, action, "jail"),
      ]);

      const text = [
        client.i18n.t("commands.invoke.view_title", { action }),
        "",
        client.i18n.t("commands.invoke.view_channel_label"),
        msgContent
          ? `\`\`\`\n${msgContent}\n\`\`\``
          : client.i18n.t("commands.invoke.view_default", { type: "response" }),
        "",
        client.i18n.t("commands.invoke.view_dm_label"),
        dmContent
          ? `\`\`\`\n${dmContent}\n\`\`\``
          : client.i18n.t("commands.invoke.view_default", { type: "DM" }),
        "",
        "**Jail Channel:**",
        jailContent
          ? `\`\`\`\n${jailContent}\n\`\`\``
          : "*Default jail message*",
      ].join("\n");

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [new Container().text(Text(text))],
      });
      return;
    }

    if (type === "reset" || type === "clear") {
      const deleted = await deleteInvokeMessage(message.guild.id, action);
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              deleted > 0
                ? `${icons.Correct} ${client.i18n.t(
                    "commands.invoke.reset_success",
                    {
                      action,
                      type,
                    },
                  )}`
                : `${icons.info} ${client.i18n.t("commands.invoke.reset_none", {
                    action,
                  })}`,
            ),
          ),
        ],
      });
      return;
    }

    if (type === "message" || type === "dm" || type === "jail") {
      if (!content) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.warning} ${client.i18n.t("commands.invoke.provide_content")}`,
              ),
            ),
          ],
        });
        return;
      }

      const validation = validateInvokeScript(content);
      if (!validation.valid) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.warning} ${client.i18n.t(
                  "commands.invoke.validation_error",
                  {
                    error: validation.error ?? "Unknown error",
                  },
                )}`,
              ),
            ),
          ],
        });
        return;
      }

      await setInvokeMessage(
        message.guild.id,
        action,
        type as InvokeType,
        content,
      );

      const successKey =
        type === "dm"
          ? "commands.invoke.set_dm_success"
          : type === "jail"
            ? "commands.invoke.set_jail_success"
            : "commands.invoke.set_message_success";

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(`${icons.Correct} ${client.i18n.t(successKey, { action })}`),
          ),
        ],
      });
      return;
    }

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            `${icons.warning} ${client.i18n.t(
              "commands.invoke.invalid_subaction",
              {
                type,
              },
            )}`,
          ),
        ),
      ],
    });
  },
});
