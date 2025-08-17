import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Hook for managing animation playback, frame control, and timing
 * @param {number} totalFrames - Total number of frames available
 * @returns {object} Animation control state and functions
 */
export const useAnimationControl = (totalFrames = 24) => {
  const MAX_PLAYBACK_SPEED = 20;
  const MIN_PLAYBACK_SPEED = 0.1;

  // --- Animation State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeedInternal] = useState(1);
  const [loopMode, setLoopMode] = useState('Repeat'); // 'Repeat', 'Once', 'PingPong'
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward (ping-pong)

  // --- Animation Configuration ---
  const [animationConfig, setAnimationConfig] = useState({
    smoothTransitions: true,
    autoResetOnComplete: false,
    syncWithRealTime: false,
    frameSkipping: false
  });

  // --- Timing State ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);
  const lastFrameTime = useRef(Date.now());

  // --- Playback speed with validation ---
  const setPlaybackSpeed = useCallback((speed) => {
    const clampedSpeed = Math.max(MIN_PLAYBACK_SPEED, Math.min(MAX_PLAYBACK_SPEED, speed));
    setPlaybackSpeedInternal(clampedSpeed);
  }, []);

  // --- Frame navigation with bounds checking ---
  const setCurrentFrameSafe = useCallback((frameIndex) => {
    const validFrame = Math.max(0, Math.min(frameIndex, totalFrames - 1));
    setCurrentFrame(validFrame);
  }, [totalFrames]);

  // --- Play/pause toggle ---
  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) {
        setStartTime(Date.now());
        lastFrameTime.current = Date.now();
      }
      return !prev;
    });
  }, []);

  // --- Reset animation ---
  const handleReset = useCallback(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
    setElapsedTime(0);
    setStartTime(null);
    setDirection(1);
  }, []);

  // --- Jump to specific frame ---
  const jumpToFrame = useCallback((frameIndex) => {
    setCurrentFrameSafe(frameIndex);
    if (isPlaying) {
      lastFrameTime.current = Date.now();
    }
  }, [setCurrentFrameSafe, isPlaying]);

  // --- Step forward/backward ---
  const stepForward = useCallback(() => {
    setCurrentFrameSafe(currentFrame + 1);
  }, [currentFrame, setCurrentFrameSafe]);

  const stepBackward = useCallback(() => {
    setCurrentFrameSafe(currentFrame - 1);
  }, [currentFrame, setCurrentFrameSafe]);

  // --- Jump to start/end ---
  const jumpToStart = useCallback(() => {
    setCurrentFrameSafe(0);
  }, [setCurrentFrameSafe]);

  const jumpToEnd = useCallback(() => {
    setCurrentFrameSafe(totalFrames - 1);
  }, [totalFrames, setCurrentFrameSafe]);

  // --- Set loop mode ---
  const setLoopModeValidated = useCallback((mode) => {
    const validModes = ['Repeat', 'Once', 'PingPong'];
    if (validModes.includes(mode)) {
      setLoopMode(mode);
      setDirection(1); // Reset direction when changing modes
    }
  }, []);

  // --- Update animation configuration ---
  const updateAnimationConfig = useCallback((newConfig) => {
    setAnimationConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Calculate next frame based on loop mode ---
  const calculateNextFrame = useCallback((current, dir) => {
    switch (loopMode) {
      case 'Once':
        if (current >= totalFrames - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
        
      case 'PingPong':
        let nextFrame = current + dir;
        let nextDirection = dir;
        
        if (nextFrame >= totalFrames - 1) {
          nextFrame = totalFrames - 1;
          nextDirection = -1;
        } else if (nextFrame <= 0) {
          nextFrame = 0;
          nextDirection = 1;
        }
        
        setDirection(nextDirection);
        return nextFrame;
        
      case 'Repeat':
      default:
        return current >= totalFrames - 1 ? 0 : current + 1;
    }
  }, [loopMode, totalFrames]);

  // --- Animation progress calculation ---
  const animationProgress = useMemo(() => {
    if (totalFrames <= 1) return 100;
    return (currentFrame / (totalFrames - 1)) * 100;
  }, [currentFrame, totalFrames]);

  // --- Animation status ---
  const animationStatus = useMemo(() => {
    if (totalFrames <= 1) return 'no-data';
    if (isPlaying) return 'playing';
    if (currentFrame === 0) return 'ready';
    if (currentFrame === totalFrames - 1) return 'complete';
    return 'paused';
  }, [isPlaying, currentFrame, totalFrames]);

  // --- Frame rate calculation ---
  const [currentFPS, setCurrentFPS] = useState(0);
  const frameTimeHistory = useRef([]);

  // --- Main animation loop ---
  useEffect(() => {
    if (isPlaying && totalFrames > 1) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastFrameTime.current;
        
        // Update FPS calculation
        frameTimeHistory.current.push(deltaTime);
        if (frameTimeHistory.current.length > 10) {
          frameTimeHistory.current.shift();
        }
        const avgFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
        setCurrentFPS(Math.round(1000 / avgFrameTime));
        
        setCurrentFrame(prev => calculateNextFrame(prev, direction));
        setElapsedTime(prev => prev + deltaTime);
        lastFrameTime.current = now;
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, totalFrames, calculateNextFrame, direction]);

  // --- Keyboard controls ---
  const handleKeyboardControl = useCallback((event) => {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        handlePlayToggle();
        break;
      case 'ArrowRight':
        event.preventDefault();
        stepForward();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        stepBackward();
        break;
      case 'Home':
        event.preventDefault();
        jumpToStart();
        break;
      case 'End':
        event.preventDefault();
        jumpToEnd();
        break;
      case 'r':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleReset();
        }
        break;
    }
  }, [handlePlayToggle, stepForward, stepBackward, jumpToStart, jumpToEnd, handleReset]);

  // --- Speed presets ---
  const speedPresets = {
    'Very Slow': 0.25,
    'Slow': 0.5,
    'Normal': 1,
    'Fast': 2,
    'Very Fast': 4,
    'Ultra Fast': 8
  };

  const setSpeedPreset = useCallback((preset) => {
    if (speedPresets[preset]) {
      setPlaybackSpeed(speedPresets[preset]);
    }
  }, [setPlaybackSpeed]);

  // --- Time formatting ---
  const formatTime = useCallback((milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // --- Animation info ---
  const animationInfo = useMemo(() => ({
    currentFrame: currentFrame + 1, // 1-based for display
    totalFrames,
    progress: animationProgress,
    status: animationStatus,
    speed: playbackSpeed,
    mode: loopMode,
    fps: currentFPS,
    elapsedTime: formatTime(elapsedTime),
    direction: direction > 0 ? 'forward' : 'backward'
  }), [currentFrame, totalFrames, animationProgress, animationStatus, playbackSpeed, loopMode, currentFPS, elapsedTime, formatTime, direction]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // --- Return public API ---
  return {
    // Core state
    isPlaying,
    currentFrame,
    playbackSpeed,
    loopMode,
    direction,
    
    // Configuration
    animationConfig,
    updateAnimationConfig,
    
    // Controls
    setIsPlaying,
    setCurrentFrame: setCurrentFrameSafe,
    setPlaybackSpeed,
    setLoopMode: setLoopModeValidated,
    
    // Actions
    handlePlayToggle,
    handleReset,
    jumpToFrame,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    
    // Speed controls
    speedPresets,
    setSpeedPreset,
    
    // Keyboard support
    handleKeyboardControl,
    
    // Status and info
    animationInfo,
    animationProgress,
    animationStatus,
    currentFPS,
    elapsedTime,
    
    // Computed values
    isAtStart: currentFrame === 0,
    isAtEnd: currentFrame === totalFrames - 1,
    canPlay: totalFrames > 1,
    frameRate: playbackSpeed,
    
    // Limits
    minSpeed: MIN_PLAYBACK_SPEED,
    maxSpeed: MAX_PLAYBACK_SPEED
  };
};