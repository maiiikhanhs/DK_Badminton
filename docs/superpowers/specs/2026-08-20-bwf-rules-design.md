# BWF Rules Reference Design

## Goal

Add an offline Vietnamese reference for standard BWF singles and doubles rules without turning the app into a scorekeeper.

## Navigation

The authenticated header uses a square hamburger trigger. Its dropdown contains Rules and Logout, closes on outside interaction, Escape, selection, or route change, and leaves the bottom navigation unchanged. Rules opens the protected `/rules` route.

## Rules page

The page defaults to Singles and offers Singles/Doubles tabs. A reusable inline SVG court diagram highlights the active playing area, valid service courts, court lines, even/right and odd/left service positions, and diagonal service direction. Supporting cards explain scoring to 21, deuce, the 30-point cap, match format, change of ends, and doubles service rotation.

Content follows BWF Laws of Badminton Section 4.1 for standard badminton. Para Badminton, AirBadminton, interactive scoring, persistence, and network access are excluded.

## Verification

Automated coverage includes menu open/close behavior, outside click, Escape, rules navigation, logout, default Singles state, and switching to Doubles. Delivery requires lint, unit/UI tests, production build, and mobile-size browser QA.
