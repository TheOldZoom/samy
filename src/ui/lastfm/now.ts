import type { LastFMNow } from "@/libs/lastfm/src/types/now";
import type { TranslationVariables } from "@/libs/i18n";
import { Container, Text } from "../components";

import { icons } from "@/utils/icons";

type Translate = (key: string, variables?: TranslationVariables) => string;

export default function LastFMNowUI(data: LastFMNow, t: Translate) {
  const {
    username,
    track,
    artistScrobbles,
    albumScrobbles,
    trackScrobbles,
    totalScrobbles,
    profile,
  } = data;

  const isPlaying = track["@attr"]?.nowplaying === "true";

  const image =
    track.image?.find((image) => image.size === "extralarge")?.["#text"] ||
    track.image?.at(-1)?.["#text"];

  return new Container().addSectionComponents((section) => {
    section.addTextDisplayComponents(
      Text(
        `${icons.music} ${t("commands.lastfm.now_details", {
          state: t(
            isPlaying
              ? "commands.lastfm.now_playing"
              : "commands.lastfm.last_played",
          ),
          username,
          profileUrl: profile.url,
          track: track.name,
          artist: track.artist["#text"],
          album: track.album?.["#text"] ?? t("commands.lastfm.unknown_album"),
          artistScrobbles: artistScrobbles.toLocaleString(),
          albumScrobbles: albumScrobbles.toLocaleString(),
          trackScrobbles: trackScrobbles.toLocaleString(),
          totalScrobbles: totalScrobbles.toLocaleString(),
        })}`,
      ),
    );

    if (image) {
      section.setThumbnailAccessory((thumbnail) => thumbnail.setURL(image));
    }

    return section;
  });
}
