import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
  images?: Array<{ imageUrl: string; [key: string]: any }>;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  alt = 'Preview image',
  onClose,
  images,
  currentIndex = 0,
  onIndexChange,
}) => {
  const [localIndex, setLocalIndex] = useState(currentIndex);

  if (!imageUrl) return null;

  const hasMultipleImages = images && images.length > 1;
  const displayIndex = onIndexChange !== undefined ? currentIndex : localIndex;
  const totalImages = images?.length || 1;

  const handlePrev = () => {
    const newIndex = (displayIndex - 1 + totalImages) % totalImages;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setLocalIndex(newIndex);
    }
  };

  const handleNext = () => {
    const newIndex = (displayIndex + 1) % totalImages;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setLocalIndex(newIndex);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[12000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="relative animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-4 -right-4 z-20 bg-white hover:bg-gray-100 text-gray-700 rounded-full p-3 shadow-2xl transition-all"
        >
          <X className="size-7" />
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt={alt}
          className="
            w-[70vw]
            max-w-[1100px]
            h-auto
            max-h-[80vh]
            object-contain
            rounded-[36px]
            shadow-2xl
            block
          "
        />

        {/* Navigation buttons and counter */}
        {hasMultipleImages && (
          <>
            {/* Previous button */}
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-all"
            >
              <ChevronRight className="size-6 rotate-180" />
            </button>

            {/* Next button */}
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-all"
            >
              <ChevronRight className="size-6" />
            </button>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white px-3 py-2 rounded-full text-sm font-black">
              {displayIndex + 1} / {totalImages}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;