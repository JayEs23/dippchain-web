'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function DemoModal({ isOpen, onClose, videoUrl, videoType = 'youtube' }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract YouTube video ID from URL
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Get embed URL based on video type
  const getEmbedUrl = () => {
    if (videoType === 'youtube' && videoUrl) {
      const videoId = getYouTubeId(videoUrl);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      }
      // If it's already an embed URL or direct video ID
      if (videoUrl.includes('youtube.com/embed/') || videoUrl.includes('youtu.be/')) {
        return videoUrl.includes('?') ? `${videoUrl}&autoplay=1` : `${videoUrl}?autoplay=1`;
      }
    }
    
    if (videoType === 'vimeo' && videoUrl) {
      const vimeoId = videoUrl.split('/').pop().split('?')[0];
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    
    // Direct video URL (mp4, webm, etc.)
    return videoUrl;
  };

  const embedUrl = getEmbedUrl();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          backgroundColor: '#0a0a0a',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* Video Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: videoType === 'direct' ? 'auto' : '56.25%', // 16:9 aspect ratio for YouTube/Vimeo
            height: videoType === 'direct' ? 'auto' : 0,
            backgroundColor: '#000',
          }}
        >
          {videoType === 'youtube' || videoType === 'vimeo' ? (
            <iframe
              src={embedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Demo Video"
            />
          ) : (
            <video
              src={embedUrl}
              controls
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Optional: Video Info/Title */}
        {videoType === 'direct' && (
          <div style={{ padding: '24px', color: 'white' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              DippChain Demo
            </h3>
            <p style={{ fontSize: '14px', color: '#a3a3a3' }}>
              Watch how DippChain protects, licenses, and monetizes your creative assets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

