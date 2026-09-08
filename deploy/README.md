# Deploy: MySQL + PHP (SpaceWeb shared hosting)

Production no longer needs a Node process, `api-proxy.php`, or `keep-alive.sh`.

## 1. MySQL in SpaceWeb panel

1. Create a database + user (login = DB name).
2. Import `api/schema.sql` via phpMyAdmin **or** CLI.

SpaceWeb hosts:
- MySQL 5.7 → `localhost:3306`
- MySQL 8 → `127.0.0.1:3308`

## 2. Config

```bash
cp api/config.example.php api/config.php
# edit host/name/user/pass + seed_token
```

## 3. Build frontend (on your machine)

```bash
npm run build
```

## 4. Upload to `public_html`

Upload into the site document root (e.g. `thai-rulive_ru/public_html`):

| Local | Remote |
|-------|--------|
| `dist/*` | `public_html/` (do **not** `rsync --delete` the whole tree — it wipes `api/` and `data/`) |
| `api/` | `public_html/api/` |
| `data/thai_phrases_database.json` | `public_html/data/` (for seed) |
| `data/words_dictionary.json` | `public_html/data/` |
| `deploy/htaccess` | `public_html/.htaccess` |

Ensure `public_html/data/tts-cache/` is writable (chmod 755/775).

Paths in `config.php` default to `__DIR__/../data/...` which works when `api/` sits next to `data/` under `public_html`.

## 5. Seed phrases/words

From SSH (if available):

```bash
cd public_html && php api/seed.php --force
```

Or HTTP once:

```bash
curl -X POST https://speak.soloimperator.tech/api/seed \
  -H 'Content-Type: application/json' \
  -d '{"token":"YOUR_SEED_TOKEN","force":true}'
```

## 6. Check

- `https://YOUR_DOMAIN/api/health` → `{"status":"ok","backend":"php-mysql"}`
- `https://YOUR_DOMAIN/api/phrases` → JSON array
- Open the SPA root URL

## Local dev (optional)

Terminal 1 — PHP API:

```bash
php -S 127.0.0.1:8080 -t . api/router-dev.php
```

Terminal 2 — Vite with proxy (see `vite.config.js`):

```bash
npm run dev
```

Node Express (`server.ts`) remains only for optional local SQLite workflow; production is PHP + MySQL.
