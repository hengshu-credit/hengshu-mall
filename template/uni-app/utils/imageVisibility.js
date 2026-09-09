// H5 images share native visibility tracking instead of measuring every scroll.
let observer;
const callbacks = new Map();

export function observeImageVisibility(element, onVisible) {
  if (!element || typeof IntersectionObserver === 'undefined') return null;
  if (!observer) {
    const current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const callback = callbacks.get(entry.target);
        if (!entry.isIntersecting || !callback) return;
        callbacks.delete(entry.target);
        current.unobserve(entry.target);
        callback();
      });
    }, { rootMargin: '200px 0px', threshold: 0 });
    observer = current;
  }
  callbacks.set(element, onVisible);
  observer.observe(element);
  return () => {
    if (callbacks.get(element) === onVisible) {
      callbacks.delete(element);
      observer.unobserve(element);
    }
    if (!callbacks.size && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}
