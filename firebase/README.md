Apply the Storage CORS policy manually:

`gsutil cors set firebase/cors.json gs://{your-beam-orchestra-platform-storage-bucket}`

Run this once from a machine with `gsutil` installed and credentials for the target Firebase Storage bucket.

### BEAM DevTools Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable Developer Mode using the toggle in the top right
3. Click `Load unpacked`
4. Select the `extension/beam-devtools/` directory
5. The BEAM DevTools icon appears in your Chrome toolbar
6. Repeat this in every Chrome profile where you want the sidebar
7. Click the icon on any BEAM tab to open the sidebar
8. On first open, enter your `beam-orchestra-platform` Firebase client credentials
9. The checklist syncs automatically across all profiles
