import React, { useEffect, useState, useRef } from 'react';
import { MousePointer, Target, Eye } from 'lucide-react';

const TutorialOverlay = ({
  isActive = false,
  targetSelector = null,
  highlightType = 'spotlight', // 'spotlight', 'outline', 'glow', 'pulse'
  overlayOpacity = 0.7,
  spotlightPadding = 8,
  animationDuration = 300,
  showPointer = false,
  pointerText = null,
  onTargetClick = null,
  className = ""
}) => {
  const [targetBounds, setTargetBounds] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Find and track target element
  useEffect(() => {
    if (!isActive || !targetSelector) {
      setTargetBounds(null);
      setIsVisible(false);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        updateTargetBounds(target);
        setIsVisible(true);
        return target;
      }
      return null;
    };

    // Initial search
    let target = findTarget();

    // Retry with delay if not found immediately
    if (!target) {
      const retryTimer = setTimeout(() => {
        target = findTarget();
      }, 100);

      return () => clearTimeout(retryTimer);
    }

    // Set up resize observer for dynamic updates
    if (target && window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateTargetBounds(target);
      });
      resizeObserverRef.current.observe(target);
    }

    // Set up mutation observer for DOM changes
    const mutationObserver = new MutationObserver(() => {
      const currentTarget = document.querySelector(targetSelector);
      if (currentTarget && currentTarget !== target) {
        target = currentTarget;
        updateTargetBounds(target);
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      mutationObserver.disconnect();
    };
  }, [isActive, targetSelector]);

  // Update target bounds
  const updateTargetBounds = (target) => {
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    setTargetBounds({
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height,
      right: rect.right + scrollLeft,
      bottom: rect.bottom + scrollTop,
      centerX: rect.left + scrollLeft + rect.width / 2,
      centerY: rect.top + scrollTop + rect.height / 2
    });
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
          updateTargetBounds(target);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [targetSelector]);

  // Handle target click
  const handleOverlayClick = (e) => {
    if (targetBounds && onTargetClick) {
      const clickX = e.clientX + window.pageXOffset;
      const clickY = e.clientY + window.pageYOffset;

      // Check if click is within target bounds
      if (
        clickX >= targetBounds.left &&
        clickX <= targetBounds.right &&
        clickY >= targetBounds.top &&
        clickY <= targetBounds.bottom
      ) {
        onTargetClick(e);
      }
    }
  };

  if (!isActive || !isVisible || !targetBounds) {
    return null;
  }

  // Generate spotlight SVG path
  const generateSpotlightPath = () => {
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

    const totalWidth = Math.max(viewportWidth, scrollWidth);
    const totalHeight = Math.max(viewportHeight, scrollHeight);

    const spotlightLeft = targetBounds.left - spotlightPadding;
    const spotlightTop = targetBounds.top - spotlightPadding;
    const spotlightWidth = targetBounds.width + spotlightPadding * 2;
    const spotlightHeight = targetBounds.height + spotlightPadding * 2;

    return `
      M 0,0 
      L ${totalWidth},0 
      L ${totalWidth},${totalHeight} 
      L 0,${totalHeight} 
      Z 
      M ${spotlightLeft},${spotlightTop} 
      L ${spotlightLeft + spotlightWidth},${spotlightTop} 
      L ${spotlightLeft + spotlightWidth},${spotlightTop + spotlightHeight} 
      L ${spotlightLeft},${spotlightTop + spotlightHeight} 
      Z
    `;
  };

  // Render different highlight types
  const renderHighlight = () => {
    switch (highlightType) {
      case 'spotlight':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              width: '100vw',
              height: Math.max(document.documentElement.scrollHeight, window.innerHeight)
            }}
          >
            <defs>
              <filter id="spotlight-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              d={generateSpotlightPath()}
              fill={`rgba(0, 0, 0, ${overlayOpacity})`}
              fillRule="evenodd"
            />
            <rect
              x={targetBounds.left - spotlightPadding}
              y={targetBounds.top - spotlightPadding}
              width={targetBounds.width + spotlightPadding * 2}
              height={targetBounds.height + spotlightPadding * 2}
              fill="none"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
              filter="url(#spotlight-glow)"
              rx="8"
            />
          </svg>
        );

      case 'outline':
        return (
          <>
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
                width: '100vw',
                height: Math.max(document.documentElement.scrollHeight, window.innerHeight)
              }}
            />
            <div
              className="absolute border-2 border-blue-400 rounded-lg pointer-events-none animate-pulse"
              style={{
                left: targetBounds.left - spotlightPadding,
                top: targetBounds.top - spotlightPadding,
                width: targetBounds.width + spotlightPadding * 2,
                height: targetBounds.height + spotlightPadding * 2,
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
                zIndex: 1001
              }}
            />
          </>
        );

      case 'glow':
        return (
          <div
            className="absolute rounded-lg pointer-events-none animate-pulse"
            style={{
              left: targetBounds.left - spotlightPadding,
              top: targetBounds.top - spotlightPadding,
              width: targetBounds.width + spotlightPadding * 2,
              height: targetBounds.height + spotlightPadding * 2,
              boxShadow: `
                0 0 0 4px rgba(59, 130, 246, 0.4),
                0 0 0 8px rgba(59, 130, 246, 0.2),
                0 0 20px rgba(59, 130, 246, 0.6),
                inset 0 0 20px rgba(59, 130, 246, 0.1)
              `,
              background: 'rgba(59, 130, 246, 0.05)',
              zIndex: 1001
            }}
          />
        );

      case 'pulse':
        return (
          <div
            className="absolute rounded-lg pointer-events-none"
            style={{
              left: targetBounds.left - spotlightPadding,
              top: targetBounds.top - spotlightPadding,
              width: targetBounds.width + spotlightPadding * 2,
              height: targetBounds.height + spotlightPadding * 2,
              zIndex: 1001
            }}
          >
            <div className="absolute inset-0 border-2 border-blue-400 rounded-lg animate-ping opacity-75" />
            <div className="absolute inset-2 border-2 border-blue-300 rounded-lg animate-pulse opacity-60" />
            <div className="absolute inset-4 bg-blue-400/20 rounded-lg animate-pulse" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] transition-opacity duration-${animationDuration} ${className}`}
      onClick={handleOverlayClick}
      style={{ pointerEvents: onTargetClick ? 'auto' : 'none' }}
    >
      {renderHighlight()}

      {/* Pointer and text */}
      {showPointer && (
        <div
          className="absolute pointer-events-none z-[1002]"
          style={{
            left: targetBounds.centerX,
            top: targetBounds.bottom + 20,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex flex-col items-center">
            <MousePointer className="w-6 h-6 text-blue-400 animate-bounce" />
            {pointerText && (
              <div className="mt-2 px-3 py-2 bg-slate-800/90 border border-blue-400/50 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-blue-300 whitespace-nowrap">{pointerText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Corner indicators */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: targetBounds.left - spotlightPadding - 12,
          top: targetBounds.top - spotlightPadding - 12
        }}
      >
        <Target className="w-6 h-6 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
      </div>

      {/* Breathing animation styles */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Specialized overlay components
export const SpotlightOverlay = ({ targetSelector, isActive, ...props }) => (
  <TutorialOverlay
    targetSelector={targetSelector}
    isActive={isActive}
    highlightType="spotlight"
    {...props}
  />
);

export const OutlineOverlay = ({ targetSelector, isActive, ...props }) => (
  <TutorialOverlay
    targetSelector={targetSelector}
    isActive={isActive}
    highlightType="outline"
    {...props}
  />
);

export const GlowOverlay = ({ targetSelector, isActive, ...props }) => (
  <TutorialOverlay
    targetSelector={targetSelector}
    isActive={isActive}
    highlightType="glow"
    {...props}
  />
);

export const PulseOverlay = ({ targetSelector, isActive, ...props }) => (
  <TutorialOverlay
    targetSelector={targetSelector}
    isActive={isActive}
    highlightType="pulse"
    {...props}
  />
);

// Multi-target overlay for highlighting multiple elements
export const MultiTargetOverlay = ({ 
  targets = [], 
  isActive = false, 
  highlightType = 'glow',
  ...props 
}) => {
  return (
    <>
      {targets.map((target, index) => (
        <TutorialOverlay
          key={target.selector || index}
          targetSelector={target.selector}
          isActive={isActive}
          highlightType={target.highlightType || highlightType}
          showPointer={target.showPointer}
          pointerText={target.pointerText}
          {...props}
        />
      ))}
    </>
  );
};

export default TutorialOverlay;