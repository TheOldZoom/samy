import { MessageCommand } from "../../../classes/Command";

export default new MessageCommand({
  name: "error",
  description: "Throws an error for testing.",
  category: "Developer",

  async execute() {
    throw new Error("This is a test error!");
  },
});
