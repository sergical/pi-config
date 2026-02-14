---
name: visual-tester
description: "Visually test web UIs using Playwriter MCP — spot layout issues, interaction bugs, responsive breakage, and produce a structured report"
---

# Visual Tester

Ad-hoc visual QA for web UIs. You use Playwriter (via MCP) to control a browser, take labeled screenshots, interact with elements, and report what looks wrong.

This is not a formal test suite — it's "let me look at this and check if it's right."

---

## Setup

### 1. Get Playwriter docs

Always start by fetching the latest Playwriter API docs:

```
mcp(tool: "playwriter", args: '{"command": "skill"}')
```

Read the output carefully — it's the source of truth for available APIs.

### 2. Start a session

```
mcp(tool: "playwriter", args: '{"command": "session new"}')
```

This returns a session ID. Use it for all subsequent commands.

### 3. Create a page and navigate

```
mcp(tool: "playwriter", args: '{"sessionId": "<id>", "code": "state.page = await context.newPage(); await state.page.goto(\"http://localhost:3000\");"}')
```

**Always create your own page** via `state.page = await context.newPage()` — don't reuse existing pages.

### 4. Verify connection with a labeled screenshot

```
mcp(tool: "playwriter", args: '{"sessionId": "<id>", "code": "return await screenshotWithAccessibilityLabels({ page: state.page });"}')
```

If you get an image back, you're connected. If not, troubleshoot before continuing.

---

## Taking Screenshots

### Labeled screenshots (primary tool)

Use `screenshotWithAccessibilityLabels` for most screenshots. It overlays Vimium-style labels on interactive elements and returns both an image and an accessibility snapshot:

```js
return await screenshotWithAccessibilityLabels({ page: state.page });
```

This is your main way to "see" the page. The labels let you reference specific elements precisely.

### Plain screenshots

For clean screenshots without labels (e.g., for a report or when labels clutter the view):

```js
await state.page.screenshot({ path: '/tmp/screenshot.png', scale: 'css' });
```

**Always use `scale: 'css'`** for consistent sizing.

### Accessibility snapshot (text-only)

For text-heavy pages where you need to read content without a screenshot:

```js
return await accessibilitySnapshot({ page: state.page });
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
await state.page.setViewportSize({ width: 375, height: 812 });
return await screenshotWithAccessibilityLabels({ page: state.page });
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
await state.page.click('[data-testid="submit-btn"]');
return await screenshotWithAccessibilityLabels({ page: state.page });
```

**Always screenshot after actions** to verify the result.

### Forms
Fill inputs and verify they accept values:

```js
await state.page.fill('input[name="email"]', 'test@example.com');
await state.page.fill('input[name="password"]', 'password123');
await state.page.click('button[type="submit"]');
return await screenshotWithAccessibilityLabels({ page: state.page });
```

Check: validation messages styled correctly? Success/error states clear?

### Hover & Focus States
```js
await state.page.hover('button.primary');
return await screenshotWithAccessibilityLabels({ page: state.page });
```

```js
await state.page.focus('input[name="email"]');
return await screenshotWithAccessibilityLabels({ page: state.page });
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
await startRecording(state.page);
await state.page.click('.accordion-trigger');
await new Promise(r => setTimeout(r, 1000));
const video = await stopRecording(state.page);
return video;
```

---

## Dark Mode / Light Mode

Toggle color scheme emulation:

```js
await state.page.emulateMedia({ colorScheme: 'dark' });
return await screenshotWithAccessibilityLabels({ page: state.page });
```

```js
await state.page.emulateMedia({ colorScheme: 'light' });
return await screenshotWithAccessibilityLabels({ page: state.page });
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
return await getStylesForLocator(state.page.locator('.suspect-element'));
```

This helps confirm whether an issue is a CSS problem vs. content problem.

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

## Tips

- **Use common sense.** Not every page needs all four breakpoints and dark mode. Test what matters.
- **Screenshot liberally.** It's cheap. Take before/after shots for interactions.
- **Describe what you see.** When reporting, be specific: "the submit button overlaps the footer by 12px on mobile" not "layout is broken."
- **Reference labels.** Use the Vimium-style labels from `screenshotWithAccessibilityLabels` to identify elements precisely.
- **Test the happy path first.** Make sure the basic flow works before testing edge cases.
- **Check the console.** Look for JS errors that might explain visual issues:
  ```js
  state.page.on('console', msg => console.log(msg.type(), msg.text()));
  ```
