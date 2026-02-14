---
name: visual-tester
description: "Visually test web UIs using Playwriter MCP — spot layout issues, interaction bugs, responsive breakage, and produce a structured report"
---

# Visual Tester

Ad-hoc visual QA for web UIs. You use Playwriter (via MCP) to control a browser, take labeled screenshots, interact with elements, and report what looks wrong.

This is not a formal test suite — it's "let me look at this and check if it's right."

---

## Setup

You interact with the browser via the Playwriter MCP `execute` tool. Each call runs a Playwright code snippet with `page`, `context`, `state`, and utility functions in scope.

### 1. Create a page and navigate

**Always create your own page** — never use the default `page` variable:

```js
state.myPage = await context.newPage(); await state.myPage.goto("http://localhost:3000")
```

Store it in `state.myPage` so it persists across calls.

### 2. Verify connection with a labeled screenshot

```js
await screenshotWithAccessibilityLabels({ page: state.myPage })
```

If you get an image back with labeled elements, you're connected. If you get a connection error, use the Playwriter `reset` tool and retry.

---

## Taking Screenshots

### Labeled screenshots (primary tool)

Use `screenshotWithAccessibilityLabels` for most screenshots. It overlays Vimium-style labels on interactive elements and returns both an image and an accessibility snapshot:

```js
await screenshotWithAccessibilityLabels({ page: state.myPage })
```

This is your main way to "see" the page. The labels let you reference specific elements precisely. The image and accessibility snapshot are automatically included in the response.

### Plain screenshots

For clean screenshots without labels (e.g., when labels clutter the view):

```js
await state.myPage.screenshot({ path: '/tmp/screenshot.png', scale: 'css' })
```

**Always use `scale: 'css'`** for consistent sizing on high-DPI displays.

### Accessibility snapshot (text-only)

For text-heavy pages where you need to read content without a screenshot:

```js
await accessibilitySnapshot({ page: state.myPage })
```

---

## What to Look For

### Layout & Spacing
- Elements not aligned with their siblings
- Inconsistent padding/margins between similar components
- Content touching container edges (missing padding)
- Elements overflowing their containers
- Unexpected scrollbars

### Typography
- Text clipped or truncated without ellipsis
- Text overflowing containers
- Font sizes that look wrong relative to hierarchy (h1 smaller than h2, etc.)
- Line height too tight or too loose
- Missing or broken web fonts (fallback serif/sans showing)

### Colors & Contrast
- Text hard to read against its background
- Inconsistent color usage (different shades of the "same" color)
- Focus indicators invisible or missing
- Active/hover states using wrong colors

### Images & Media
- Broken images (alt text showing, empty boxes)
- Images stretched or squashed (wrong aspect ratio)
- Images not responsive (overflowing on mobile)
- Missing placeholder/loading states

### Z-index & Overlapping
- Modals or dropdowns appearing behind other elements
- Fixed headers overlapping content
- Tooltips or popovers clipped by parent overflow

### Empty & Edge States
- What does the page look like with no data?
- What about very long text? Very short text?
- Error states — are they styled or raw browser defaults?
- Loading states — spinner, skeleton, or nothing?

---

## Responsive Testing

Test at these breakpoints by changing the viewport:

| Name | Width | Height |
|------|-------|--------|
| Mobile | 375 | 812 |
| Tablet | 768 | 1024 |
| Desktop | 1280 | 800 |
| Wide | 1920 | 1080 |

```js
await state.myPage.setViewportSize({ width: 375, height: 812 }); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

Take a labeled screenshot at each size. Look for:
- Navigation collapsing properly (hamburger menu on mobile)
- Content not overflowing horizontally
- Touch targets large enough on mobile (min 44x44px)
- Text remaining readable at all sizes
- Images scaling appropriately
- No horizontal scrollbar on mobile

You don't always need all four breakpoints. Use judgment — if it's a simple component, mobile + desktop may suffice.

---

## Interaction Testing

### Buttons & Links
Click interactive elements and verify they respond:

```js
await state.myPage.click('[data-testid="submit-btn"]'); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

**Always screenshot after actions** to verify the result.

### Forms
Fill inputs and verify they accept values:

