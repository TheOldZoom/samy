import { ChannelType, PermissionFlagsBits } from "discord.js";
import InteractionHandler from "@/interaction/Handler";
import { response } from "@/utils/moderation";
import { v2, Container, Text } from "@/utils/ui/components";
import { icons } from "@/utils/icons";
export default new InteractionHandler({
  feature: "nuke",
  action: "confirm",
  async execute(_c, i, component) {
    if (!i.isButton() || !i.guild || !component.id) return;
    const [invoker, id] = component.id.split(".");
    if (i.user.id !== invoker)
      return await i.reply(
        response(
          "Only the moderator who opened this confirmation can use it.",
          true,
        ),
      );
    if (!i.memberPermissions?.has(PermissionFlagsBits.ManageChannels))
      return await i.reply(
        response("You no longer have permission to manage channels.", true),
      );
    const old = await i.guild.channels.fetch(id!).catch(() => null);
    if (
      !old ||
      (old.type !== ChannelType.GuildText &&
        old.type !== ChannelType.GuildAnnouncement)
    )
      return await i.reply(response("That channel no longer exists.", true));
    const replacement = await old.clone({ reason: `Nuked by ${i.user.tag}` });
    await replacement.setPosition(old.position);
    await old.delete(`Nuked by ${i.user.tag}`);
    if ("send" in replacement)
      await replacement.send(
        v2(
          new Container().text(
            Text(`-# ${icons.deletechannel} · Channel recreation`),
            Text(`Channel recreated by <@${i.user.id}>.`),
          ),
        ),
      );
    await i.updateMessage(
      v2(
        new Container().text(
          Text(`-# ${icons.deletechannel} · Channel recreation`),
          Text(`Recreated ${replacement}.`),
        ),
      ),
    );
  },
});
