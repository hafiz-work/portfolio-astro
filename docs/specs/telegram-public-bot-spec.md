# Telegram Public Bot Spec

**Status:** Implemented locally 2026-10-08 (backend branch `feat/telegram-public-bot`, uncommitted) - owner deploy steps pending (§8 Phase 5 👤). Decisions locked 2026-10-08 (see §1.2). Admin side explicitly out of scope ("admin kita bincang lain").
**Repos:** `hono-workers` (backend - almost all of it) + `portfolio-astro` (one stable resume endpoint).
**Read alongside:** `hono-workers/docs/telegram.md` (current bot: owner-only), `hono-workers/src/routes/telegram.ts`, `hono-workers/src/services/telegram.ts`.

> **For the implementing agent:** read §0 first. This doc is the contract - if reality forces a deviation, update this doc (and its Status) in the same change. Report status strictly (DONE / PARTIAL / BLOCKED / NOT DONE).

The existing bot answers **only the owner** (chat id = `users.telegram_chat_id`) and silently drops everyone else. This spec gives every *other* chat a small public bot: a `/start` menu that sends the resume PDF, links GitHub and LinkedIn, and relays free-text messages to the owner, who replies through the bot.

---

## 0. Agent guide

### 0.1 Context in 30 seconds

- One bot, one webhook: `POST /telegram/webhook` in `hono-workers` (Hono on Cloudflare Workers, D1 + KV). Mounted **outside** `/api` (the CSRF gate would 403 Telegram).
- The webhook already has a gate, in this order: secret header → global cap `telegram:global` 600/h (D1) → `update_id` dedupe (KV, 10 min) → owner branch (plain-fetch `TelegramClient`) → **public: ignored**.
- This spec replaces only the "public: ignored" branch with a **grammY** bot, called through `bot.handleUpdate(update)` **after** the existing gate. The owner branch stays framework-free, plus one addition (§4.4 reply relay).
- grammY was installed before and removed when public chats were dropped (`3f48e29` → `3ea68ab`). Re-adding it is expected (`docs/telegram.md` § "No framework").

### 0.2 Who reads what

| Session | Read first | Build from | Templates |
|---|---|---|---|
| Frontend (`portfolio-astro`) | §3 | Phase 1 (§8) | `src/lib/constants.ts` (`RESUME_URL`) |
| Backend (`hono-workers`) | §2, §4, §5, §6 | Phases 2-4 | `src/routes/telegram.ts`, `src/services/telegram.ts`, `src/services/resume.ts`, migration `016_quotes.sql` (shape) |
| Verify / ops | §7, §9 | Phase 5 | `scripts/verify-telegram.ts`, `scripts/telegram-set-webhook.ts` |

### 0.3 Ground rules (hard)

- **Never** run remote migrations, `wrangler deploy`, or `--remote` from an agent session. The owner deploys.
- **Never** hand updates to grammY before the existing gate (secret → global cap → dedupe). Do not use `webhookCallback` - it would bypass the gate.
- **Owner chat never reaches grammY.** The owner branch runs first and returns.
- **No grammY plugins in v1** (no Menu, Conversations, Session). Core `Bot` + `InlineKeyboard` covers every flow here (§4). Add a plugin only when a flow needs state that core can't express.
- **No KV writes per message** (free-plan KV write quota is 1000/day). New state goes to D1. The existing dedupe write is the one accepted exception.
- **No PII beyond what relay needs:** customer chat id + message ids + first name/username for the owner's header. No phone numbers, no message bodies stored (bodies are copied by Telegram, not saved by us).
- Plain text only (no `parse_mode`), same as today, so user text needs no escaping.
- Touch only the files listed in §8; update `hono-workers/docs/telegram.md` in the same change.

### 0.4 Status ledger

| Layer | Status |
|---|---|
| Spec | ✅ this document |
| Frontend: stable `/resume.pdf` endpoint | ✅ build + `astro check` clean; dev: 200 `application/pdf`, bytes identical to the `RESUME_URL` file |
| Backend: grammY public bot (`/start`, resume, socials, `/id`, `/help`) | ✅ verify-telegram (Hono app + grammY web build, stubbed Bot API) |
| Backend: relay (customer → owner, owner reply → customer) + migration 017 | ✅ verify checks + 017 applied locally |
| Backend: per-chat cap, webhook `allowed_updates`, `setMyCommands`, `TELEGRAM_BOT_INFO` | ✅ code + checks; script not run against a real bot |
| Verify script extended + docs/telegram.md updated | ✅ 42 checks (was 31); all other verify-*.ts pass; type-check clean |
| Remote migrate / deploy / re-register webhook (owner) | ❌ not started |

