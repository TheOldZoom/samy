# Icons Script

The `scripts/icons/index.ts` script uploads custom emojis to your Discord application and generates `src/utils/icons.ts` with emoji references.

## Setup

1. Download `emojis.zip` from https://discord.gg/cGMng4gkE4
2. Place it in `scripts/icons/`

Or alternatively, place your emoji images directly in `scripts/icons/emojis/` (supports png, jpg, gif, webp).

## Usage

### Bulk upload from zip

```bash
bun scripts/icons/index.ts
```

This extracts `emojis.zip`, uploads all images as application emojis, and writes `src/utils/icons.ts`.

### Single file upload

```bash
bun scripts/icons/index.ts --name custom_name --path /path/to/image.png
```

Uploads a single image with a specific name.

## Output

The script generates `src/utils/icons.ts`:

```typescript
export const icons = {
  smile: "<:smile:123456789>",
  heart: "<:heart:987654321>",
} as const;
```

## Requirements

- `DISCORD_TOKEN` in environment
- `unzip` command available (for zip extraction)
