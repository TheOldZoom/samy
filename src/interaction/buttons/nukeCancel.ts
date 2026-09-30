import InteractionHandler from "@/interaction/Handler";
import { response } from "@/utils/moderation";
import { v2, Container, Text } from "@/utils/ui/components";
import { icons } from "@/utils/icons";
export default new InteractionHandler({
  feature: "nuke",
  action: "cancel",
  async execute(_c, i, component) {
    if (!i.isButton() || !component.id) return;
    const [invoker] = component.id.split(".");
    if (i.user.id !== invoker)
      return await i.reply(
        response(
          "Only the moderator who opened this confirmation can use it.",
          true,
        ),
      );
    await i.updateMessage(
      v2(
        new Container().text(
          Text(`-# ${icons.deletechannel} · Channel recreation`),
          Text("Channel recreation cancelled."),
        ),
      ),
    );
  },
});
