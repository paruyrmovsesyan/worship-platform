import { useEffect, useRef } from 'react';

export function useHorizontalDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    const onMouseDown = (e) => {
      // Primary mouse button only
      if (e.button !== 0) return;
      isDown = true;
      isDragging = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX);
      if (Math.abs(walk) > 4) {
        if (!isDragging) {
          isDragging = true;
          el.style.cursor = 'grabbing';
          el.style.userSelect = 'none';
        }
        el.scrollLeft = scrollLeft - walk;
      }
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      if (isDragging) {
        el.style.cursor = '';
        el.style.userSelect = '';
        setTimeout(() => {
          isDragging = false;
        }, 60);
      }
    };

    const onClickCapture = (e) => {
      if (isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    // Horizontal scrolling via mouse wheel
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        const canScrollLeft = el.scrollLeft > 0;
        const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        if ((e.deltaY < 0 && canScrollLeft) || (e.deltaY > 0 && canScrollRight)) {
          el.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    el.addEventListener('mouseleave', endDrag);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('mouseleave', endDrag);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  return ref;
}
