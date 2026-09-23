# Memory Section Redesign - COMPLETED

## Summary
Modified admin smartphone product editor memory section to support multiple variants with improved UX.

### Files Edited
1. `lib/types/content.ts` - Removed `launchPrice` and `latestPrice` from `MemoryVariant` and `ProductGeneralVariant`
2. `components/admin/ProductEditor.tsx` - Complete memory section redesign

### Changes Implemented

#### Types (`lib/types/content.ts`)
- [x] Removed `launchPrice` and `latestPrice` from `MemoryVariant`
- [x] Removed `launchPrice` and `latestPrice` from `ProductGeneralVariant`

#### ProductEditor - Helper Functions
- [x] Added `createEmptyMemoryVariant()` - creates empty variant without price fields
- [x] Added `sanitizeDigits()` - numeric input sanitization with max length
- [x] Added `getMemoryVariantMode()` - determines sync mode from memoryStorage
- [x] Added `formatVariantLabel()` - formats "8GB + 256GB" labels from numeric inputs
- [x] Added `expandVariantGroups()` - expands comma-separated RAM/storage into individual variants
- [x] Added `syncMemoryProductData()` - syncs variantGroups to specs, general.variants, and memoryStorage fields
- [x] Added `updateVariantFieldWithSync()` - syncs RAM/Storage type across all rows when toggle mode is active

#### ProductEditor - Memory Section UI
- [x] **+ Add Variant button** at start of each row — inserts new empty variant below current row
- [x] **RAM + Storage field** — Two numeric input boxes with "GB" suffix:
  - RAM: 2-digit max, 40px width
  - Storage: 4-digit max, 62px width
- [x] **VRAM field** — Numeric input with "GB" suffix, 2-digit max, 52px width
- [x] **RAM Type dropdown** — Always visible, disabled when `same_both` or `same_ram_type` mode
- [x] **Storage Type dropdown** — Always visible, disabled when `same_both` or `same_storage_type` mode
- [x] **Toggle modes** in section header:
  - `same_both`: Both RAM Type and Storage Type synced across all rows
  - `same_ram_type`: Only RAM Type synced, Storage Type per-row
  - `same_storage_type`: Only Storage Type synced, RAM Type per-row
  - `different`: Both per-row
- [x] **Remove button** with Confirm/Cancel pattern (pendingVariantDeleteIndex)

#### ProductEditor - Below Variant Rows
- [x] **Max VRAM** field — auto-derived from max variant VRAM but editable
- [x] **Memory Card Support** dropdown (none/hybrid/dedicated)
- [x] **Max Card Storage** and **Card Notes** — conditional on card support
- [x] **Other Memory Features** text input

#### Removed
- [x] Launch Price and Latest Price fields from variant rows
- [x] Common RAM Type/Storage Type fields from below variant rows
- [x] Old "Storage & Memory" flat input section
- [x] Launch Variants from General section (now auto-generated from memory variantGroups)

#### Testing & Validation
- [x] TypeScript compiles successfully (exit code 0)
- [x] Backward compatible with existing product data (editRow maps old variants to new variantGroups)
