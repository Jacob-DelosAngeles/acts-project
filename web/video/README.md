# Software demo video

The landing page (`web/index.html`, "See ACTS in action" section) plays a
self-hosted demo video from this folder.

**To make it live, drop your file here named exactly:**

```
web/video/acts-demo.mp4
```

- Recommended: H.264/AAC MP4, 1280×720 or 1920×1080, a few MB (keep it
  reasonably small so the page loads fast).
- Until the file is added, the `<video>` element shows the branded poster
  (`web/img/demo-poster.jpg`) and its controls sit inert — nothing breaks.
- After adding it, commit and push; Vercel redeploys automatically.
