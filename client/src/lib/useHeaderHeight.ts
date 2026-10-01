import { useEffect, useState } from "react";

// Height of the sticky site header, which grows when the subcategory row shows.
export function useHeaderHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const observer = new ResizeObserver(() => setHeight(header.offsetHeight));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return height;
}

// Space taken around the page content: the announcement strip and header above,
// plus the footer below. Lets a page fill exactly what's left of the screen.
export function useChromeHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    if (!header || !footer) return;
    const banner = header.previousElementSibling;

    // Sub-pixel heights, rounded up, so the page never ends up 1px too tall.
    const sizeOf = (el: Element | null) => el?.getBoundingClientRect().height ?? 0;
    const observer = new ResizeObserver(() => setHeight(Math.ceil(sizeOf(banner) + sizeOf(header) + sizeOf(footer))));
    [banner, header, footer].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return height;
}
