# Wheel Result Dialog Design

## Goal

Show a wheel result in a focused dialog instead of leaving it below the wheel.

## Scope

Update the shared `SpinWheel` component so the result behaves the same in the spin page,
saved lists, and plan results.

Update the shared `VenueCard` component so every listing card can save or unsave a venue
without opening its detail page.

## Interaction

- The dialog opens only after the wheel animation ends.
- It shows the existing lead text, selected activity, optional place count, and the existing
  destination action when the result has a link.
- `Spin again` closes the dialog and starts another spin.
- A close icon, a backdrop click, and Escape close the dialog without changing the current result.
- The large inline result panel is removed.

## Card Saves

- Each `VenueCard` has a heart icon button in the image corner.
- The control is outside the card link, so it is valid HTML and never opens the venue page.
- It adds or removes the venue from the existing browser-only shortlist immediately.
- Its accessible name and pressed state make the action clear to keyboard and screen-reader users.
- The existing detail-page save control and saved-list page continue to use the same saved state.

## Accessibility

- The result surface uses a modal dialog with an accessible label.
- Keyboard focus moves to the close control when the dialog opens.
- The dialog has a clear close button with an accessible name.
- Each card save control exposes the venue name and whether it is currently saved.

## Validation

- Add unit coverage for the dialog markup and its close controls.
- Add unit coverage that card saves are an independent button, not nested inside the listing link.
- Run web unit tests, lint, TypeScript, and a production build.
