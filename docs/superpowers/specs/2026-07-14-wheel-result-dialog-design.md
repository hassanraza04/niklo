# Wheel Result Dialog Design

## Goal

Show a wheel result in a focused dialog instead of leaving it below the wheel.

## Scope

Update the shared `SpinWheel` component so the result behaves the same in the spin page,
saved lists, and plan results.

## Interaction

- The dialog opens only after the wheel animation ends.
- It shows the existing lead text, selected activity, optional place count, and the existing
  destination action when the result has a link.
- `Spin again` closes the dialog and starts another spin.
- A close icon, a backdrop click, and Escape close the dialog without changing the current result.
- The large inline result panel is removed.

## Accessibility

- The result surface uses a modal dialog with an accessible label.
- Keyboard focus moves to the close control when the dialog opens.
- The dialog has a clear close button with an accessible name.

## Validation

- Add unit coverage for the dialog markup and its close controls.
- Run web unit tests, lint, TypeScript, and a production build.
