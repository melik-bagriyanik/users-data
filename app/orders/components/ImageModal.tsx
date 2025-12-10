'use client';

import Popup from 'devextreme-react/popup';

interface ImageModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function ImageModal({ visible, imageUrl, onClose }: ImageModalProps) {
  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      showTitle={true}
      title="Ürün Fotoğrafı"
      width={600}
      height={600}
      dragEnabled={true}
    >
      <div className="flex h-full items-center justify-center p-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Ürün Fotoğrafı"
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-center text-gray-500">
            <p>Fotoğraf bulunamadı</p>
          </div>
        )}
      </div>
    </Popup>
  );
}

