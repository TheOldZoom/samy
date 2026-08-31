import Client from "@/classes/client";

import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
} from "@/ui/components";

export async function SamyResult(
  client: Client,
  invokerId: string,
  user?: { id: string; username?: string },
) {
  const images = await GetSamyImages(client);

  if (images.length === 0) {
    return new Container().text(Text("No Samy images are available."));
  }

  const image = images[Math.floor(Math.random() * images.length)]!;

  const container = new Container().media(Media(image.url));

  if (user) {
    const mention = `<@${user.id}>`;
    const label = user.username
      ? `-# Command sent by ${user.username} (${mention})`
      : `-# Command sent by ${mention}`;

    container.text(Text(label));
  }

  return container
    .separator(Separator())
    .actionRow(
      ActionRow(Buttons.secondary("Show more", `samy::again::${invokerId}`)),
    );
}

export async function GetSamyImages(
  client: Client,
): Promise<{ url: string }[]> {
  return client.prisma.samyImage.findMany({
    select: {
      url: true,
    },
  });
}
