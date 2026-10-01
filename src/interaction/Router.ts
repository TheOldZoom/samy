import {
  ComponentType,
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  type Interaction,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import type Client from "@/classes/Client";
import { createInteraction } from "@/classes/Interaction";
import prisma from "@/libs/Prisma";
import { Container, Text, v2 } from "@/utils/ui/components";
import { parseComponentId } from "./ComponentId";
import { LogInteraction, UpdateInteractionUser } from "./Handler";

export async function routeInteraction(
  client: Client,
  interaction: Interaction,
) {
  if (!client.startInteraction()) {
    return;
  }

  const userUpdate = interaction.isAutocomplete()
    ? Promise.resolve()
    : UpdateInteractionUser(client, interaction);

  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(client, interaction);
    } else if (interaction.isContextMenuCommand()) {
      await handleContextCommand(client, interaction);
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(client, interaction);
    } else if (interaction.isMessageComponent()) {
      await handleComponent(client, interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(client, interaction);
    }
  } catch (error) {
    client.logger.error({ err: error }, "Error handling interaction");
  } finally {
    await userUpdate;
    client.finishInteraction();
  }
}

function getTomorrowMidnight(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

async function consumeDailyUse(
  userId: string,
  commandKey: string,
  dailyLimit: number,
): Promise<{ allowed: true } | { allowed: false; resetAt: number }> {
  const resetAt = getTomorrowMidnight();

  const record = await prisma.dailyUsage.findFirst({
    where: { userId, commandKey },
  });

  if (!record) {
    await prisma.dailyUsage.create({
      data: { userId, commandKey, count: 1, resetAt },
    });
    return { allowed: true };
  }

  if (record.resetAt <= new Date()) {
    await prisma.dailyUsage.update({
      where: { id: record.id },
      data: { count: 1, resetAt },
    });
    return { allowed: true };
  }

  if (record.count >= dailyLimit) {
    return { allowed: false, resetAt: record.resetAt.getTime() };
  }

  await prisma.dailyUsage.update({
    where: { id: record.id },
    data: { count: { increment: 1 } },
  });

  return { allowed: true };
}

async function handleCommand(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    client.logger.warn(`No command matched for "${interaction.commandName}"`);
    return;
  }

  const { execute, options, cooldown, key, dailyLimit } =
    command.resolve(interaction);

  const wrapped = createInteraction(interaction, options, false);

  if (!execute) {
    client.logger.warn(`No handler resolved for "${interaction.commandName}"`);
    return;
  }

  LogInteraction(client, interaction, key);

  const userId = interaction.user.id;

  if (
    command.defaultMemberPermissions !== undefined &&
    (!interaction.inGuild() ||
      !interaction.memberPermissions?.has(command.defaultMemberPermissions))
  ) {
    await wrapped
      .reply({
        ...v2(
          new Container().text(
            Text("You don't have permission to use this command."),
          ),
        ),
        ephemeral: true,
      })
      .catch(() => {});
    return;
  }

  if (cooldown) {
    const expires = client.useCooldown(key, userId, cooldown);

    if (expires) {
      await wrapped
        .reply({
          ...v2(
            new Container().text(
              Text(
                `You're on cooldown. Try again <t:${Math.ceil(expires / 1000)}:R>.`,
              ),
            ),
          ),
          ephemeral: true,
        })
        .catch(() => {});

      return;
    }
  }

  if (dailyLimit !== undefined) {
    const result = await consumeDailyUse(userId, key, dailyLimit);

    if (!result.allowed) {
      await wrapped
        .reply({
          ...v2(
            new Container().text(
              Text(
                `You've reached your daily limit. Try again <t:${Math.ceil(result.resetAt / 1000)}:R>.`,
              ),
            ),
          ),
          ephemeral: true,
        })
        .catch(() => {});

      return;
    }
  }

  try {
    await execute(client, wrapped);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error executing command "${command.name}"`,
    );

    const data = v2(
      new Container().text(Text("Something went wrong running that command.")),
    );

    await (
      wrapped.isReplied() || wrapped.isDeferred()
        ? wrapped.followUp(data)
        : wrapped.reply(data)
    ).catch(() => {});
  }
}

async function handleContextCommand(
  client: Client,
  interaction: ContextMenuCommandInteraction,
) {
  const lookupKey = interaction.commandType + ":" + interaction.commandName;
  const command = client.contextCommands.get(lookupKey);

  if (!command) {
    client.logger.warn(
      "No context command matched for " +
        JSON.stringify(interaction.commandName),
    );
    return;
  }

  const wrapped = createInteraction(interaction);
  const key = "context:" + lookupKey;

  LogInteraction(client, interaction, key);

  if (command.cooldown) {
    const expires = client.useCooldown(
      key,
      interaction.user.id,
      command.cooldown,
    );

    if (expires) {
      await wrapped.reply({
        ...v2(
          new Container().text(
            Text(
              "You are on cooldown. Try again <t:" +
                Math.ceil(expires / 1000) +
                ":R>.",
            ),
          ),
        ),
        ephemeral: true,
      });
      return;
    }
  }

  if (command.dailyLimit !== undefined) {
    const result = await consumeDailyUse(
      interaction.user.id,
      key,
      command.dailyLimit,
    );

    if (!result.allowed) {
      await wrapped.reply({
        ...v2(
          new Container().text(
            Text(
              "You have reached your daily limit. Try again <t:" +
                Math.ceil(result.resetAt / 1000) +
                ":R>.",
            ),
          ),
        ),
        ephemeral: true,
      });
      return;
    }
  }

  try {
    await command.execute(client, wrapped);
  } catch (error) {
    client.logger.error(
      { err: error },
      "Error executing context command " + JSON.stringify(command.name),
    );

    const data = {
      ...v2(
        new Container().text(Text("Something went wrong running that action.")),
      ),
      ephemeral: true,
    };

    await (
      wrapped.isReplied() || wrapped.isDeferred()
        ? wrapped.followUp(data)
        : wrapped.reply(data)
    ).catch(() => {});
  }
}

async function handleAutocomplete(
  client: Client,
  interaction: AutocompleteInteraction,
) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    client.logger.warn(
      `No command matched for autocomplete "${interaction.commandName}"`,
    );
    return;
  }

  const execute = command.resolveAutocomplete(interaction);
  const wrapped = createInteraction(interaction);

  if (!execute) {
    return;
  }

  LogInteraction(client, interaction, interaction.commandName);

  try {
    await execute(client, wrapped);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling autocomplete "${command.name}"`,
    );
  }
}

