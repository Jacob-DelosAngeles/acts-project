# Software demo video

The landing page (`web/index.html`, "See ACTS in action") plays the demo
from **YouTube**, not from this folder.

## Changing the video

Edit the one attribute in `index.html`:

```html
<button class="video-embed" data-video-id="e2GjTG48Z4c" ...>
```

Set `data-video-id` to the new video's id — the part after `youtu.be/` or
`watch?v=` — and update the "Watch on YouTube" link a few lines below it.
Nothing else needs to change.

## How it works

The page shows the branded poster (`web/img/demo-poster.jpg`) and only
injects the YouTube iframe when a visitor actually clicks it. That keeps
the page light and means YouTube sets no cookies for people who never
press play. The embed uses `youtube-nocookie.com`.

A "Watch on YouTube" link sits under the frame as a fallback, since some
corporate and university networks block embedded players.

## Why not self-hosted?

A self-hosted MP4 has to be committed to the repo (permanently, in git
history) and served from Vercel's bandwidth, with one rendition for every
viewer. YouTube gives adaptive bitrate and a CDN for free.

Google Drive was considered and rejected: it enforces per-file download
quotas that make a video stop playing once it gets traffic, and its embed
URL is undocumented.
