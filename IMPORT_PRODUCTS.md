# Import Products to Firebase

This project includes a bulk import script to push smartphone data into Firestore (`products` collection).

## 1. Install dependency

```bash
npm install
```

## 2. Ensure env is present

In `.env.local`:

```env
GOOGLE_APPLICATION_CREDENTIALS=E:/project/technology_stuff/secure/technology-stuff-c146b-a32caf630b20.json
```

## 3. Import from local JSON

```bash
npm run import:products
```

Default source file:

`data/products.sample.json`

## 4. Import from your own JSON file

```bash
node scripts/import-products.mjs --file data/your-products.json
```

## 5. Import from URL (API/JSON endpoint)

```bash
node scripts/import-products.mjs --url "https://your-source.example.com/products.json"
```

## Supported input shape

The script accepts flexible fields and normalizes them:

- `name` / `model` / `title`
- `brand` / `oem`
- `slug` (optional)
- `price`
- `image` or `images[]`
- specs:
  - `processor`, `ram`, `storage`, `battery`, `display`, `os`
- affiliate:
  - `amazon`, `flipkart`

## Notes

- Existing items with same `slug` are updated.
- New slugs are created.
- Data is saved to Firestore collection: `products`.
- Keep usage compliant with source website/API Terms.

