# Contributing

Thanks for taking the time to contribute to Samy!

This document explains the development workflow, branch structure, commit conventions, pull requests, and deployment process.

## Branch structure

Samy uses two main branches:

| Branch        | Purpose                             |
| ------------- | ----------------------------------- |
| `master`      | Production-ready code only          |
| `development` | Main development and testing branch |

### `master`

`master` contains only stable, production-ready code.

**Never commit directly to `master`.**

Changes reach `master` through a pull request from `development`.

Merging into `master` triggers the production deployment.

### `development`

`development` is the main development branch.

All contributions should be made on `development` and submitted through a pull request.

Changes merged into `development` are deployed to the development environment for testing before being released to production.

## Getting started

Fork the repository and clone your fork:

```bash
git clone https://github.com/theoldzoom/samy.git
cd samy
```

Switch to the `development` branch:

```bash
git checkout development
```

Make sure it is up to date:

```bash
git pull origin development
```

All changes should be made on the `development` branch.

## Making changes

Keep changes focused.

Avoid combining unrelated features, fixes, and refactors in the same pull request.

Before committing, run:

```bash
bun run format .
```

Make sure the project builds and that your changes work as expected.

For Discord-related changes, test the relevant command, event, interaction, or permission behavior in a development server.

## Commands

Samy contains both message commands and slash commands.

When adding or modifying a command, follow the existing project structure and conventions.

If a command has both a message-command and slash-command implementation, keep shared behavior in the appropriate `shared` module rather than duplicating the logic.

For example:

```text
src/commands/
├── message/
├── shared/
├── slash/
└── context/
```

## Database changes

Samy uses Prisma with PostgreSQL.

If your change modifies the Prisma schema, create a migration as part of the same change.

Do not modify existing migrations that have already been applied to shared or production databases.

After changing the schema, create a new migration:

```bash
bunx prisma migrate dev
```

Commit the generated migration together with the schema change.

For example:

```text
prisma/schema.prisma
prisma/migrations/<migration-name>/migration.sql
```

Database migrations should be reviewed carefully before opening a pull request.

## Commits

Keep commits focused and use clear commit messages.

Good:

```text
- Add avatar command
- Add message command
- Add slash command
- Add shared implementation
```

Also good for smaller changes:

```text
Fix permission check for restricted commands
```

Avoid messages such as:

```text
update
fix
stuff
changes
asdf
```

## Pull requests

Push your changes to your fork's `development` branch:

```bash
git add .
git commit -m "Add avatar command"
git push origin development
```

Then open a pull request targeting the development branch.

**Do not target `master` for normal contributions.**

Your pull request should explain:

- What does this change do?
- Why is the change needed?
- How was it tested?
- Are there any database migrations?
- Are there any configuration or environment-variable changes?
- Are command or documentation changes included?

For Discord UI or interaction changes, screenshots or recordings can be useful.

### Contributor roles

If you would like to receive a contributor **role in Samy** and a corresponding **role in the Samy Support Server**, include your **Discord user ID** somewhere in your pull request description.

Providing your Discord ID is optional and is only needed if you want these roles.

For example:

```text
## Contributor Role

Discord ID: 123456789012345678
```

For example:

```text
## Summary

Adds the `/avatar` command.

## Changes

- Added slash command
- Added message command
- Added shared implementation
- Added documentation

## Testing

- Tested in development server
- Tested with users and bots
- Tested invalid user input

## Database

No database changes.

## Contributor Role

Discord ID: 123456789012345678
```

## Code review

Once a pull request is opened, maintainers will review it.

If changes are requested, make them on your `development` branch and push them again:

```bash
git add .
git commit -m "Address review feedback"
git push origin development
```

The existing pull request will automatically update.

Once the pull request is approved, a maintainer will merge it into Samy's `development` branch.

## Deployment workflow

Samy's deployment workflow follows this structure:

```text
Your fork
    │
    │ Push changes to development
    ▼
development
    │
    │ Pull Request
    ▼
Samy development
    │
    │ Development deployment
    ▼
Testing
    │
    │ Pull Request
    ▼
master
    │
    │ Production deployment
    ▼
Production
```

### Development deployment

Changes merged into `development` are automatically deployed to the development environment.

This allows new features and fixes to be tested before they reach production.

### Production deployment

When `development` is considered stable, a maintainer opens a pull request:

```text
development → master
```

After the pull request is approved and merged, the production deployment is triggered.

Only maintainers should merge `development` into `master`.

## Code style

Before submitting a pull request, run:

```bash
bun run format .
```

Follow the existing TypeScript and project conventions.

When modifying existing code, prefer consistency with the surrounding code over introducing a different style.

## Questions and large changes

If you are unsure about an implementation or want to make a large architectural change, open an issue or discuss it with the maintainers through our Discord server before doing significant work.

For questions, help, or general support, visit the [Samy Support Server](https://samy.zoomhub.xyz/discord).

This helps prevent duplicated work and allows architectural decisions to be made before implementation begins.

Thanks for contributing to Samy!
