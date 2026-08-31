'use client';

import { useState } from 'react';

export default function TourGallery({
  coverImage,
  images,
  name,
}: {
  coverImage?: string | null;
  images?: string[];
  name: string;
}) {
  const all: string[] = [];
  if (coverImage) all.push(coverImage);
  for (const img of images ?? []) {
    if (img && !all.includes(img)) all.push(img);
  }

  const [active, setActive] = useState(0);

  if (all.length === 0) return null;

  return (
    <div className="tour-gallery-wrap">
      <div className="tour-gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={all[active]} alt={`${name} — photo ${active + 1}`} />
      </div>
      {all.length > 1 ? (
        <div className="tour-gallery-thumbs">
          {all.map((img, i) => (
            <button
              key={i}
              type="button"
              className={`thumb${i === active ? ' active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1} of ${name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