Do not upgrade a ❌ without the matching §8 Verify actually run.

---

## 1. Scope

### 1.1 In scope (v1)

| # | Feature | Who sees it |
|---|---|---|
| F1 | `/start` (and `/help`): greeting + inline keyboard | any non-owner chat |
| F2 | **Resume** button → bot sends the current resume PDF as a document; recorded as a resume download with `source = 'telegram'` | public |
| F3 | **GitHub** / **LinkedIn** URL buttons (open the profile, no callback) | public |
| F4 | **Message Hafiz** button → tells the user to just type; any non-command text from a public chat is relayed to the owner | public |
| F5 | Owner **replies** (Telegram "Reply") to a relayed message → the reply is copied back to that customer | owner |
| F6 | `/id` → replies with the chat's own id (replaces the chat-id hint the old public `/start` gave; needed to link the owner chat) | public |

### 1.2 Decisions (2026-10-08)

| Question | Decision |
|---|---|
| Framework for public side | grammY core, via `bot.handleUpdate` after the existing gate |
| Payments | none in v1 |
| Catalog / admin | later; v1 content is code constants (§4.1) |
| Human handoff | relay through the bot (owner's personal account never exposed) |
| Language | English (matches the site); one constant block, easy to change |

### 1.3 Out of scope (YAGNI)

Payments / Telegram Stars, product catalog + admin CMS, multi-step conversations, sessions, group-chat support for public features (private chats only), Mini App, file_id caching of the resume (§6.3), analytics beyond the existing resume-download row, i18n.

---

## 2. Flows

```
update ─▶ secret? ─▶ global cap ─▶ dedupe ─▶ chat is owner?
                                              ├─ yes ─▶ reply_to a relayed msg? ─▶ yes: copyMessage → customer (F5)
                                              │                                 └─ no : existing owner commands
                                              └─ no  ─▶ private chat? ─▶ no : ignore (200)
                                                                        └─ yes: per-chat cap ─▶ grammY public bot
                                                                                 ├─ /start, /help  → menu (F1)
                                                                                 ├─ /id            → chat id (F6)
                                                                                 ├─ cb "resume"    → sendDocument + record download (F2)
                                                                                 ├─ cb "message"   → "Type your message…" (F4)
                                                                                 ├─ other /command → menu
                                                                                 └─ text / media   → relay to owner (F4)
```

GitHub / LinkedIn are URL buttons: Telegram opens them client-side, no update reaches us.

---

## 3. Frontend: stable resume URL (`portfolio-astro`)

**Why:** the backend must not hard-code `hafizbahtiar-resume-4-4.pdf` (two places to bump on every new resume). A stable path also stops old shared links 404ing when the version changes.

| File | Action |
|---|---|
| `src/pages/resume.pdf.ts` | **create** - `GET` serves the file at `RESUME_URL` from the static assets |

```ts
// src/pages/resume.pdf.ts
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { RESUME_URL } from "../lib/constants";

export const prerender = false;

// Stable alias for the current resume (Telegram bot, shared links). The file
// itself stays versioned in public/docs; bump RESUME_URL only.
export const GET: APIRoute = async ({ request }) => {
    const res = await env.ASSETS.fetch(new URL(RESUME_URL, request.url));
    if (!res.ok) return new Response("Not found", { status: 404 });
    return new Response(res.body, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="Hafiz-Bahtiar-Resume.pdf"',
            "Cache-Control": "public, max-age=300",
        },
    });
};
```

- `env.ASSETS` must be added to the `cloudflare:workers` declaration in `src/env.d.ts` (`ASSETS: { fetch(input: Request | URL | string): Promise<Response> }`) - the binding already exists (`dist/server/wrangler.json` → `assets.binding = "ASSETS"`).
- In `astro dev` the binding may be absent; fall back to `fetch(new URL(RESUME_URL, request.url))` when `env.ASSETS` is undefined.
- No tracking here: the site's buttons keep their beacon; the bot records its own row (§4.2).

---

## 4. Backend: public bot (`hono-workers`)

### 4.1 Content constants (`src/services/telegram-public.ts`)

```ts
export const PUBLIC_BOT = {
    resumeUrl: "https://hafizbahtiar.com/resume.pdf",          // §3
    resumeFilename: "Hafiz-Bahtiar-Resume.pdf",
    github: "https://github.com/hafizbahtiar",
    linkedin: "https://www.linkedin.com/in/hafizbahtiar/",
    site: "https://hafizbahtiar.com",
    text: {
        welcome: "Hi! I'm Hafiz's bot - Backend & Flutter developer in Kuala Lumpur.\nPick an option below, or just type a message and I'll pass it on.",
        messagePrompt: "Type your message here and send it - it goes straight to Hafiz. He'll reply in this chat.",
        relayed: "Sent to Hafiz ✓ He'll reply here.",
        resumeCaption: "Hafiz Bahtiar - resume (PDF)",
        resumeFailed: "Couldn't send the resume right now. You can download it at hafizbahtiar.com/resume.pdf",
        slowDown: "You're sending messages quickly - please wait a minute.",
    },
} as const;
```

Keyboard (`InlineKeyboard` from grammY core):

```
[ 📄 Resume ]            callback "resume"
[ GitHub ] [ LinkedIn ]  url buttons
[ ✉️ Message Hafiz ]     callback "message"
```

### 4.2 Bot construction

```ts
// src/services/telegram-public.ts (sketch)
import { Bot, InlineKeyboard, InputFile } from "grammy";

export function createPublicBot(env: CloudflareBindings) {
    // botInfo from a secret: without it grammY calls getMe on every request.
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN!, { botInfo: JSON.parse(env.TELEGRAM_BOT_INFO!) });
    const menu = new InlineKeyboard()
        .text("📄 Resume", "resume").row()
        .url("GitHub", PUBLIC_BOT.github).url("LinkedIn", PUBLIC_BOT.linkedin).row()
        .text("✉️ Message Hafiz", "message");

    bot.command(["start", "help"], (ctx) => ctx.reply(PUBLIC_BOT.text.welcome, { reply_markup: menu }));
    bot.command("id", (ctx) => ctx.reply(`Your chat id: ${ctx.chat.id}`));

    bot.callbackQuery("resume", async (ctx) => {
        await ctx.answerCallbackQuery();
        try {
            // Fetched + uploaded by grammY: always the current file, our filename.
            await ctx.replyWithDocument(new InputFile(new URL(PUBLIC_BOT.resumeUrl), PUBLIC_BOT.resumeFilename),
                { caption: PUBLIC_BOT.text.resumeCaption });
            await new ResumeDownloadService(env.hono_workers_db).record({ source: "telegram" });
        } catch (error) {
            console.error("telegram resume send failed:", error);
            await ctx.reply(PUBLIC_BOT.text.resumeFailed);
        }
    });
    bot.callbackQuery("message", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.reply(PUBLIC_BOT.text.messagePrompt);
    });

    bot.on("message::bot_command", (ctx) => ctx.reply(PUBLIC_BOT.text.welcome, { reply_markup: menu }));
    bot.on("message", (ctx) => relayToOwner(env, ctx));   // §4.3
    // grammY does not redact the token in its errors - always go through redactToken (§7).
    bot.catch((err) => console.error("telegram public bot error:", redactToken(String(err.error), env.TELEGRAM_BOT_TOKEN)));
    return bot;
}
```

- Resume download row: `source = 'telegram'`, `ip_address`/`country` null (Telegram hides them), `user_agent = null`. `resume_downloads.source` is free text ≤40 - no migration needed.
- `bot.catch` keeps the webhook answering 200 (contract with Telegram: no retry storms).

### 4.3 Relay: customer → owner

```ts
async function relayToOwner(env, ctx) {
    const ownerChatId = await new TelegramOwnerService(env.hono_workers_db).ownerChatId();
    if (!ownerChatId) return ctx.reply(PUBLIC_BOT.text.unavailable); // no owner linked, or muted
    if (!await consumeGlobalAllowance(env.hono_workers_db, `telegram:relay:${ctx.chat.id}`, RELAY_CAP)) {
        return ctx.reply(PUBLIC_BOT.text.slowDown);
    }
    const from = ctx.from;
    const header = `From ${from?.first_name ?? "someone"}${from?.username ? ` (@${from.username})` : ""} · chat ${ctx.chat.id}`;
    const head = await ctx.api.sendMessage(ownerChatId, header);
    const copy = await ctx.api.copyMessage(ownerChatId, ctx.chat.id, ctx.msg.message_id);
    await new TelegramRelayService(env.hono_workers_db).remember([head.message_id, copy.message_id], ctx.chat.id);
    await ctx.reply(PUBLIC_BOT.text.relayed);
}
```

- `copyMessage` (not `forwardMessage`): works for any message type and doesn't depend on the customer's forward-privacy setting.
- Both owner-side message ids map to the customer, so replying to either the header or the copy works.
- `RELAY_CAP = { limit: 10, windowSeconds: 3600 }` per customer chat.
- **Found while implementing:** `isOwnerChat()` used `ownerChatId()`, which filters the mute flag - a muted owner would have fallen into the public bot. `isOwnerChat()` now matches the linked chat regardless of mute (mute = no pushes/relays only).

### 4.4 Relay: owner reply → customer (owner branch, plain fetch)

In `routes/telegram.ts`, **before** `ownerReply()`:

```ts
const replyTo = update.message?.reply_to_message?.message_id;
if (replyTo) {
    const customer = await new TelegramRelayService(db).customerFor(replyTo);
    if (customer) {
        const r = await client.copyMessage(customer, chatId, update.message!.message_id);
        await client.sendMessage(chatId, r.ok ? "Delivered ✓" : `Not delivered: ${r.description}`);
        return c.json({ ok: true });
    }
}
```

- Extend `TelegramUpdate` with `message.message_id` and `message.reply_to_message.message_id` (still only what's read).
- Add `copyMessage(chatId, fromChatId, messageId)` to `TelegramClient` (same `call()` + redaction path).
- A reply to a non-relayed message falls through to the existing owner commands.
- Customer blocked the bot → `copyMessage` fails (403) → owner sees "Not delivered: …".

### 4.5 Per-chat cap (public)

Before `bot.handleUpdate`: `consumeGlobalAllowance(db, \`telegram:chat:${chatId}\`, { limit: 20, windowSeconds: 60 })`. Over cap → 200, dropped silently (no reply, to avoid amplifying a flood). Fixes the stale doc claim of a 10/60s budget that the code never had.

---

## 5. Data model

Migration `src/database/migrations/017_telegram_relay.sql` + schema `src/database/schemas/telegram.sql`:

```sql
CREATE TABLE IF NOT EXISTS telegram_relay (
    owner_message_id INTEGER PRIMARY KEY,   -- message id in the OWNER chat
    customer_chat_id TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telegram_relay_created ON telegram_relay (created_at);
INSERT OR IGNORE INTO schema_migrations (version, name) VALUES ('017', 'telegram_relay');
```

- Message ids are unique per chat; there is one owner chat, so `owner_message_id` alone is a valid key. If the owner chat is re-linked, old rows simply stop matching.
- **Retention: 30 days**, pruned by the existing cron in `src/index.ts` (`scheduled`), next to `ResumeDownloadService.pruneOlderThan(RESUME_DOWNLOAD_RETENTION_DAYS)` - same `ctx.waitUntil` + log-don't-throw shape. A reply to an older relay falls through to owner commands.
- Service: `src/services/telegram-relay.ts` - `remember(ownerMessageIds, customerChatId)`, `customerFor(ownerMessageId)`, `pruneOlderThan(days)`.

---

## 6. Platform & ops

### 6.1 Config

| Name | Kind | New? | Notes |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | secret | existing | |
| `TELEGRAM_WEBHOOK_SECRET` | secret | existing | |
| `TELEGRAM_BOT_INFO` | secret | **new** | JSON of `getMe` result; `scripts/telegram-set-webhook.ts` prints it so the owner can `wrangler secret put` it. Missing → public branch logs and stays inert (owner side unaffected) |

### 6.2 Webhook registration

- `TelegramClient.setWebhook` default `allowed_updates` becomes `['message', 'callback_query']` (inline buttons are `callback_query`). **Re-run `bun run telegram:webhook` after deploy** or buttons do nothing.
- The same script calls `setMyCommands` for default scope: `start - Menu`, `id - Show your chat id`, `help - Menu`.

### 6.3 Limits & cost

- Bundle: grammY core adds roughly 150 KiB unminified (docs/telegram.md recorded 547 → 705 KiB with it). Far under Workers limits.
- CPU: one update = a handful of D1 queries + 1-3 Bot API calls; no heavy parsing.
- Resume sends re-upload ~120 KB each time. Fine at portfolio volume. Upgrade path: cache Telegram's `file_id` keyed by the resume ETag (one KV write per resume version) - only if sends become frequent.
- D1 writes per public update: per-chat counter (+ relay counter + relay rows when relaying).

---

## 7. Security & privacy

- Gate order unchanged; grammY sees only authenticated, capped, deduped updates (§0.3).
- Public features answer **private chats only**; groups/channels get nothing (prevents the bot being added to groups as a spam relay).
- The owner's personal account is never exposed; customers only ever see the bot.
- Stored: customer chat id + owner-side message ids (30-day retention). Not stored: message bodies, phone numbers.
- Relay spam bounded three ways: global 600/h, per-chat 20/min, relay 10/h per customer.
- Token redaction rules in `services/telegram.ts` apply to the new `copyMessage`. **grammY does not redact the token itself** (checked `src/core/error.ts`, 2026-10-08): `bot.catch` must log `redactToken(String(err.error), env.TELEGRAM_BOT_TOKEN)`, never the raw error. Pin it with a verify check.

---

## 8. Implementation phases

### Phase 1 - Frontend stable resume URL (`portfolio-astro`)

- **Files:** create `src/pages/resume.pdf.ts`; extend `src/env.d.ts` (`ASSETS`).
- **Verify:** `npm run build` + `npx astro check`; `astro dev` → `curl -I localhost:4321/resume.pdf` = 200 `application/pdf`; body bytes equal `public/docs/<RESUME_URL file>`.
- **Done when:** both pass; no other page changes.

### Phase 2 - Backend public bot (`hono-workers`)

- **Files:** `bun add grammy`; create `src/services/telegram-public.ts`; edit `src/routes/telegram.ts` (private-chat check, per-chat cap, `createPublicBot(env).handleUpdate(update)`); `src/types/common.ts` (`TELEGRAM_BOT_INFO?`); `.dev.vars.example`.
- **Verify:** `npm run type-check`; extend `scripts/verify-telegram.ts`: `/start` → menu with 4 buttons; `/id` → chat id; cb `resume` → `sendDocument` called + one `resume_downloads` row `source='telegram'`; group chat → no reply; owner chat never reaches grammY; missing `TELEGRAM_BOT_INFO` → public inert, owner works.
- **Done when:** all checks pass, existing 31 still pass.

### Phase 3 - Relay

- **Files:** migration `017_telegram_relay.sql` + `schemas/telegram.sql`; `src/services/telegram-relay.ts`; `copyMessage` in `TelegramClient`; owner reply branch in `routes/telegram.ts`; relay prune in the `scheduled` handler of `src/index.ts`.
- **Verify:** `db:migrate` local; checks: public text → owner gets header + copy, 2 relay rows, customer gets "Sent ✓"; owner reply to header → `copyMessage` to customer + "Delivered ✓"; reply to unrelated message → owner commands; 11th relay within the hour → "please wait"; `pruneOlderThan(30)` deletes only rows older than 30 days.
- **Done when:** all pass.

### Phase 4 - Webhook registration & commands

- **Files:** `src/services/telegram.ts` (`allowed_updates` default, `setMyCommands`), `scripts/telegram-set-webhook.ts` (print `getMe` JSON for `TELEGRAM_BOT_INFO`).
- **Verify:** script run against a test bot token locally (or dry-run printing the payloads).
- **Done when:** payloads match §6.2.

### Phase 5 - Docs & live check (owner-run steps marked 👤)

- Update `hono-workers/docs/telegram.md` (audiences, flow diagram, commands table, config, remove the stale 10/60s claim → real caps).
- 👤 `bunx wrangler secret put TELEGRAM_BOT_INFO`, `bun run db:migrate:remote` (017), deploy backend, deploy portfolio (Phase 1), `bun run telegram:webhook`.
- Live: from a non-owner account → `/start`, tap each button, send a text; from the owner account → reply to it.

## 9. Acceptance criteria

- [ ] Non-owner private chat: `/start` shows the menu; Resume delivers the current PDF named `Hafiz-Bahtiar-Resume.pdf` and adds one `resume_downloads` row with `source='telegram'`; GitHub/LinkedIn open the right profiles; `/id` returns the chat id.
- [ ] Free text from a non-owner reaches the owner with a sender header; owner's reply to it reaches that customer; the owner's account is never exposed.
- [ ] Owner commands (`/contacts`) and the contact-form push behave exactly as before; the owner chat never enters grammY.
- [ ] Groups get no public replies; per-chat and relay caps enforced; webhook still 401s without the secret and answers 200 on handler errors.
- [ ] `/resume.pdf` on the site serves the current resume; bumping `RESUME_URL` is the only change needed for a new version.
- [ ] `verify-telegram.ts` passes (old 31 + new checks); `type-check` / `npm run build` clean; `docs/telegram.md` matches reality.
