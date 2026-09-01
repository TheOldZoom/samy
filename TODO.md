# Samy TODO

A roadmap for Samy's development.

> Have an idea? Open an issue.

---

# Milestone 1 — Foundation

## Core

- [x] Discord client
- [x] Event handler
- [x] Slash commands
- [x] Message commands
- [x] Command deployment
- [x] Structured logging
- [x] Configuration system
- [x] Environment validation
- [x] Error handling
- [x] Graceful shutdown
- [x] Command cooldowns
- [x] Permission system

- [x] Internationalization (i18n) framework

- [x] Command aliases / shortcuts system (`alias add/remove/list`)
- [x] Restrict command to specific role (`restrictcommand`) TO FIX
- [x] Per-channel/member command & module enable/disable (`enablecommand`, `disablecommand`)
- [x] Custom prefix (server + personal)
- [x] Fake permissions for roles (`fakepermissions`)
- [x] View command permissions for a member or channel (`permissions`)
- [x] Time difference calculator between two Discord snowflake IDs (`timediff`)

## Database

- [x] Prisma
- [x] PostgreSQL

- [x] User profiles
- [x] Guild configuration
- [x] Command settings
- [x] User preferences
- [x] Locale settings

---

# Milestone 2 — Complete Utility

## User

- [x] User info
- [x] Avatar
- [x] Banner

- [x] Server-specific avatar/banner (`serveravatar`, `serverbanner`)
- [ ] Username/nickname history (`names`/`namehistory`)
- [ ] Last seen tracker (`seen`)

## Server

- [x] Server info
- [x] Role info
- [x] Channel info
- [x] Emoji info
- [x] Invite info
- [x] Member count
- [x] Bot list

- [x] Server icon / banner / splash viewer (`guildicon`, `guildbanner`, `splash`)
- [ ] Guild name change history (`gnames`)
- [ ] List all roles / all emotes in server
- [ ] List members in a role (`members`/`inrole`)
- [ ] Recent active invites list (`invites`)
- [ ] Recent server boosters (`boosters`, `boosters lost`)
- [ ] Recently joined members list (`newmembers`)
- [ ] Set guild icon / banner / splash background (`seticon`, `setbanner`, `setsplashbackground`)
- [ ] Booster custom color roles (create/rename/remove/random/dominant-color, icon, base role, award role on boost, sharing with other members, per-server limit, blacklist words, cleanup unused)
- [ ] Server settings hub: staff roles, mute/image-mute/reaction-mute roles, jail role & channel, mod-log & join-log channels, auto-nickname on join, Google safety level toggle
- [ ] Birthday admin config: lock/unlock system, restrict celebration to certain roles, set birthday role/channel, view full config

## Tools

- [x] Embed builder
- [x] Cv2 builder
- [x] Birthday
- [x] Timezone

- [x] AFK

- [ ] AFK mentions log (see who pinged you while AFK)
- [ ] Reminders (`remind add/list/remove`)
- [ ] Highlight / keyword notification system (`highlight add/remove/list/ignore`)
- [ ] Quick poll / timed poll (`poll`, `quickpoll`)
- [ ] Message quoting (`quote`)
- [ ] Screenshot a website (`screenshot`)
- [x] Character/symbol info (`charinfo`)
- [x] Random hex / dominant color from image (`randomhex`, `hex`/`dominant`)
- [ ] Copy an embed from a message link into builder syntax (`embed copy`)
- [ ] Pagination system for multi-page embeds (`pagination`)
- [ ] Sticky messages per channel (`stickymessage`)
- [ ] Timed nuke / scheduled channel recreation (`nuke add/remove/list/view`)
- [ ] Firstmessage / pin / unpin / pin archival system
- [ ] Repeating scheduled messages / auto-message timers per channel (`timer add/remove/list/view`)
- [x] Emoji management suite: add/remove/rename emote, bulk add/remove, remove duplicates, usage stats, jumbo/enlarge (`jumbo`/`enlarge`)
- [ ] Sticker management suite: add/remove/rename sticker, cleanup names, tag with server vanity
- [x] Random choice helper (`choose`)
- [ ] Brainly answer lookup (`brainly`)
- [ ] Convert video to audio file (`makemp3`)
- [ ] Stored embed library: list, create, edit, delete, preview named embeds

---

