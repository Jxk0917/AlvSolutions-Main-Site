# CLAUDE.md — Project Frontend Rules

## Project Priority

Follow the globally installed `frontend-design` skill for frontend design
and implementation standards.

The rules in this file are project-specific and supplement the global
frontend-design skill.

If a project requirement or provided reference conflicts with a general
design preference from the skill, prioritize the explicit project requirement
or reference.

## Reference Images

When a reference image is provided:

- Treat the reference as the primary visual specification.
- Match its layout, spacing, typography, proportions, colors, and visual hierarchy closely.
- Do not arbitrarily redesign or "improve" intentional elements from the reference.
- Use the project's real assets whenever they are available.
- Do not substitute placeholder assets when appropriate real assets already exist.
- Compare the implementation against the reference before considering the work complete.

When no reference image is provided:

- Follow the `frontend-design` skill.
- Design intentionally for the project's actual brand, audience, and purpose.
- Avoid generic template-like layouts.

## Brand Assets

Before designing or modifying major visual elements:

1. Check the project's available asset folders.
2. Look for logos, brand guidelines, images, icons, fonts, and color specifications.
3. Reuse existing brand assets when appropriate.
4. If an official logo exists, use it rather than recreating it.
5. If an official color palette exists, use those values rather than inventing replacements.

Never modify official brand assets unless explicitly requested.

## Existing Project

Before making substantial frontend changes:

- Inspect the existing project structure.
- Identify the framework and styling approach already being used.
- Inspect existing reusable components.
- Preserve intentional project conventions.
- Avoid introducing unnecessary dependencies or frameworks.
- Do not rewrite functioning architecture solely for stylistic reasons.

## Responsive Design

All frontend work should be responsive.

Check behavior across:

- Mobile
- Tablet
- Desktop

Avoid layouts that only work at one viewport size.

## Visual Quality

Maintain:

- Intentional spacing
- Clear visual hierarchy
- Consistent typography
- Consistent border radii
- Consistent shadows
- Consistent interaction states
- Appropriate image sizing
- Accessible contrast
- Logical surface/depth hierarchy

Avoid arbitrary visual effects that do not support the project's design direction.

## Interaction

Interactive elements must have appropriate:

- Hover states
- Focus states
- Active states

Animations should be purposeful and restrained.

Prefer performant animation properties such as `transform` and `opacity`
when appropriate.

## Implementation Quality

- Keep code organized and readable.
- Reuse components when appropriate.
- Avoid unnecessary duplication.
- Preserve accessibility.
- Do not add sections, features, or content that the user did not request unless they are necessary for functionality.
- Do not replace existing working content without a reason.

## Local Development

Use the development workflow defined by the current project.

Before starting another development server, check whether one is already running.

When screenshots or browser-based visual comparisons are needed, use the
project's existing screenshot/browser tooling when available.

Do not assume a specific localhost port unless the project defines one.

## Completion

Before considering frontend work complete:

1. Verify the requested functionality.
2. Check for obvious layout or styling problems.
3. Check responsive behavior when relevant.
4. Compare against provided references when applicable.
5. Fix visible discrepancies introduced by the implementation.