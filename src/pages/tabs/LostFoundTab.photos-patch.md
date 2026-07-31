This commit adds supporting modules. LostFoundTab wiring notes:

1. Import PhotoCapture, uploadLostFoundPhotos, collectLostFoundItem, printLostFoundTag
2. State: photos string[]
3. On create: if photos empty → error; else uploadLostFoundPhotos then create with photo_urls
4. Replace printTag with printLostFoundTag(item, businessName)
5. Default storage_location: Reception Safe
6. Search placeholder includes phone/email/storage

Components ready:
- src/components/lostFound/PhotoCapture.tsx
- src/utils/imageCompress.ts
- src/utils/qrLocal.ts
- src/utils/printLostFoundTag.ts
- netlify/functions/upload-lost-found-photo.js
- netlify/functions/collect-lost-found-item.js
