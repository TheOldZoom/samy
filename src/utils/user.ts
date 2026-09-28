import type { APIUser } from "@discordjs/core";
import { CDN } from "@discordjs/rest";

const cdn = new CDN();

export function avatarURL(user: APIUser, size = 256) {
  if (user.avatar) {
    return cdn.avatar(user.id, user.avatar, { size });
  }

  const index =
    user.discriminator === "0"
      ? Number((BigInt(user.id) >> 22n) % 6n)
      : Number(user.discriminator) % 5;

  return cdn.defaultAvatar(index);
}

export function bannerURL(user: APIUser, size = 1024) {
  if (!user.banner) {
    return null;
  }

  return cdn.banner(user.id, user.banner, {
    size,
  });
}
