# Lost & Found Module

## Deploy checklist

1. Run SQL migrations in order:
   - `docs/migrations/009_lost_found_module.sql`
   - `docs/migrations/010_lost_found_photos_collection.sql`

2. Create Supabase Storage bucket **`lost-found-photos`**
   - Public read recommended (or signed URLs later)
   - Path layout: `{businessId}/{yyyy}/{mm}/{tagNumber}/{uuid}.jpg`

3. Deploy Netlify (functions + frontend on `feature/lost-found`)

4. Optional: `RESEND_API_KEY` for guest email contact

## Features

### Photos (required on create)
- Camera capture (`capture=environment`) and multi-upload
- Client-side JPEG compression (`src/utils/imageCompress.ts`)
- Upload via `upload-lost-found-photo` → Storage
- Full-screen preview + delete individual photos

### QR & printable tags
- Local QR via `qrcode` (`src/utils/qrLocal.ts`)
- Print layout: FastCheckIn branding, tag, QR, item, category, room, found by, date, storage, business name, footer “Scan QR to open this record”

### Collection confirmation
- `collect-lost-found-item` records name, optional ID, signature URL, releasing employee
- Audit + activity: Returned to guest / Collected by / Released by / date-time

### Search
Tag, guest, phone, email, room, category, storage, employee, date found

### Storage locations (defaults)
Reception Safe, Reception Shelf A/B, Housekeeping Cupboard, Manager Safe, Maintenance Room, Laundry, External Storage (+ custom)

### Guest timeline (UI)
Found → Guest Contacted → Guest Replied → Collection Scheduled → Collected → Archived

### Reporting stats (API)
found_this_month, avg_days_to_collection, outstanding, plus existing dashboard counts

## Housekeeping handoff (future)
From room task → Found Item → camera + room + booking prefilled → save into Lost & Found.
