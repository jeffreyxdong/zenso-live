import React, { useState, useEffect } from "react";

interface ResizableSidebarProps {
  children: React.ReactNode;
}

const MIN_WIDTH = 180; // px
const MAX_WIDTH = 500; // px
const DEFAULT_WIDTH = 260; // px

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({ children }) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarWidth");
    const parsed = saved ? parseInt(saved) : DEFAULT_WIDTH;
    setWidth(parsed);
    document.documentElement.style.setProperty("--dynamic-sidebar-width", `${parsed}px`);
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), MAX_WIDTH);
      setWidth(newWidth);
      document.documentElement.style.setProperty("--dynamic-sidebar-width", `${newWidth}px`);
    };

    const onMouseUp = () => {
      localStorage.setItem("sidebarWidth", String(width));
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className="relative flex-shrink-0 h-screen select-none bg-sidebar text-sidebar-foreground"
      style={{ width: `${width}px` }}
    >
      {children}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-border active:bg-border/70 transition-colors"
        onMouseDown={startResize}
      />
    </div>
  );
};
