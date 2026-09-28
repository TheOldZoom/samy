import { InteractionType } from "@discordjs/core";
import { CDN } from "@discordjs/rest";

import InteractionHandler from "@/interaction/Handler";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  v2,
} from "@/utils/ui/components";
import { icons } from "@/utils/icons";
import { bannerURL } from "@/utils/user";

const cdn = new CDN();

export default new InteractionHandler({
  feature: "user",
  action: "avatar",

  async execute(client, interaction, component) {
    if (
      interaction.type !== InteractionType.MessageComponent ||
      !component.id
    ) {
      return;
    }

    const userId = component.id;
    const user = await client.api.users.get(userId);

    const avatar = user.avatar
      ? cdn.avatar(user.id, user.avatar, { size: 1024 })
      : cdn.defaultAvatar(
          user.discriminator === "0"
            ? Number((BigInt(user.id) >> 22n) % 6n)
            : Number(user.discriminator) % 5,
        );

    const banner = bannerURL(user);

    await interaction.reply({
      ...v2(
        new Container()
          .media(Media(avatar))
          .actionRow(
            ActionRow(
              ...(banner
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
      ephemeral: true,
    });
  },
});
