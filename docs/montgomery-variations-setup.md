# How to Add Montgomery Variations Firebase Storage Links

## Where to Add the Links

Open the file: `app/training/contract-projects/black-diaspora-symphony/data.ts`

Find the `montgomeryExcerptDownloads` array (around line 411) and add your Firebase Storage URLs there.

## Format

```typescript
export const montgomeryExcerptDownloads: Array<{
  instrument: string
  url: string
  available: boolean
}> = [
  {
    instrument: 'Full Score',
    url: 'https://firebasestorage.googleapis.com/v0/b/your-bucket/o/path%2Fto%2Ffile.pdf?alt=media&token=your-token',
    available: true
  },
  {
    instrument: 'Violin I',
    url: 'https://firebasestorage.googleapis.com/v0/b/your-bucket/o/path%2Fto%2Fviolin1.pdf?alt=media&token=your-token',
    available: true
  },
  // Add more instruments as needed
]
```

## How to Get Firebase Storage URLs

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Storage** in the left sidebar
4. Navigate to your file (e.g., `Black Diaspora Symphony/Music/December 2025/Montgomery Variations/`)
5. Click on the file
6. Click the **"Get download URL"** button (or copy the URL from the file details)
7. Copy the full URL - it should look like:
   ```
   https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2FDecember%202025%2FMontgomery%20Variations%2Ffilename.pdf?alt=media&token=abc123...
   ```

## Important Notes

- The `instrument` field is the display name (e.g., "Violin I", "Full Score", "Movement I")
- Set `available: true` for files that are ready to download
- Set `available: false` for files that aren't ready yet
- The first item in the array (`montgomeryExcerptDownloads[0]`) will be used for the main "Download PDF" button
- If you want to show multiple options like Ravel, you can modify the UI to show a modal similar to the Ravel downloads

## Example Structure

If you have multiple movements or parts:

```typescript
export const montgomeryExcerptDownloads = [
  {
    instrument: 'Full Score - Movement I',
    url: 'https://firebasestorage.googleapis.com/...',
    available: true
  },
  {
    instrument: 'Violin I - Movement I',
    url: 'https://firebasestorage.googleapis.com/...',
    available: true
  },
  {
    instrument: 'Violin II - Movement I',
    url: 'https://firebasestorage.googleapis.com/...',
    available: true
  },
  // ... more instruments
]
```

## Current Behavior

- The "Download PDF" button will download the **first available** item from the array
- If the array is empty or all items have `available: false`, the button will be disabled
- The download will trigger directly (not open in a new tab) thanks to the improved download function

