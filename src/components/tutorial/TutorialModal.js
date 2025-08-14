import React, { useEffect, useRef } from 'react';
import { X, HelpCircle } from 'lucide-react';

const TutorialModal = ({
  isOpen = false,
  onClose,
  title = "Tutorial",
  children,
  size = "default", // "sm", "default", "lg", "xl", "full"
  position = "center", // "center", "top", "bottom"
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = "",
  backdropClassName = "",
  contentClassName = ""
}) => {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    // Focus first element when modal opens
    firstElement?.focus();

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === backdropRef.current) {
      onClose?.();
    }
  };

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full mx-4';
      default:
        return 'max-w-md md:max-w-lg';
    }
  };

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'items-start pt-16';
      case 'bottom':
        return 'items-end pb-16';
      default:
        return 'items-center';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center transition-opacity duration-300 ${getPositionClasses()} ${backdropClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`bg-slate-800/95 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-2xl w-full ${getSizeClasses()} max-h-[90vh] flex flex-col animate-modal-enter ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-400" />
            </div>
            <h2 
              id="modal-title"
              className="text-lg font-semibold text-blue-300"
            >
              {title}
            </h2>
          </div>
          
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${contentClassName}`}>
          {children}
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes modal-enter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-modal-enter {
          animation: modal-enter 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Specialized tutorial modal variants
export const TutorialStepModal = ({
  stepNumber,
  totalSteps,
  stepTitle,
  children,
  ...props
}) => (
  <TutorialModal
    title={`${stepTitle} (${stepNumber}/${totalSteps})`}
    {...props}
  >
    {children}
  </TutorialModal>
);

export const WelcomeModal = ({ children, ...props }) => (
  <TutorialModal
    title="Welcome to Coastal Oceanographic Monitor"
    size="lg"
    {...props}
  >
    {children}
  </TutorialModal>
);

export const FeatureModal = ({ feature, children, ...props }) => (
  <TutorialModal
    title={`${feature} Tutorial`}
    {...props}
  >
    {children}
  </TutorialModal>
);

export default TutorialModal;