# Milestone 3 — Moderation

## Basic Moderation

- [x] Ban
- [x] Softban
- [x] Kick
- [x] Timeout
- [x] Untimeout

- [x] Temp ban (`tempban`)
- [x] Hard ban (permanent re-ban on rejoin) (`hardban`)
- [x] Mass unban (`unbanall`)
- [ ] Jail system (role-based mute alternative to timeout) (`jail`/`unjail`, jail role/channel setup)
- [ ] Image mute / reaction mute (`imute`/`iunmute`, `rmute`/`runmute`)
- [ ] Strip staff roles from a member (`stripstaff`)
- [ ] Chunk-ban recently joined members (`recentban`)
- [ ] Custom punishment DM / response messages per action (`invoke`)

## Warnings

- [x] Warn
- [x] Warning history
- [x] Moderation cases
- [x] Member notes
- [x] Evidence

- [ ] Moderator statistics (`modstats`)
- [ ] Full moderation history across all case types (`history`/`moderationhistory`)

## Channel Management

- [x] Slowmode
- [x] Lock
- [x] Unlock
- [x] Lockdown

- [x] Lockdown all channels at once (`lockdown all` / `unlock all`)
- [x] Lockdown ignore list (channels excluded from lock/unlock all)
- [x] Configurable default lockdown role
- [x] Hide/unhide a channel from a role or member
- [x] Toggle NSFW temporarily on a channel (`naughty`)
- [x] Revoke attach files/embed permissions per channel (`revokefiles`)
- [x] Move all members between voice channels (`moveall`)
- [x] Drag member(s) into a voice channel (`drag`)
- [ ] Thread management (rename, lock/unlock, add/remove member, watch for archival)

## Role Management

- [x] Add role
- [x] Remove role
- [x] Create role (with color/gradient)
- [x] Edit role
- [x] Delete role
- [x] Temporary roles
- [x] Bulk role add/remove for all humans or all bots
- [x] Bulk role add/remove for members already holding a specific role
- [x] Toggle role mentionable / hoisted
- [x] Set role icon
- [x] Set top role color
- [x] Sticky roles (reapply role on rejoin)
- [x] Dump all members of a role to a file (`dump`)

## Purge

- [x] Amount
- [x] User
- [x] Links
- [x] Bots
- [x] Attachments
- [x] Embeds

- [ ] Purge webhooks, reactions, stickers, emoji, images, files
- [ ] Purge messages containing a substring / starting or ending with a substring
- [ ] Purge messages mentioning a member
- [ ] Purge between two message IDs / before / after / up to a message link
- [ ] Purge activity messages (join/boost system messages)

## Logging

- [ ] Moderation logs
- [x] Full event logging system (channels, guild, images, members, messages, moderation, roles, voice) TO REWORK
- [x] One-command "log everything to one channel" setup (`logs setup`/`logs add all`)
- [x] Per-log-type ignore list for users/channels
- [x] Manual test log emitter

## Anti-Abuse

- [ ] Honeypot / bait channel for catching spammers
- [ ] Word / regex / invite / mass-mention / spoiler / caps / spam / emoji / music-file message filters with per-role exemptions
- [ ] Legacy word filter (add/remove/whitelist word) with one-click migration to Discord AutoMod
- [ ] Auto-kick/ban members who join and leave in under a set time during a raid (`raid`)
- [ ] Force/freeze a member's nickname (`forcenickname`)

---

# Milestone 4 — Server Features

- [x] Welcome messages
- [x] Leave messages
- [ ] Starboard
- [ ] Sticky roles
- [ ] Highlight notifications
- [ ] Server counters
- [ ] Bump reminders

- [x] Goodbye messages
- [ ] Boost messages
- [ ] Clownboard (inverse starboard for "worst" messages)
- [ ] Reaction triggers (auto-react to keywords, auto-react to new messages in a channel)
- [ ] Autoresponder (auto-reply to trigger words, optional role grant/removal, exclusive channel/role access)
- [ ] Autorole (assign role automatically on join)
- [ ] Button roles / reaction roles (self-assignable roles)
- [ ] Suggestions system (submit, upvote/downvote, approve/deny/consider, review channel, threads)
- [ ] Leveling / XP system (roles per level, leaderboard, custom level-up messages, rate multiplier, stacking)
- [ ] Giveaways (start/end/reroll, role/level/age/stay requirements, editable fields)
- [ ] Voicemaster (temp voice channels: lock/unlock/limit/rename/status/claim/transfer/permit/reject)
- [ ] Image-only / gallery channels
- [ ] Guild tag / badge reward system
- [ ] Bot appearance customization (avatar, banner, bio) for premium use
- [ ] Webhook management (create/edit/send/lock/delete)
- [ ] Social media link reposting (auto-embed TikTok/Instagram/Twitter links, strip/suppress originals)
- [ ] Extract all server emotes/stickers to a zip

