export function scrollToBrowse(target: Element, reducedMotion: boolean) {
  target.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}
