# PGB HR Strategic Partner Calendar

Personal calendar for the HR Strategic Partner, Construction & Manufacturing SBU.
Covers AAC Lightweight Block Corp, Concrete Solutions Inc, and Primary Structures Corp.

## Supabase Setup (one-time)

Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS hr_calendar_events (
  id          bigserial PRIMARY KEY,
  title       text NOT NULL,
  date        date NOT NULL,
  affiliate   text NOT NULL DEFAULT 'PGB',
  category    text NOT NULL DEFAULT 'OPERATIONS',
  note        text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE hr_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON hr_calendar_events FOR SELECT USING (true);
CREATE POLICY "owner_all"   ON hr_calendar_events FOR ALL USING (true) WITH CHECK (true);
```

## Deploy to Vercel

1. Go to https://vercel.com → Add New Project
2. Choose "Deploy from template" → or drag-and-drop this folder
3. No environment variables needed — credentials are baked in
4. Click Deploy

## Owner PIN

Default PIN: `PGB-HR-2026`

To change it, edit line 7 of `src/HRCalendar.jsx`:
```js
const OWNER_PIN = "your-new-pin";
```

## Access

- **Owner** — tap VIEWER badge → enter PIN → full add/edit/delete access
- **Viewer** — open the URL, read-only, no PIN needed
