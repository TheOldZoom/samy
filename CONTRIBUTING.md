# Contributing

Thanks for taking the time to contribute to Samy.

Bug fixes, new features, documentation updates, and suggestions are welcome.

## Before you start

For large features or changes to the project structure, open an issue or talk to us in the [Samy Support Server](https://samy.zoomhub.xyz/discord) first.

This helps avoid duplicated work and makes sure the change fits the project.

## Branches

Samy uses two main branches:

| Branch        | Purpose                          |
| ------------- | -------------------------------- |
| `master`      | Stable production code           |
| `development` | New features, fixes, and testing |

Do not commit directly to `master`. Normal pull requests should target `development`.

Changes merged into `development` are deployed to the development environment. When the branch is stable, maintainers merge it into `master` for production.

## Getting started

Fork the repository and clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/samy.git
cd samy
git checkout development
```

Install the dependencies and create your environment file:

```bash
bun install
cp .env.example .env
```

Set `DISCORD_TOKEN` and `DATABASE_URL` in `.env`, then prepare the database and generated files:

```bash
bunx prisma generate
bunx prisma migrate dev
bun run icons
```

Start the bot in development mode:

```bash
bun run dev
```

You can also use Docker Compose. Set `DISCORD_TOKEN` and `POSTGRES_PASSWORD` in `.env`, then run:

```bash
docker compose up --build
```

## Project structure

```text
src/
├── classes/             # Command, event, client, and interaction foundations
├── events/              # Discord events and background tasks
├── interaction/
│   ├── commands/        # Slash commands
│   ├── contexts/        # Context menu commands
│   ├── buttons/         # Button handlers
│   ├── selects/         # Select menu handlers
│   ├── modals/          # Modal handlers
│   └── config/          # Shared server configuration commands
├── libs/                # Database and message scripting
└── utils/               # Shared feature and UI helpers
prisma/                  # Schema and migrations
docs/                    # Documentation
scripts/                 # Project scripts
```

## Making changes

Keep each change focused. Avoid mixing unrelated features, fixes, and refactors in one pull request.

Follow the existing code style and reuse shared utilities where possible. Commands should use the command framework in `src/classes/Command.ts`, and interactive components should use the matching handler directory under `src/interaction`.

When changing Discord behavior, test the relevant command, permissions, buttons, modals, or events in a development server.

### Commands

Slash commands live in `src/interaction/commands` and are grouped by purpose:

```text
commands/
├── fun/
├── moderation/
├── server/
└── utility/
```

New commands are loaded automatically. You do not need to add them to a central command list.

Use the existing `Command`, `Subcommand`, and `SubcommandGroup` classes. Add permission requirements, cooldowns, autocomplete, and ephemeral responses where appropriate.

Samy registers global application commands when it starts. New or changed commands may take a short while to appear in Discord.

### Interactions

Buttons, selects, and modals are stored in their matching directories under `src/interaction`.

Use the existing component ID helpers and keep shared logic outside individual handlers when it is used in more than one place.

### Message scripting

The embed and Components V2 scripting system lives in `src/libs/scripting`.

If you change its syntax or supported parameters, update [`docs/scripting.md`](docs/scripting.md) in the same pull request.

### Database changes

Samy uses Prisma with PostgreSQL.

After changing `prisma/schema.prisma`, create a new migration:

```bash
bunx prisma migrate dev --name describe_your_change
```

Commit the schema and generated migration together. Do not edit migrations that have already been applied to shared or production databases.

## Formatting and checks

Format the files you changed:

```bash
bun run format .
```

Check formatting before opening a pull request:

```bash
bun run format:check
```

Also run TypeScript checking:

```bash
bunx tsc --noEmit
```

There is currently no automated test suite, so include the manual testing you performed in your pull request.

## Commits

Use short, clear commit messages that explain the change.

Good examples:

```text
Add avatar command
Fix temporary mute expiry
Update scripting documentation
```

Avoid vague messages such as `update`, `fix`, or `changes`.

## Pull requests

Push your branch to your fork and open a pull request against `development`.

Your pull request should explain:

- What changed
- Why the change is needed
- How it was tested
- Whether it includes a database migration
- Whether it adds or changes environment variables
- Whether documentation was updated

Screenshots or recordings are helpful for visible Discord UI changes.

### Contributor role

If you want the contributor role in Samy and the support server, include your Discord user ID in the pull request description:

```text
## Contributor Role

Discord ID: 123456789012345678
```

This is optional.

## Code review

Maintainers may ask for changes. Make the updates on the same branch and push them again; the pull request will update automatically.

Once the pull request is approved, a maintainer will merge it into `development`.

Thanks for helping improve Samy!
