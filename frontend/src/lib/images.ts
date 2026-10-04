import type { SyntheticEvent } from 'react'

// Catalog images use static paths or API URLs for photos stored in PostgreSQL.
// Missing images fall back to one neutral placeholder.
export const PLACEHOLDER_IMAGE = '/images/placeholder.svg'

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Props for an <img> showing a catalog image, with placeholder fallback. */
export function catalogImage(url: string | null | undefined, fallbackPath?: string) {
  const src = url?.trim() || (fallbackPath ? `/images/${fallbackPath}.webp` : PLACEHOLDER_IMAGE)
  return {
    src,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    onError: (event: SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget
      if (!image.src.endsWith(PLACEHOLDER_IMAGE)) image.src = PLACEHOLDER_IMAGE
    },
  }
}

export const logoImage = {
  src: '/images/logo.jpeg',
  srcSet: '/images/logo-480.webp 480w, /images/logo-960.webp 960w, /images/logo.jpeg 1536w',
  sizes: '190px',
  width: 1536,
  height: 982,
  decoding: 'async' as const,
  alt: 'Hookah Drive',
}
