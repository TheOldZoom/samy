import { MessageCommand } from "@/classes/Command";
import {
  addSubcommand,
  removeSubcommand,
  toggleSubcommand,
} from "./role/addRemove";
import {
  createSubcommand,
  deleteSubcommand,
  editSubcommand,
} from "./role/manage";
import {
  copySubcommand,
  editColorSubcommand,
  editHoistSubcommand,
  editIconSubcommand,
  editMentionableSubcommand,
  editNameSubcommand,
  topColorSubcommand,
  topSubcommand,
} from "./role/edit";
import {
  allAddSubcommand,
  allRemoveSubcommand,
  allSubcommand,
  massAddSubcommand,
  massRemoveSubcommand,
} from "./role/bulk";
import {
  stickyAddSubcommand,
  tempSubcommand,
  unstickySubcommand,
  untempSubcommand,
} from "./role/temp";
import {
  dumpSubcommand,
  roleinfoSubcommand,
  rolesSubcommand,
} from "./role/info";

export default new MessageCommand({
  name: "role",
  description: "Manage roles.",
  category: "Moderation",
  aliases: ["r"],
  guildOnly: true,
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],

  arguments: [
    {
      name: "member",
      type: "member",
      required: true,
      description: "The member to toggle a role on.",
    },
    {
      name: "role",
      type: "role",
      required: true,
      description: "The role to toggle.",
    },
  ],

  async execute(client, message, args) {
    await toggleSubcommand.options.execute?.(client, message, args);
  },

  subcommands: [
    addSubcommand,
    removeSubcommand,
    toggleSubcommand,
    createSubcommand,
    editSubcommand,
    deleteSubcommand,
    editColorSubcommand,
    editNameSubcommand,
    editIconSubcommand,
    editHoistSubcommand,
    editMentionableSubcommand,
    topSubcommand,
    topColorSubcommand,
    copySubcommand,
    allSubcommand,
    allAddSubcommand,
    allRemoveSubcommand,
    massAddSubcommand,
    massRemoveSubcommand,
    tempSubcommand,
    untempSubcommand,
    stickyAddSubcommand,
    unstickySubcommand,
    roleinfoSubcommand,
    rolesSubcommand,
    dumpSubcommand,
  ],
});
