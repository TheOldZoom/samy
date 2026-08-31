import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { extname, basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";

const API_URL = "https://discord.com/api/v10";
const ICONS_FILE = resolve(process.cwd(), "src/utils/icons.ts");
const ZIP_FILE = resolve(import.meta.dir, "emojis.zip");
const EMOJIS_DIR = resolve(import.meta.dir, "emojis");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    name: {
      type: "string",
      short: "n",
    },
    path: {
      type: "string",
      short: "p",
    },
  },
  strict: true,
});

const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json",
};

const userResponse = await fetch(`${API_URL}/users/@me`, {
  headers,
});

if (!userResponse.ok) {
  console.error(`Failed to authenticate (${userResponse.status})`);
  console.error(await userResponse.text());
  process.exit(1);
}

const user = (await userResponse.json()) as {
  id: string;
};

const applicationId = user.id;

console.log(`Application ID: ${applicationId}`);

let icons: Record<string, string> = {};

try {
  const content = await readFile(ICONS_FILE, "utf8");

  const match = content.match(
    /export\s+const\s+icons\s*=\s*(\{[\s\S]*?\})\s*as\s+const/,
  );

  if (match) {
    icons = Function(`"use strict"; return (${match[1]})`)() as Record<
      string,
      string
    >;
  }
} catch {}

console.log("Checking existing application emojis...");

const emojisResponse = await fetch(
  `${API_URL}/applications/${applicationId}/emojis`,
  {
    headers,
  },
);

if (!emojisResponse.ok) {
  console.error(
    `Failed to fetch application emojis (${emojisResponse.status})`,
  );
  console.error(await emojisResponse.text());
  process.exit(1);
}

const emojis = (await emojisResponse.json()) as {
  items: Array<{
    id: string;
    name: string;
  }>;
};

console.log(
  `Found ${emojis.items.length} existing Discord emoji${emojis.items.length === 1 ? "" : "s"}.`,
);

let files: string[] = [];

if (values.name && values.path) {
  files = [resolve(values.path)];
} else {
  const zipExists = await Bun.file(ZIP_FILE).exists();

  if (zipExists) {
    console.log("Extracting emojis.zip...");

    try {
      await rm(EMOJIS_DIR, {
        recursive: true,
        force: true,
      });

      await mkdir(EMOJIS_DIR, {
        recursive: true,
      });

      await $`unzip -q ${ZIP_FILE} -d ${EMOJIS_DIR}`;
    } catch (error) {
      console.error("Failed to extract emojis.zip.");
      console.error(error);
      process.exit(1);
    }
  } else {
    console.log("emojis.zip not found, using emojis/ folder...");
  }

  try {
    const entries = await readdir(EMOJIS_DIR, {
      recursive: true,
      withFileTypes: true,
    });

    files = entries
      .filter((entry) => {
        if (!entry.isFile()) return false;

        const extension = extname(entry.name).slice(1).toLowerCase();

        return ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);
      })
      .map((entry) => join(entry.parentPath, entry.name));
  } catch {
    console.log("emojis/ folder not found.");
  }
}

if (files.length === 0) {
  console.log(
    `No local emoji images found. Using ${emojis.items.length} Discord emoji${
      emojis.items.length === 1 ? "" : "s"
    }...`,
  );

  for (const emoji of emojis.items) {
    icons[emoji.name] = `<:${emoji.name}:${emoji.id}>`;
  }
} else {
  console.log(
    `Found ${files.length} local emoji${files.length === 1 ? "" : "s"}.`,
  );

  for (const filePath of files) {
    const extension = extname(filePath).slice(1).toLowerCase();

    const fileName = basename(filePath, extname(filePath));

    const name = values.name ?? fileName;
    const emojiName = name.length === 1 ? `e${name}` : name;

    if (emojiName.length > 32 || !/^[a-zA-Z0-9_]+$/.test(emojiName)) {
      console.error(`Skipping "${name}" — invalid Discord emoji name.`);

      continue;
    }

    const existingEmoji = emojis.items.find(
      (emoji) => emoji.name === emojiName,
    );

    if (existingEmoji) {
      const emoji = `<:${emojiName}:${existingEmoji.id}>`;

      icons[name] = emoji;

      console.log(`Already exists: ${emoji}`);

      continue;
    }

    const buffer = await readFile(filePath);

    console.log(`Uploading "${emojiName}"...`);

    const uploadResponse = await fetch(
      `${API_URL}/applications/${applicationId}/emojis`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: emojiName,
          image: `data:image/${extension};base64,${buffer.toString("base64")}`,
        }),
      },
    );

    if (!uploadResponse.ok) {
      console.error(
        `Failed to upload "${emojiName}" (${uploadResponse.status})`,
      );

      console.error(await uploadResponse.text());

      continue;
    }

    const emojiData = (await uploadResponse.json()) as {
      id: string;
      name: string;
    };

    const emoji = `<:${emojiName}:${emojiData.id}>`;

    icons[name] = emoji;

    emojis.items.push({
      id: emojiData.id,
      name: emojiData.name,
    });

    console.log(`Uploaded: ${emoji}`);
  }
}

await mkdir(resolve(process.cwd(), "src/utils"), {
  recursive: true,
});

const iconsFile = `export const icons = ${JSON.stringify(
  icons,
  null,
  2,
)} as const;\n`;

await writeFile(ICONS_FILE, iconsFile);

console.log("\nsrc/utils/icons.ts updated.");