async function handleComponent(
  client: Client,
  interaction: MessageComponentInteraction,
) {
  const parsed = parseComponentId(interaction.customId);

  if (!parsed) {
    client.logger.warn(`Invalid component ID "${interaction.customId}"`);
    return;
  }

  const type =
    interaction.componentType === ComponentType.Button ? "buttons" : "selects";

  const handler = client.interactionHandlers[type].get(
    `${parsed.feature}:${parsed.action}`,
  );

  if (!handler) {
    client.logger.warn(
      `No ${type.slice(0, -1)} handler matched for "${parsed.feature}:${parsed.action}"`,
    );
    return;
  }

  LogInteraction(client, interaction, handler.key);
  try {
    await handler.execute(client, createInteraction(interaction), parsed);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling ${type.slice(0, -1)} "${handler.key}"`,
    );
  }
}

async function handleModal(
  client: Client,
  interaction: ModalSubmitInteraction,
) {
  const parsed = parseComponentId(interaction.customId);

  if (!parsed) {
    client.logger.warn(`Invalid modal ID "${interaction.customId}"`);
    return;
  }

  const handler = client.interactionHandlers.modals.get(
    `${parsed.feature}:${parsed.action}`,
  );

  if (!handler) {
    client.logger.warn(
      `No modal handler matched for "${parsed.feature}:${parsed.action}"`,
    );
    return;
  }

  LogInteraction(client, interaction, handler.key);
  try {
    await handler.execute(client, createInteraction(interaction), parsed);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling modal "${handler.key}"`,
    );
  }
}