```js
await state.myPage.fill('input[name="email"]', 'test@example.com'); await state.myPage.fill('input[name="password"]', 'password123'); await state.myPage.click('button[type="submit"]'); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

Check: validation messages styled correctly? Success/error states clear?

### Hover & Focus States
```js
await state.myPage.hover('button.primary'); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

```js
await state.myPage.focus('input[name="email"]'); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

### Navigation
Click through different routes/pages. Verify:
- Page transitions work
- Active nav item is highlighted
- Back button works
- URL updates correctly

### Animations & Transitions
If something should animate, use video recording:

```js
await startRecording({ page: state.myPage, outputPath: '/tmp/animation.mp4' }); await state.myPage.click('.accordion-trigger'); await new Promise(r => setTimeout(r, 1000)); const result = await stopRecording({ page: state.myPage }); console.log('Recorded:', result.path, result.duration + 'ms')
```

---

## Dark Mode / Light Mode

Toggle color scheme emulation:

```js
await state.myPage.emulateMedia({ colorScheme: 'dark' }); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

```js
await state.myPage.emulateMedia({ colorScheme: 'light' }); await screenshotWithAccessibilityLabels({ page: state.myPage })
```

Check:
- All text readable in both modes
- No "white flash" elements that didn't get themed
- Icons and images visible in both modes (not black-on-black or white-on-white)
- Consistent use of theme colors (no hardcoded colors leaking through)

---

## CSS Inspection

When you spot something off, inspect the styles:

```js
const cdp = await getCDPSession({ page: state.myPage }); const styles = await getStylesForLocator({ locator: state.myPage.locator('.suspect-element'), cdp }); console.log(formatStylesAsText(styles))
```

This helps confirm whether an issue is a CSS problem vs. content problem. Fetch the full styles API docs with the Playwriter `get_styles_api` resource if needed.

---

## Report Format

After testing, produce a structured report:

```markdown
# Visual Test Report

**URL:** http://localhost:3000
**Date:** YYYY-MM-DD
**Viewports tested:** Mobile (375), Desktop (1280)

## Summary

Brief overall impression. Is this ready to ship? Major concerns?

## Findings

### P0 — Blockers (broken functionality, unusable UI)

#### [Finding title]
- **Location:** Page/component/element
- **Description:** What's wrong
- **Expected:** What it should look like/do
- **Suggested fix:** How to fix it

### P1 — Major (significant visual issues, poor UX)

...

### P2 — Minor (cosmetic issues, polish)

...

### P3 — Nits (nice-to-have improvements)

...

## What's Working Well

- List things that look good
- Positive observations help calibrate severity
```

### Severity Guide

| Level | Meaning | Examples |
|-------|---------|---------|
| **P0** | Broken / unusable | Button doesn't work, page crashes, content invisible |
| **P1** | Major visual/UX issue | Layout broken on mobile, text unreadable, form unusable |
| **P2** | Noticeable cosmetic issue | Misaligned elements, inconsistent spacing, wrong colors |
| **P3** | Polish / nit | Slightly off margins, could-be-better hover states |

---

## Cleanup

**Before writing the report, restore the page to its original state.** Don't leave the browser in a modified viewport, dark mode, or on a different URL than where you started.

```js
await state.myPage.setViewportSize({ width: 1280, height: 800 }); await state.myPage.emulateMedia({ colorScheme: null }); await state.myPage.goto(state.originalUrl)
```

Store the original URL at the start of testing:

```js
state.originalUrl = state.myPage.url()
```

---

## Tips

- **Use common sense.** Not every page needs all four breakpoints and dark mode. Test what matters.
- **Screenshot liberally.** It's cheap. Take before/after shots for interactions.
- **Describe what you see.** When reporting, be specific: "the submit button overlaps the footer by 12px on mobile" not "layout is broken."
- **Reference labels.** Use the Vimium-style labels from `screenshotWithAccessibilityLabels` to identify elements precisely.
- **Test the happy path first.** Make sure the basic flow works before testing edge cases.
- **Check the console.** Look for JS errors that might explain visual issues:
  ```js
  state.myPage.on('console', msg => console.log(msg.type(), msg.text()))
  ```
