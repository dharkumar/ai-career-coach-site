'use client';

import { useState, useEffect } from "react";

export function useSpotlight(activeId: string | null) {
    const [rect, setRect] = useState<DOMRect | null>(null);
  
    useEffect(() => {
      if (!activeId) {
        setRect(null);
        return;
      }
  
      const update = () => {
        const el = document.querySelector(`[data-spotlight="${activeId}"]`);
        if (el) {
          setRect(el.getBoundingClientRect());
        }
      };
  
      const timeout = setTimeout(update, 100);
      window.addEventListener("resize", update);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener("resize", update);
      };
    }, [activeId]);
  
    return rect;
  }