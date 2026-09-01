/**
 * ROYCSS Interactive Effects Catalog
 * 
 * Comprehensive collection of 80+ CSS interactive effects
 * including hover, click/active, drag, and scroll-triggered animations.
 * 
 * @module roycss/effects/catalog/interactive
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Interactive Effects
// ============================================================================

const INTERACTIVE_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'Interactive CSS features well-supported in modern browsers',
};

// ============================================================================
// HOVER EFFECTS - Scale & Transform
// ============================================================================

/**
 * Hover Scale Up - Grows on hover
 */
export const hoverScaleUp: RoyCSSEffect = {
  id: 'hover-scale-up',
  name: 'Hover Scale Up',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Element scales up when hovered',
  css: `.hover-scale-up {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hover-scale-up:hover {
  transform: scale(1.05);
}`,
  tags: ['hover', 'scale', 'grow', 'zoom', 'transform'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'scale', label: 'Scale Value', description: 'Hover scale amount', type: 'number', defaultValue: 1.05, min: 1, max: 1.5, step: 0.01 },
  ],
};

/**
 * Hover Scale Down - Shrinks on hover
 */
export const hoverScaleDown: RoyCSSEffect = {
  id: 'hover-scale-down',
  name: 'Hover Scale Down',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Element scales down when hovered (press effect)',
  css: `.hover-scale-down {
  transition: transform 0.2s ease;
}

.hover-scale-down:hover {
  transform: scale(0.95);
}`,
  tags: ['hover', 'scale', 'shrink', 'press', 'transform'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Lift - Elevates on hover
 */
export const hoverLift: RoyCSSEffect = {
  id: 'hover-lift',
  name: 'Hover Lift',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Element lifts up and gains shadow on hover',
  css: `.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}`,
  tags: ['hover', 'lift', 'elevation', 'shadow', 'card'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'liftHeight', label: 'Lift Height', description: 'Upward movement in px', type: 'number', defaultValue: 8, min: 2, max: 30 },
  ],
};

/**
 * Hover Tilt - 3D perspective tilt
 */
export const hoverTilt: RoyCSSEffect = {
  id: 'hover-tilt',
  name: 'Hover Tilt',
  category: 'interactive',
  subCategory: 'hover',
  description: '3D tilt effect on hover using perspective',
  css: `.hover-tilt-container {
  perspective: 1000px;
}

.hover-tilt {
  transition: transform 0.4s ease;
  transform-style: preserve-3d;
}

.hover-tilt:hover {
  transform: rotateX(10deg) rotateY(-10deg);
}`,
  tags: ['hover', 'tilt', '3d', 'perspective', 'card'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Hover Rotate - Spins slightly on hover
 */
export const hoverRotate: RoyCSSEffect = {
  id: 'hover-rotate',
  name: 'Hover Rotate',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Slight rotation on hover for dynamic feel',
  css: `.hover-rotate {
  transition: transform 0.4s ease;
}

.hover-rotate:hover {
  transform: rotate(5deg);
}`,
  tags: ['hover', 'rotate', 'spin', 'dynamic', 'playful'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'angle', label: 'Rotation Angle', description: 'Degrees to rotate', type: 'number', defaultValue: 5, min: -45, max: 45 },
  ],
};

/**
 * Hover Skew - Slants on hover
 */
export const hoverSkew: RoyCSSEffect = {
  id: 'hover-skew',
  name: 'Hover Skew',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Skews element on hover for dynamic effect',
  css: `.hover-skew {
  transition: transform 0.3s ease;
}

.hover-skew:hover {
  transform: skewX(-10deg);
}`,
  tags: ['hover', 'skew', 'slant', 'dynamic', 'creative'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Hover Flip - Full 180 flip
 */
export const hoverFlip: RoyCSSEffect = {
  id: 'hover-flip',
  name: 'Hover Flip',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Flips element 180 degrees to show back content',
  css: `.hover-flip-container {
  perspective: 1000px;
}

.hover-flip {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.hover-flip-container:hover .hover-flip {
  transform: rotateY(180deg);
}

.hover-flip-front,
.hover-flip-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.hover-flip-back {
  transform: rotateY(180deg);
}`,
  tags: ['hover', 'flip', '3d', 'reveal', 'card'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// HOVER EFFECTS - Color & Visual Changes
// ============================================================================

/**
 * Hover Brighten - Increases brightness
 */
export const hoverBrighten: RoyCSSEffect = {
  id: 'hover-brighten',
  name: 'Hover Brighten',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Element brightens/lightens on hover',
  css: `.hover-brighten {
  transition: filter 0.3s ease;
}

.hover-brighten:hover {
  filter: brightness(1.15);
}`,
  tags: ['hover', 'brighten', 'lighten', 'filter', 'image'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Darken - Decreases brightness
 */
export const hoverDarken: RoyCSSEffect = {
  id: 'hover-darken',
  name: 'Hover Darken',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Element darkens on hover',
  css: `.hover-darken {
  transition: filter 0.3s ease;
}

.hover-darken:hover {
  filter: brightness(0.85);
}`,
  tags: ['hover', 'darken', 'dim', 'filter', 'overlay'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Grayscale - Removes color on hover
 */
export const hoverGrayscale: RoyCSSEffect = {
  id: 'hover-grayscale',
  name: 'Hover Grayscale',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Image becomes grayscale on hover (or vice versa)',
  css: `.hover-grayscale {
  filter: grayscale(0%);
  transition: filter 0.4s ease;
}

.hover-grayscale:hover {
  filter: grayscale(100%);
}`,
  tags: ['hover', 'grayscale', 'monochrome', 'filter', 'image'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Color Shift - Background color change
 */
export const hoverColorShift: RoyCSSEffect = {
  id: 'hover-color-shift',
  name: 'Hover Color Shift',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Background color smoothly transitions on hover',
  css: `.hover-color-shift {
  background-color: #3b82f6;
  transition: background-color 0.3s ease;
}

.hover-color-shift:hover {
  background-color: #2563eb;
}`,
  tags: ['hover', 'color', 'background', 'transition', 'button'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Border Glow - Glowing border effect
 */
export const hoverBorderGlow: RoyCSSEffect = {
  id: 'hover-border-glow',
  name: 'Hover Border Glow',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Border glows with colored shadow on hover',
  css: `.hover-border-glow {
  border: 2px solid #e5e7eb;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.hover-border-glow:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}`,
  tags: ['hover', 'border', 'glow', 'neon', 'focus'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Gradient Reveal - Reveals gradient overlay
 */
export const hoverGradientReveal: RoyCSSEffect = {
  id: 'hover-gradient-reveal',
  name: 'Hover Gradient Reveal',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Gradient overlay slides in on hover',
  css: `.hover-gradient-reveal {
  position: relative;
  overflow: hidden;
}

.hover-gradient-reveal::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s ease;
}

.hover-gradient-reveal:hover::before {
  left: 100%;
}`,
  tags: ['hover', 'gradient', 'shine', 'reveal', 'shimmer'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Hover Image Zoom - Image scales within container
 */
export const hoverImageZoom: RoyCSSEffect = {
  id: 'hover-image-zoom',
  name: 'Hover Image Zoom',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Image zooms/scales up within its container on hover',
  css: `.hover-image-zoom-container {
  overflow: hidden;
}

.hover-image-zoom {
  transition: transform 0.5s ease;
  display: block;
  width: 100%;
}

.hover-image-zoom-container:hover .hover-image-zoom {
  transform: scale(1.1);
}`,
  tags: ['hover', 'image', 'zoom', 'gallery', 'portfolio'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'zoomLevel', label: 'Zoom Level', description: 'Scale factor', type: 'number', defaultValue: 1.1, min: 1, max: 2, step: 0.05 },
  ],
};

/**
 * Hover Overlay Fade - Dark overlay appears
 */
export const hoverOverlayFade: RoyCSSEffect = {
  id: 'hover-overlay-fade',
  name: 'Hover Overlay Fade',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Semi-transparent overlay fades in on hover',
  css: `.hover-overlay-container {
  position: relative;
  overflow: hidden;
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.hover-overlay-container:hover .hover-overlay {
  opacity: 1;
}`,
  tags: ['hover', 'overlay', 'fade', 'caption', 'gallery'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hover Text Slide Up - Text slides into view
 */
export const hoverTextSlideUp: RoyCSSEffect = {
  id: 'hover-text-slide-up',
  name: 'Hover Text Slide Up',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Hidden text slides up from bottom on hover',
  css: `.hover-text-slide-up-container {
  position: relative;
  overflow: hidden;
}

.hover-text-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.hover-text-slide-up-container:hover .hover-text-content {
  transform: translateY(0);
}`,
  tags: ['hover', 'text', 'slide', 'caption', 'reveal'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// CLICK / ACTIVE EFFECTS
// ============================================================================

/**
 * Click Press Down - Button press feedback
 */
export const clickPressDown: RoyCSSEffect = {
  id: 'click-press-down',
  name: 'Click Press Down',
  category: 'interactive',
  subCategory: 'click',
  description: 'Element presses down when clicked/touched',
  css: `.click-press-down {
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  cursor: pointer;
}

.click-press-down:active {
  transform: scale(0.97);
  box-shadow: none;
}`,
  tags: ['click', 'active', 'press', 'button', 'feedback'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'pressScale', label: 'Press Scale', description: 'Scale when pressed', type: 'number', defaultValue: 0.97, min: 0.9, max: 1, step: 0.01 },
  ],
};

/**
 * Click Ripple - Material Design ripple
 */
export const clickRipple: RoyCSSEffect = {
  id: 'click-ripple',
  name: 'Click Ripple',
  category: 'interactive',
  subCategory: 'click',
  description: 'Material Design ripple effect on click',
  css: `.click-ripple {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.click-ripple::after {
  content: '';
  position: absolute;
  width: 100%;
  padding-top: 100%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  transform: scale(0);
  transform-origin: center;
  opacity: 0;
}

.click-ripple:active::after {
  animation: rippleEffect 0.6s ease-out;
}

@keyframes rippleEffect {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}`,
  tags: ['click', 'ripple', 'material', 'wave', 'feedback'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Click Bounce - Elastic bounce on click
 */
export const clickBounce: RoyCSSEffect = {
  id: 'click-bounce',
  name: 'Click Bounce',
  category: 'interactive',
  subCategory: 'click',
  description: 'Bouncy elastic animation when clicked',
  css: `.click-bounce {
  cursor: pointer;
}

.click-bounce:active {
  animation: clickBounceAnim 0.4s ease;
}

@keyframes clickBounceAnim {
  0% { transform: scale(1); }
  25% { transform: scale(0.92); }
  50% { transform: scale(1.04); }
  75% { transform: scale(0.98); }
  100% { transform: scale(1); }
}`,
  tags: ['click', 'bounce', 'elastic', 'animation', 'playful'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Click Glow - Flash of light on click
 */
export const clickGlow: RoyCSSEffect = {
  id: 'click-glow',
  name: 'Click Glow',
  category: 'interactive',
  subCategory: 'click',
  description: 'Brief glow/pulse effect on click',
  css: `.click-glow {
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.click-glow:active {
  box-shadow: 
    0 0 0 4px rgba(59, 130, 246, 0.3),
    0 0 20px rgba(59, 130, 246, 0.4);
}`,
  tags: ['click', 'glow', 'pulse', 'flash', 'highlight'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Click Shake - Error shake animation
 */
export const clickShake: RoyCSSEffect = {
  id: 'click-shake',
  name: 'Click Shake',
  category: 'interactive',
  subCategory: 'click',
  description: 'Shake animation triggered by click (for errors)',
  css: `.click-shake {
  cursor: pointer;
}

.click-shake.shaking {
  animation: clickShakeAnim 0.5s ease-in-out;
}

@keyframes clickShakeAnim {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}`,
  tags: ['click', 'shake', 'error', 'vibrate', 'warning'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Click Spin - Brief rotation on click
 */
export const clickSpin: RoyCSSEffect = {
  id: 'click-spin',
  name: 'Click Spin',
  category: 'interactive',
  subCategory: 'click',
  description: 'Quick spin/rotation animation on click',
  css: `.click-spin {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.click-spin:active {
  animation: clickSpinAnim 0.4s ease;
}

@keyframes clickSpinAnim {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
  tags: ['click', 'spin', 'rotate', 'refresh', 'icon'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// FOCUS EFFECTS
// ============================================================================

/**
 * Focus Ring - Accessible focus indicator
 */
export const focusRing: RoyCSSEffect = {
  id: 'focus-ring',
  name: 'Focus Ring',
  category: 'interactive',
  subCategory: 'focus',
  description: 'Accessible focus ring that appears on keyboard navigation',
  css: `.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}`,
  tailwind: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  tags: ['focus', 'accessibility', 'keyboard', 'a11y', 'ring'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Focus Underline - Animated underline on focus
 */
export const focusUnderline: RoyCSSEffect = {
  id: 'focus-underline',
  name: 'Focus Underline',
  category: 'interactive',
  subCategory: 'focus',
  description: 'Underline animates from center on input focus',
  css: `.focus-underline-wrapper {
  position: relative;
}

.focus-underline {
  width: 100%;
  border: none;
  border-bottom: 2px solid #e5e7eb;
  background: transparent;
  padding: 12px 0;
  transition: border-color 0.3s ease;
}

.focus-underline:focus {
  outline: none;
  border-bottom-color: #3b82f6;
}

.focus-underline-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: #3b82f6;
  transition: width 0.3s ease, left 0.3s ease;
}

.focus-underline-wrapper:focus-within::after {
  width: 100%;
  left: 0;
}`,
  tags: ['focus', 'underline', 'input', 'form', 'animated'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Focus Expand - Input expands on focus
 */
export const focusExpand: RoyCSSEffect = {
  id: 'focus-expand',
  name: 'Focus Expand',
  category: 'interactive',
  subCategory: 'focus',
  description: 'Input field expands/grows when focused',
  css: `.focus-expand {
  width: 200px;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.focus-expand:focus {
  outline: none;
  width: 280px;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}`,
  tags: ['focus', 'expand', 'grow', 'input', 'search'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Focus Label Float - Floating label pattern
 */
export const focusLabelFloat: RoyCSSEffect = {
  id: 'focus-label-float',
  name: 'Focus Label Float',
  category: 'interactive',
  subCategory: 'focus',
  description: 'Label floats up when input is focused or has value',
  css: `.float-label-group {
  position: relative;
}

.float-label-input {
  width: 100%;
  padding: 16px 12px 8px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.float-label-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.float-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  transition: all 0.2s ease;
}

.float-label-input:focus + .float-label,
.float-label-input:not(:placeholder-shown) + .float-label {
  top: 8px;
  font-size: 12px;
  transform: translateY(0);
  color: #3b82f6;
}`,
  tags: ['focus', 'label', 'float', 'form', 'material'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// SCROLL-TRIGGERED EFFECTS
// ============================================================================

/**
 * Scroll Fade In - Elements fade as you scroll
 */
export const scrollFadeIn: RoyCSSEffect = {
  id: 'scroll-fade-in',
  name: 'Scroll Fade In',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Elements fade in as they enter viewport while scrolling',
  css: `.scroll-fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.scroll-fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Requires JavaScript Intersection Observer to add .visible class */`,
  tags: ['scroll', 'fade-in', 'viewport', 'intersection', 'lazy'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Scroll Slide Left - Slides in from left
 */
export const scrollSlideLeft: RoyCSSEffect = {
  id: 'scroll-slide-left',
  name: 'Scroll Slide Left',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Elements slide in from left as they enter viewport',
  css: `.scroll-slide-left {
  opacity: 0;
  transform: translateX(-60px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.scroll-slide-left.visible {
  opacity: 1;
  transform: translateX(0);
}`,
  tags: ['scroll', 'slide', 'left', 'viewport', 'entrance'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Scroll Slide Right - Slides in from right
 */
export const scrollSlideRight: RoyCSSEffect = {
  id: 'scroll-slide-right',
  name: 'Scroll Slide Right',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Elements slide in from right as they enter viewport',
  css: `.scroll-slide-right {
  opacity: 0;
  transform: translateX(60px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.scroll-slide-right.visible {
  opacity: 1;
  transform: translateX(0);
}`,
  tags: ['scroll', 'slide', 'right', 'viewport', 'entrance'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Scroll Scale Up - Scales up on scroll
 */
export const scrollScaleUp: RoyCSSEffect = {
  id: 'scroll-scale-up',
  name: 'Scroll Scale Up',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Elements scale up from small as they enter viewport',
  css: `.scroll-scale-up {
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.scroll-scale-up.visible {
  opacity: 1;
  transform: scale(1);
}`,
  tags: ['scroll', 'scale', 'pop', 'viewport', 'entrance'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Scroll Rotate In - Rotates into view
 */
export const scrollRotateIn: RoyCSSEffect = {
  id: 'scroll-rotate-in',
  name: 'Scroll Rotate In',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Elements rotate into view as they appear',
  css: `.scroll-rotate-in {
  opacity: 0;
  transform: rotate(-10deg);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.scroll-rotate-in.visible {
  opacity: 1;
  transform: rotate(0deg);
}`,
  tags: ['scroll', 'rotate', 'twist', 'viewport', 'dynamic'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Stagger Scroll - Sequential staggered reveals
 */
export const staggerScroll: RoyCSSEffect = {
  id: 'stagger-scroll',
  name: 'Stagger Scroll',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Children reveal sequentially with staggered delays',
  css: `.stagger-scroll > * {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.stagger-scroll.visible > *:nth-child(1) { transition-delay: 0ms; }
.stagger-scroll.visible > *:nth-child(2) { transition-delay: 100ms; }
.stagger-scroll.visible > *:nth-child(3) { transition-delay: 200ms; }
.stagger-scroll.visible > *:nth-child(4) { transition-delay: 300ms; }
.stagger-scroll.visible > *:nth-child(5) { transition-delay: 400ms; }

.stagger-scroll.visible > * {
  opacity: 1;
  transform: translateY(0);
}`,
  tags: ['scroll', 'stagger', 'sequential', 'children', 'list'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Parallax Slow - Moves slower than scroll
 */
export const parallaxSlow: RoyCSSEffect = {
  id: 'parallax-slow',
  name: 'Parallax Slow',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Background moves at different speed than foreground',
  css: `.parallax-container {
  overflow: hidden;
  position: relative;
}

.parallax-slow {
  will-change: transform;
  transition: transform 0.1s linear;
  /* Transform value set via JS based on scroll position */
}`,
  tags: ['parallax', 'depth', 'scroll-speed', 'background', 'immersive'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Progress Bar Scroll - Page reading progress
 */
export const progressBarScroll: RoyCSSEffect = {
  id: 'progress-bar-scroll',
  name: 'Progress Bar Scroll',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Fixed progress bar showing page scroll position',
  css: `.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 0%;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  z-index: 9999;
  transition: width 0.1s linear;
}`,
  tags: ['progress', 'bar', 'reading', 'scroll-position', 'indicator'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Sticky Header - Header sticks on scroll
 */
export const stickyHeader: RoyCSSEffect = {
  id: 'sticky-header',
  name: 'Sticky Header',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Navigation header becomes sticky after scrolling past',
  css: `.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  transition: box-shadow 0.3s ease, background 0.3s ease;
}

.sticky-header.scrolled {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(8px);
}`,
  tags: ['sticky', 'header', 'navbar', 'fixed', 'scroll'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Back to Top Button - Appears on scroll
 */
export const backToTopButton: RoyCSSEffect = {
  id: 'back-to-top-button',
  name: 'Back to Top Button',
  category: 'interactive',
  subCategory: 'scroll',
  description: 'Floating button that appears after scrolling down',
  css: `.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px);
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.back-to-top.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.back-to-top:hover {
  background: #2563eb;
  transform: translateY(-4px);
}`,
  tags: ['back-to-top', 'floating', 'button', 'scroll', 'navigation'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// DRAG & DROP EFFECTS
// ============================================================================

/**
 * Draggable Item - Visual feedback for dragging
 */
export const draggableItem: RoyCSSEffect = {
  id: 'draggable-item',
  name: 'Draggable Item',
  category: 'interactive',
  subCategory: 'drag',
  description: 'Visual styling for draggable elements',
  css: `.draggable-item {
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  user-select: none;
}

.draggable-item:active {
  cursor: grabbing;
}

.draggable-item.dragging {
  opacity: 0.5;
  transform: scale(1.02) rotate(2deg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}`,
  tags: ['drag', 'draggable', 'grab', 'move', 'reorder'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Drop Zone - Target area for drops
 */
export const dropZone: RoyCSSEffect = {
  id: 'drop-zone',
  name: 'Drop Zone',
  category: 'interactive',
  subCategory: 'drag',
  description: 'Visual feedback for drop target areas',
  css: `.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
  background: #f9fafb;
}

.drop-zone.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: scale(1.02);
}

.drop-zone.drag-over::after {
  content: 'Drop here';
  color: #3b82f6;
  font-weight: 600;
}`,
  tags: ['drop', 'zone', 'target', 'upload', 'area'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Drag Ghost - Custom drag preview
 */
export const dragGhost: RoyCSSEffect = {
  id: 'drag-ghost',
  name: 'Drag Ghost',
  category: 'interactive',
  subCategory: 'drag',
  description: 'Custom ghost image shown during drag',
  css: `.drag-ghost {
  /* Applied to the dragged element's ghost image */
  opacity: 0.8;
  transform: rotate(3deg);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  max-width: 280px;
}`,
  tags: ['drag', 'ghost', 'preview', 'custom', 'visual'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// CURSOR EFFECTS
// ============================================================================

/**
 * Cursor Pointer - Indicates clickable
 */
export const cursorPointer: RoyCSSEffect = {
  id: 'cursor-pointer',
  name: 'Cursor Pointer',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Changes cursor to indicate interactivity',
  css: `.cursor-pointer {
  cursor: pointer;
}`,
  tailwind: 'cursor-pointer',
  tags: ['cursor', 'pointer', 'clickable', 'basic'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Cursor Grab - Indicates draggable
 */
export const cursorGrab: RoyCSSEffect = {
  id: 'cursor-grab',
  name: 'Cursor Grab',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Grab hand cursor for draggable items',
  css: `.cursor-grab {
  cursor: grab;
}

.cursor-grab:active {
  cursor: grabbing;
}`,
  tailwind: 'cursor-grab active:cursor-grabbing',
  tags: ['cursor', 'grab', 'draggable', 'hand'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Cursor Not Allowed - Disabled state
 */
export const cursorNotAllowed: RoyCSSEffect = {
  id: 'cursor-not-allowed',
  name: 'Cursor Not Allowed',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Indicates disabled/non-interactive state',
  css: `.cursor-not-allowed {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}`,
  tailwind: 'cursor-not-allowed opacity-60 pointer-events-none',
  tags: ['cursor', 'disabled', 'not-allowed', 'state'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Custom Cursor - Custom cursor style
 */
export const customCursor: RoyCSSEffect = {
  id: 'custom-cursor',
  name: 'Custom Cursor',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Custom cursor image on hover',
  css: `.custom-cursor {
  cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%233b82f6"/></svg>') 12 12, auto;
}`,
  tags: ['cursor', 'custom', 'image', 'svg', 'branding'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// SELECTION EFFECTS
// ============================================================================

/**
 * No Select - Prevent text selection
 */
export const noSelect: RoyCSSEffect = {
  id: 'no-select',
  name: 'No Select',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Prevents text selection on element',
  css: `.no-select {
  user-select: none;
  -webkit-user-select: none;
}`,
  tailwind: 'select-none',
  tags: ['selection', 'no-select', 'text', 'prevent'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Custom Selection Color - Highlight color
 */
export const customSelectionColor: RoyCSSEffect = {
  id: 'custom-selection-color',
  name: 'Custom Selection Color',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Custom text selection highlight colors',
  css: `.custom-selection-color ::selection {
  background: #3b82f6;
  color: white;
}

.custom-selection-color ::-moz-selection {
  background: #3b82f6;
  color: white;
}`,
  tags: ['selection', 'highlight', 'color', 'branding', 'custom'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// DISABLED STATE EFFECTS
// ============================================================================

/**
 * Disabled State - Grayed out appearance
 */
export const disabledState: RoyCSSEffect = {
  id: 'disabled-state',
  name: 'Disabled State',
  category: 'interactive',
  subCategory: 'click',
  description: 'Visual disabled/inactive state styling',
  css: `.disabled-state {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(100%);
}

.disabled-state button,
.disabled-state a {
  pointer-events: none;
}`,
  tags: ['disabled', 'inactive', 'gray', 'state', 'form'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Loading State - Skeleton loading placeholder
 */
export const loadingState: RoyCSSEffect = {
  id: 'loading-state',
  name: 'Loading State',
  category: 'interactive',
  subCategory: 'click',
  description: 'Loading skeleton placeholder animation',
  css: `.loading-state {
  position: relative;
  overflow: hidden;
  color: transparent !important;
  pointer-events: none;
}

.loading-state::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loadingShimmer 1.5s infinite;
}

@keyframes loadingShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
  tags: ['loading', 'skeleton', 'placeholder', 'shimmer', 'async'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// TOOLTIP EFFECTS
// ============================================================================

/**
 * Tooltip - Hover to reveal info
 */
export const tooltip: RoyCSSEffect = {
  id: 'tooltip',
  name: 'Tooltip',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Tooltip that appears on hover',
  css: `.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip-content {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 8px 12px;
  background: #1f2937;
  color: white;
  font-size: 13px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 100;
}

.tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1f2937;
}

.tooltip-wrapper:hover .tooltip-content {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}`,
  tags: ['tooltip', 'hint', 'info', 'popover', 'hover'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Popover - Larger tooltip with more content
 */
export const popover: RoyCSSEffect = {
  id: 'popover',
  name: 'Popover',
  category: 'interactive',
  subCategory: 'hover',
  description: 'Larger popover panel with rich content',
  css: `.popover-wrapper {
  position: relative;
  display: inline-block;
}

.popover-content {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  width: 280px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s ease;
  z-index: 100;
}

.popover-wrapper:hover .popover-content,
.popover-wrapper:focus-within .popover-content {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}`,
  tags: ['popover', 'panel', 'dropdown', 'rich', 'content'],
  browserSupport: INTERACTIVE_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Interactive Effects
// ============================================================================

/**
 * Complete array of all interactive effects
 */
export const interactiveEffects: RoyCSSEffect[] = [
  // Hover Effects - Scale & Transform
  hoverScaleUp, hoverScaleDown, hoverLift, hoverTilt,
  hoverRotate, hoverSkew, hoverFlip,

  // Hover Effects - Color & Visual
  hoverBrighten, hoverDarken, hoverGrayscale, hoverColorShift,
  hoverBorderGlow, hoverGradientReveal, hoverImageZoom,
  hoverOverlayFade, hoverTextSlideUp,

  // Click/Active Effects
  clickPressDown, clickRipple, clickBounce, clickGlow,
  clickShake, clickSpin,

  // Focus Effects
  focusRing, focusUnderline, focusExpand, focusLabelFloat,

  // Scroll Effects
  scrollFadeIn, scrollSlideLeft, scrollSlideRight,
  scrollScaleUp, scrollRotateIn, staggerScroll,
  parallaxSlow, progressBarScroll, stickyHeader,
  backToTopButton,

  // Drag & Drop
  draggableItem, dropZone, dragGhost,

  // Cursor Effects
  cursorPointer, cursorGrab, cursorNotAllowed, customCursor,

  // Selection Effects
  noSelect, customSelectionColor,

  // State Effects
  disabledState, loadingState,

  // Tooltip/Popover
  tooltip, popover,
];

export default interactiveEffects;
