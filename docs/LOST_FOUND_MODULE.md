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

## Photos (optional on create)

Staff can log an item immediately without photos. Print the tag, store the item, then add photos later from item details.

- Create form: PhotoCapture remains available; submit allowed with zero photos
- Detail: DetailPhotosEditor — add / replace / delete
- Open items without photos show **Photo Missing** badge
- **Missing Photos** dashboard card filters the list to those records (operational task)

## View modes

| Mode | Portal | Stats | Notes |
|------|--------|-------|-------|
| `employee` | Employee Portal | Awaiting Contact, Missing Photos, Ready for Collection, Overdue | Operational only |
| `business` | Business Dashboard | Above + Archived, Returned, Outstanding, This Month | Management console |

Pass `mode="employee"` or `mode="business"` to `LostFoundTab`.

## Features

### QR & printable tags
Local QR via `qrcode`; print layout unchanged.

### Collection confirmation
Name, optional ID, signature, releasing employee + audit.

### Search
Tag, guest, phone, email, room, category, storage, employee, dates

## Housekeeping handoff (future)
From room task → Found Item → camera optional + room + booking prefilled.
