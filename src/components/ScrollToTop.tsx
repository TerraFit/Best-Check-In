import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1));
      const scrollToHashTarget = () => {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      // On a fresh SPA load the hash can be present before React has finished
      // rendering the target section. Retry briefly so deep links such as
      // /#pricing-section land on the intended section rather than the top.
      if (scrollToHashTarget()) return;
      const timer = window.setTimeout(scrollToHashTarget, 100);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [pathname, hash]);

  return null;
}