## Social Feeds

- [ ] YouTube
- [ ] TikTok
- [ ] Instagram
- [ ] X / Twitter

- [ ] Twitch stream notifications
- [ ] Kick stream notifications
- [ ] Reddit subreddit post streaming
- [ ] SoundCloud new-track notifications
- [ ] Pinterest new-pin notifications
- [ ] Per-feed custom message templates + live/retweet/story toggles

---

# Milestone 5 — Music

## Last.fm

- [x] Account linking
- [x] Now Playing

- [ ] Listening statistics
- [ ] Top tracks
- [ ] Top artists
- [ ] Top albums
- [ ] Weekly charts
- [ ] Leaderboards

- [ ] "Who knows" artist/album/track leaderboard (server + global)
- [ ] Taste comparison between two members
- [ ] Play-count lookup for a specific artist/album/track
- [ ] Listening streak tracker
- [ ] Crowns system (most-played-artist ownership)
- [ ] Album collage generator
- [ ] Custom Now Playing embed layout/color/reactions/command name
- [ ] Milestone scrobble lookup

---

# Milestone 6 — External Services

- [ ] GitHub
- [ ] Steam
- [ ] Roblox
- [ ] Minecraft
- [ ] Valorant
- [ ] Xbox

- [ ] Weather
- [ ] Dictionary
- [ ] Urban Dictionary
- [ ] WikiHow

- [ ] Song recognition
- [ ] Audio transcription

- [ ] osu! profile lookup
- [ ] Telegram profile lookup
- [ ] CashApp profile lookup
- [ ] Cryptocurrency price lookup + gas price tracker
- [ ] Bitcoin/Litecoin/Ethereum transaction lookup + confirmation subscriptions
- [ ] Book / Goodreads lookup
- [ ] Manga / Anime / Character lookup (MyAnimeList)
- [ ] TV show / movie / game info lookup
- [ ] Wolfram Alpha query
- [ ] Text-to-speech (file + live in voice channel)
- [ ] Reverse image search
- [ ] OCR text detection (+ OCR with translation)
- [ ] Translate text between languages

---

# Milestone 7 — Fun

- [ ] Random choice
- [ ] Would you rather
- [ ] Rock Paper Scissors

## Text

- [ ] UwU
- [ ] Freakify

## Games

- [ ] Random games
- [ ] Roleplay

- [ ] Tic-tac-toe (with stats + leaderboard)
- [ ] Blacktea word game
- [ ] Custom tags/snippets system (add/edit/remove/search/random)
- [ ] Song lyrics lookup
- [ ] Google / DuckDuckGo search + image search
- [ ] Giphy / Tenor GIF search
- [ ] "Steal" an emote from a message
- [ ] Message deletion/edit snipe + reaction snipe
- [ ] Image manipulation suite (pixelate, blur, invert, deepfry, grayscale, magik, caption/meme/motivate text, GIF effects like spin/zoom/wormhole, legofy, background removal, GIF conversion)
- [ ] Sticker management (add/remove/rename/copy from other servers)
- [ ] Live sports scores (NBA, NFL, MLB, NHL, soccer)

---

# Milestone 8 — Dashboard

- [ ] Web dashboard
- [ ] Server management
- [ ] Command configuration
- [ ] Moderation logs
- [ ] Auto moderation settings
- [ ] Analytics

- [ ] Most-used commands leaderboard (`topcommands`)
- [ ] Bot status page link (`status`)

---

# Future

- [x] Command documentation generator
- [ ] Contribution guide

- [ ] Premium
- [ ] Custom bot instances
- [ ] Custom commands
- [ ] More integrations

- [ ] Donation / support link command
- [ ] Booster custom color roles (with icon, sharing, base role, filters, cleanup)
