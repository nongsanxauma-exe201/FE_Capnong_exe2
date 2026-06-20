import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PopupModal, PopupState, PopupType } from '../components/ui/PopupModal';

interface PopupContextProps {
  showAlert: (message: string, title?: string, type?: PopupType) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextProps | undefined>(undefined);

export let globalShowAlert: (message: string, title?: string, type?: PopupType) => void = () => {};
export let globalShowConfirm: (message: string, title?: string) => Promise<boolean> = async () => false;

const SUPPRESSED_PAYOS_RESTORE_MESSAGES = new Set([
  'đã hủy thanh toán payos và khôi phục lại giỏ hàng.',
  'đã hủy thanh toán payos và khôi phục lại giỏ hàng',
  'đã huỷ thanh toán payos và khôi phục lại giỏ hàng.',
  'đã huỷ thanh toán payos và khôi phục lại giỏ hàng',
]);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const showAlert = (message: string, title = 'Thông báo', type: PopupType = 'alert') => {
    const normalizedMessage = (message || '').trim().toLowerCase();
    if (SUPPRESSED_PAYOS_RESTORE_MESSAGES.has(normalizedMessage)) return;

    setPopup({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => setPopup(p => ({ ...p, isOpen: false })),
      onCancel: () => setPopup(p => ({ ...p, isOpen: false }))
    });
  };

  const showConfirm = (message: string, title = 'Xác nhận'): Promise<boolean> => {
    return new Promise((resolve) => {
      setPopup({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setPopup(p => ({ ...p, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setPopup(p => ({ ...p, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // Gán reference global để có thể gọi tự do ngoài hooks
  globalShowAlert = showAlert;
  globalShowConfirm = showConfirm;

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <PopupModal popup={popup} />
    </PopupContext.Provider>
  );
}

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};
