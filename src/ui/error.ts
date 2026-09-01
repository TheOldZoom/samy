import { Container, Text } from "./components";

import { icons } from "@/utils/icons";

export default function errorUI(text: string) {
  return new Container().addTextDisplayComponents(
    Text(`${icons.Wrong} ${text}`),
  );
}
