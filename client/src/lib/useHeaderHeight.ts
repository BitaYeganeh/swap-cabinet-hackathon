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
