---
name: visual-tester
description: "Visually test web UIs using Chrome CDP — spot layout issues, interaction bugs, responsive breakage, and produce a structured report"
---

# Visual Tester

Ad-hoc visual QA for web UIs. You use Chrome CDP (`scripts/cdp.mjs`) to control the browser, take screenshots, inspect accessibility trees, interact with elements, and report what looks wrong.

This is not a formal test suite — it's "let me look at this and check if it's right."

---

## Setup

You interact with the browser via the `scripts/cdp.mjs` CLI. Read the **chrome-cdp** skill for the full command reference.

### Prerequisites

- Chrome with remote debugging enabled: `chrome://inspect/#remote-debugging` → toggle the switch
- The target page open in a Chrome tab

### 1. Find your target tab

```bash
scripts/cdp.mjs list
```

Pick the target from the list. Use the targetId prefix (e.g. `6BE827FA`) for all subsequent commands.

### 2. Take a screenshot to verify connection

```bash
scripts/cdp.mjs shot <target> /tmp/screenshot.png
```

If you get an image back, you're connected.

### 3. Get the page structure

```bash
scripts/cdp.mjs snap <target>
```

---

## Taking Screenshots

### Standard screenshot

```bash
scripts/cdp.mjs shot <target> /tmp/screenshot.png
```

Captures the viewport. Output includes DPR for coordinate conversion.

### Accessibility snapshot (text-only structure)

For text-heavy pages where you need to read content without a screenshot:

```bash
scripts/cdp.mjs snap <target>
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

Test at these breakpoints by changing the viewport via eval:

| Name | Width | Height |
|------|-------|--------|
| Mobile | 375 | 812 |
| Tablet | 768 | 1024 |
| Desktop | 1280 | 800 |
| Wide | 1920 | 1080 |

```bash
scripts/cdp.mjs evalraw <target> Emulation.setDeviceMetricsOverride '{"width":375,"height":812,"deviceScaleFactor":2,"mobile":true}'
scripts/cdp.mjs shot <target> /tmp/mobile.png
```

Reset to default after testing:

```bash
scripts/cdp.mjs evalraw <target> Emulation.clearDeviceMetricsOverride
```

Take a screenshot at each size. Look for:
- Navigation collapsing properly (hamburger menu on mobile)
- Content not overflowing horizontally
- Touch targets large enough on mobile (min 44x44px)
- Text remaining readable at all sizes
- Images scaling appropriately
- No horizontal scrollbar on mobile

You don't always need all four breakpoints. Use judgment — if it's a simple component, mobile + desktop may suffice.

---

## Interaction Testing

### Clicking elements

```bash
scripts/cdp.mjs click <target> 'button[type="submit"]'
scripts/cdp.mjs shot <target> /tmp/after-click.png
```

Or click by coordinates (CSS pixels):

```bash
scripts/cdp.mjs clickxy <target> 200 350
```

**Always screenshot after actions** to verify the result.

### Forms

```bash
scripts/cdp.mjs click <target> 'input[name="email"]'
scripts/cdp.mjs type <target> 'test@example.com'
scripts/cdp.mjs click <target> 'input[name="password"]'
scripts/cdp.mjs type <target> 'password123'
scripts/cdp.mjs click <target> 'button[type="submit"]'
scripts/cdp.mjs shot <target> /tmp/form-submitted.png
```

Check: validation messages styled correctly? Success/error states clear?

### Hover & Focus States

Use `eval` to trigger hover/focus for inspection:

```bash
scripts/cdp.mjs eval <target> "document.querySelector('button.primary').dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))"
scripts/cdp.mjs shot <target> /tmp/hover.png
```

### Navigation

Click through different routes/pages. Verify:
- Page transitions work
- Active nav item is highlighted
- Back button works
- URL updates correctly

```bash
scripts/cdp.mjs nav <target> http://localhost:3000/other-page
scripts/cdp.mjs shot <target> /tmp/other-page.png
```

---

## Dark Mode / Light Mode

Toggle color scheme emulation via CDP:

```bash
scripts/cdp.mjs evalraw <target> Emulation.setEmulatedMedia '{"features":[{"name":"prefers-color-scheme","value":"dark"}]}'
scripts/cdp.mjs shot <target> /tmp/dark-mode.png
```

```bash
scripts/cdp.mjs evalraw <target> Emulation.setEmulatedMedia '{"features":[{"name":"prefers-color-scheme","value":"light"}]}'
scripts/cdp.mjs shot <target> /tmp/light-mode.png
```

Check:
- All text readable in both modes
- No "white flash" elements that didn't get themed
- Icons and images visible in both modes (not black-on-black or white-on-white)
- Consistent use of theme colors (no hardcoded colors leaking through)

---

## CSS Inspection

When you spot something off, inspect the styles via eval:

```bash
scripts/cdp.mjs eval <target> "JSON.stringify(window.getComputedStyle(document.querySelector('.suspect-element')).cssText)"
```

Or get specific properties:

```bash
scripts/cdp.mjs eval <target> "window.getComputedStyle(document.querySelector('.suspect-element')).getPropertyValue('margin-top')"
```

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

```bash
scripts/cdp.mjs evalraw <target> Emulation.clearDeviceMetricsOverride
scripts/cdp.mjs evalraw <target> Emulation.setEmulatedMedia '{"features":[]}'
scripts/cdp.mjs nav <target> <original-url>
```

Note the original URL at the start of testing.

---

## Tips

- **Use common sense.** Not every page needs all four breakpoints and dark mode. Test what matters.
- **Screenshot liberally.** It's cheap. Take before/after shots for interactions.
- **Describe what you see.** When reporting, be specific: "the submit button overlaps the footer by 12px on mobile" not "layout is broken."
- **Use accessibility snapshots** to understand page structure and identify elements precisely.
- **Test the happy path first.** Make sure the basic flow works before testing edge cases.
- **Check the console.** Look for JS errors that might explain visual issues:
  ```bash
  scripts/cdp.mjs eval <target> "JSON.stringify(window.__consoleErrors || 'no errors captured')"
  ```
