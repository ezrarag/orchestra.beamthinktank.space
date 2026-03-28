# Viewer Media Normalization

The viewer is now optimized around a single playback target:

- Container: `.mp4`
- Video codec: `H.264`
- Audio codec: `AAC`
- Pixel format: `yuv420p`
- Streaming flag: `+faststart`

Do not use these as `viewerContent.videoUrl` or `viewerAreaRoles.explainerVideoUrl`:

- `.mov`
- `.m3u8`
- Browser-specific adaptive variants

## Recommended ffmpeg command

```bash
ffmpeg -i input.mov \
  -c:v libx264 \
  -profile:v high \
  -level 4.1 \
  -pix_fmt yuv420p \
  -preset medium \
  -crf 20 \
  -movflags +faststart \
  -c:a aac \
  -b:a 192k \
  -ac 2 \
  -ar 48000 \
  output.mp4
```

## Repo checks

Run the local audit to find non-normalized viewer seed media:

```bash
npm run audit:viewer-media
```

This audits JSON seed files under `scripts/data/` and reports:

- non-MP4 `videoUrl` values
- adaptive `.m3u8` `videoUrl` values
- non-MP4 `explainerVideoUrl` values
- adaptive `.m3u8` `explainerVideoUrl` values
- any remaining `hlsUrl` fields
