import React from 'react';
import { resolveCachedImageSource } from '../utils/persistentImageCache';

export default function CachedImage({ src, fallbackSrc = '', cacheName, onError, ...props }) {
  const [displaySrc, setDisplaySrc] = React.useState(() => (
    String(src || '').startsWith('data:') ? src : fallbackSrc
  ));

  React.useEffect(() => {
    let active = true;
    let objectUrl = '';
    setDisplaySrc(String(src || '').startsWith('data:') ? src : fallbackSrc);
    resolveCachedImageSource(src, { cacheName })
      .then(result => {
        if (!active) {
          if (result.objectUrl) URL.revokeObjectURL(result.src);
          return;
        }
        if (result.objectUrl) objectUrl = result.src;
        setDisplaySrc(result.src || fallbackSrc);
      })
      .catch(() => {
        if (active) setDisplaySrc(src || fallbackSrc);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheName, fallbackSrc, src]);

  return (
    <img
      {...props}
      src={displaySrc || fallbackSrc}
      onError={(event) => {
        if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
        onError?.(event);
      }}
    />
  );
}
