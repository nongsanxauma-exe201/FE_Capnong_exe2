import React from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  alt = 'Preview image',
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
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
            object-cover
            rounded-[36px]
            shadow-2xl
            block
          "
        />
      </div>
    </div>
  );
};

export default ImageLightbox;