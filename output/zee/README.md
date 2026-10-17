# Zee character assets

Twenty transparent cutouts were generated with built-in imagegen using the supplied
kitten reference. `generation.json` contains the complete prompt set, source paths,
milestones, and final original/output mapping. Day 50 has a targeted equipment
refinement recorded in `day-050-revision.json`.

- App assets: `public/zee/day-000.webp` through the milestone filenames listed in
  the manifest; 640px square with alpha preserved, approximately 1.9 MB combined.
- Reference: `reference.jpg`.
- Original PNGs: `originals/` (retained locally, excluded from Git to keep the app
  repository light). The day-50 first take is retained alongside its corrected v2.
- Browser screenshots, the evolution contact sheet, and check results: `qa/`
  (local verification artifacts, excluded from Git).

The shared card uses current streak thresholds; no unlock history is stored.
Copy is curated Roman Hinglish, selected by India calendar date. Returning to the
app refreshes the server data; midnight and expiry timers refresh the presentation.
Native dialog controls support touch, arrow keys, Escape, focus wrapping and focus
restoration. Reduced-motion preferences suppress the character hover movement.

To verify selectors, run `npm test`. The browser verification used a temporary
fictional preview of the actual Dashboard and PointsView components, with Chrome
at 360px, 390px and 1024px. The preview route is removed before production build.
No member data or database schema was changed for this feature.
