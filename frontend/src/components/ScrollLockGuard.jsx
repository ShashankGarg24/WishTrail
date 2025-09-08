import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

export default function ScrollLockGuard() {
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);
  return null;
}


