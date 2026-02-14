# Chamber Series Setup (Firestore + Storage)

This guide powers `/studio/chamber` and `/studio/chamber/[projectId]`.

## 1) Firestore model

Use top-level collection `projects`.

Project document (`projects/{projectId}`):
- `title` (string)
- `slug` (string, optional but recommended)
- `composer` (string)
- `instrumentation` (string)
- `description` (string)
- `discipline` = `orchestra`
- `series` = `chamber`
- `location` = `milwaukee`
- `storagePath` (string)
- `status` = `published` (or `published` = `true`)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

Version document (`projects/{projectId}/versions/{versionId}`):
- `createdAt` (Timestamp)
- `label` (string, e.g. `Jan 12 run`)
- `masterVideoUrl` (string) or `hlsManifestUrl` (string)
- `audioTracks` (array of `{ id, label, url }`)
- `notes` (string)

## 2) Storage layout (recommended)

A simple path convention:
- `chamber/{projectSlug}/versions/{YYYY-MM-DD}/video/master.mp4`
- `chamber/{projectSlug}/versions/{YYYY-MM-DD}/audio/piano.mp3`
- `chamber/{projectSlug}/versions/{YYYY-MM-DD}/audio/strings.mp3`

Use download URLs (or signed URLs strategy) in Firestore.

## 3) Add a new project

1. Create `projects/{projectId}` with chamber filter fields exactly:
- `series: chamber`
- `discipline: orchestra`
- `location: milwaukee`
- `status: published` (or `published: true`)
2. Create the first version doc under `projects/{projectId}/versions/{versionId}`.
3. Add at least one `audioTracks` entry.
4. Visit `/studio/chamber` and open the project.

## 4) Add next recording day/version

1. Upload new media files to Storage.
2. Add a new doc under `projects/{projectId}/versions/{newVersionId}`.
3. Set `createdAt` to the recording date/time.
4. Add `masterVideoUrl` and `audioTracks` URLs.

The UI auto-selects newest version by `createdAt` and defaults to the first audio track.

## 5) Compatibility and migration

The site has a compatibility layer:
- Reads new `projects` + `versions`
- Falls back to legacy `chamberProjects` + embedded `videos[]`

To migrate legacy docs:
- Run `npx tsx scripts/migrate-chamber-projects.ts`

## 6) Indexes and rules

- `firestore.indexes.json` includes composite index for chamber listing query.
- `firestore.rules` includes public read for published chamber projects and their versions.

Deploy:
- `firebase deploy --only firestore:indexes`
- `firebase deploy --only firestore:rules`
