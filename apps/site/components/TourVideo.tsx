'use client';

export default function TourVideo({ url }: { url: string }) {
  if (!url) return null;

  let embedUrl: string | null = null;
  if (url.includes('youtube.com/watch')) {
    embedUrl = url.replace('watch?v=', 'embed/');
  } else if (url.includes('youtu.be/')) {
    embedUrl = 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('vimeo.com/')) {
    embedUrl = 'https://player.vimeo.com/video/' + url.split('vimeo.com/')[1]?.split('?')[0];
  }

  if (embedUrl) {
    return (
      <div className="tour-video">
        {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
        <iframe
          src={embedUrl}
          title="Tour video"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="tour-video">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video src={url} controls playsInline />
    </div>
  );
}
