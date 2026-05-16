"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark((prev) => !prev)}
      className="text-xs px-2 py-1 rounded border border-axon-700 hover:border-axon-accent transition-colors"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
