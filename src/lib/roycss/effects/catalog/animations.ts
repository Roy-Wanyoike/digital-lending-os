/**
 * ROYCSS Animation Effects Catalog
 * 
 * Comprehensive collection of 100+ CSS animation effects
 * including entrances, exits, attention seekers, and loading states.
 * 
 * @module roycss/effects/catalog/animations
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Animations
// ============================================================================

const ANIMATION_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'CSS animations supported in all modern browsers',
};

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

/**
 * Fade In animation - Simple opacity transition
 */
export const fadeIn: RoyCSSEffect = {
  id: 'fade-in',
  name: 'Fade In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element fades in from transparent to fully visible',
  css: `.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}`,
  tailwind: 'animate-[fadeIn_0.5s_ease-out_forwards]',
  tags: ['fade', 'entrance', 'opacity', 'simple', 'beginner'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'duration', label: 'Duration', description: 'Animation duration', type: 'time', defaultValue: '0.5s', min: 0.1, max: 5, step: 0.1 },
    { name: 'easing', label: 'Easing', description: 'Timing function', type: 'enum', defaultValue: 'ease-out', options: ['ease-in', 'ease-out', 'ease-in-out', 'linear'] },
  ],
};

/**
 * Fade In Up - Element fades in while sliding up
 */
export const fadeInUp: RoyCSSEffect = {
  id: 'fade-in-up',
  name: 'Fade In Up',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element fades in and slides up from below',
  css: `.fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  tags: ['fade', 'slide', 'up', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Slide distance in pixels', type: 'length', defaultValue: 30, min: 10, max: 100, unit: 'px' },
    { name: 'duration', label: 'Duration', description: 'Animation duration', type: 'time', defaultValue: '0.6s' },
  ],
};

/**
 * Fade In Down - Element fades in while sliding down
 */
export const fadeInDown: RoyCSSEffect = {
  id: 'fade-in-down',
  name: 'Fade In Down',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element fades in and slides down from above',
  css: `.fade-in-down {
  animation: fadeInDown 0.6s ease-out forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  tags: ['fade', 'slide', 'down', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Slide distance', type: 'length', defaultValue: 30, unit: 'px' },
    { name: 'duration', label: 'Duration', description: 'Animation duration', type: 'time', defaultValue: '0.6s' },
  ],
};

/**
 * Fade In Left - Element fades in from left
 */
export const fadeInLeft: RoyCSSEffect = {
  id: 'fade-in-left',
  name: 'Fade In Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element fades in and slides from left to right',
  css: `.fade-in-left {
  animation: fadeInLeft 0.6s ease-out forwards;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`,
  tags: ['fade', 'slide', 'left', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Slide distance', type: 'length', defaultValue: 50, unit: 'px' },
  ],
};

/**
 * Fade In Right - Element fades in from right
 */
export const fadeInRight: RoyCSSEffect = {
  id: 'fade-in-right',
  name: 'Fade In Right',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element fades in and slides from right to left',
  css: `.fade-in-right {
  animation: fadeInRight 0.6s ease-out forwards;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`,
  tags: ['fade', 'slide', 'right', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Slide distance', type: 'length', defaultValue: 50, unit: 'px' },
  ],
};

/**
 * Slide In Up - Pure slide without fade
 */
export const slideInUp: RoyCSSEffect = {
  id: 'slide-in-up',
  name: 'Slide In Up',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element slides up from below without fading',
  css: `.slide-in-up {
  animation: slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}`,
  tags: ['slide', 'up', 'entrance', 'pure-slide'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide In Down
 */
export const slideInDown: RoyCSSEffect = {
  id: 'slide-in-down',
  name: 'Slide In Down',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element slides down from above',
  css: `.slide-in-down {
  animation: slideInDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideInDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}`,
  tags: ['slide', 'down', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide In Left
 */
export const slideInLeft: RoyCSSEffect = {
  id: 'slide-in-left',
  name: 'Slide In Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element slides in from the left edge',
  css: `.slide-in-left {
  animation: slideInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}`,
  tags: ['slide', 'left', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide In Right
 */
export const slideInRight: RoyCSSEffect = {
  id: 'slide-in-right',
  name: 'Slide In Right',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element slides in from the right edge',
  css: `.slide-in-right {
  animation: slideInRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}`,
  tags: ['slide', 'right', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Zoom In - Scale from small to normal
 */
export const zoomIn: RoyCSSEffect = {
  id: 'zoom-in',
  name: 'Zoom In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element scales up from a smaller size',
  css: `.zoom-in {
  animation: zoomIn 0.6s ease-out forwards;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}`,
  tags: ['zoom', 'scale', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'fromScale', label: 'Start Scale', description: 'Initial scale value', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
  ],
};

/**
 * Bounce In - Bouncy entrance effect
 */
export const bounceIn: RoyCSSEffect = {
  id: 'bounce-in',
  name: 'Bounce In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element bounces in with elastic overshoot',
  css: `.bounce-in {
  animation: bounceIn 0.75s forwards;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}`,
  tags: ['bounce', 'elastic', 'entrance', 'fun'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'initialScale', label: 'Initial Scale', description: 'Starting size', type: 'number', defaultValue: 0.3 },
    { name: 'overshoot', label: 'Overshoot', description: 'Maximum overshoot scale', type: 'number', defaultValue: 1.05 },
  ],
};

/**
 * Bounce In Up
 */
export const bounceInUp: RoyCSSEffect = {
  id: 'bounce-in-up',
  name: 'Bounce In Up',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element bounces in from below',
  css: `.bounce-in-up {
  animation: bounceInUp 0.8s forwards;
}

@keyframes bounceInUp {
  0% {
    opacity: 0;
    transform: translateY(100%) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateY(-20%) scale(1.02);
  }
  80% {
    transform: translateY(10%) scale(0.98);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}`,
  tags: ['bounce', 'up', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Bounce In Down
 */
export const bounceInDown: RoyCSSEffect = {
  id: 'bounce-in-down',
  name: 'Bounce In Down',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element bounces in from above',
  css: `.bounce-in-down {
  animation: bounceInDown 0.8s forwards;
}

@keyframes bounceInDown {
  0% {
    opacity: 0;
    transform: translateY(-100%) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateY(20%) scale(1.02);
  }
  80% {
    transform: translateY(-10%) scale(0.98);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}`,
  tags: ['bounce', 'down', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Bounce In Left
 */
export const bounceInLeft: RoyCSSEffect = {
  id: 'bounce-in-left',
  name: 'Bounce In Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element bounces in from the left',
  css: `.bounce-in-left {
  animation: bounceInLeft 0.8s forwards;
}

@keyframes bounceInLeft {
  0% {
    opacity: 0;
    transform: translateX(-100%) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateX(20%) scale(1.02);
  }
  80% {
    transform: translateX(-10%) scale(0.98);
  }
  100% {
    transform: translateX(0) scale(1);
  }
}`,
  tags: ['bounce', 'left', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Bounce In Right
 */
export const bounceInRight: RoyCSSEffect = {
  id: 'bounce-in-right',
  name: 'Bounce In Right',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element bounces in from the right',
  css: `.bounce-in-right {
  animation: bounceInRight 0.8s forwards;
}

@keyframes bounceInRight {
  0% {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateX(-20%) scale(1.02);
  }
  80% {
    transform: translateX(10%) scale(0.98);
  }
  100% {
    transform: translateX(0) scale(1);
  }
}`,
  tags: ['bounce', 'right', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Flip In X - 3D horizontal flip entrance
 */
export const flipInX: RoyCSSEffect = {
  id: 'flip-in-x',
  name: 'Flip In X',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element flips in on its horizontal axis',
  css: `.flip-in-x {
  animation: flipInX 0.6s ease-out forwards;
  backface-visibility: visible !important;
}

@keyframes flipInX {
  0% {
    opacity: 0;
    transform: perspective(400px) rotateX(90deg);
  }
  40% {
    transform: perspective(400px) rotateX(-10deg);
  }
  70% {
    transform: perspective(400px) rotateX(10deg);
  }
  100% {
    opacity: 1;
    transform: perspective(400px) rotateX(0deg);
  }
}`,
  tags: ['flip', '3d', 'rotate', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [
    { name: 'perspective', label: 'Perspective', description: '3D perspective value', type: 'number', defaultValue: 400, min: 100, max: 2000 },
  ],
};

/**
 * Flip In Y - 3D vertical flip entrance
 */
export const flipInY: RoyCSSEffect = {
  id: 'flip-in-y',
  name: 'Flip In Y',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element flips in on its vertical axis',
  css: `.flip-in-y {
  animation: flipInY 0.6s ease-out forwards;
  backface-visibility: visible !important;
}

@keyframes flipInY {
  0% {
    opacity: 0;
    transform: perspective(400px) rotateY(90deg);
  }
  40% {
    transform: perspective(400px) rotateY(-10deg);
  }
  70% {
    transform: perspective(400px) rotateY(10deg);
  }
  100% {
    opacity: 1;
    transform: perspective(400px) rotateY(0deg);
  }
}`,
  tags: ['flip', '3d', 'rotate', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Rotate In - Rotational entrance
 */
export const rotateIn: RoyCSSEffect = {
  id: 'rotate-in',
  name: 'Rotate In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element rotates into view from a starting angle',
  css: `.rotate-in {
  animation: rotateIn 0.6s ease-out forwards;
}

@keyframes rotateIn {
  from {
    opacity: 0;
    transform: rotate(-200deg);
  }
  to {
    opacity: 1;
    transform: rotate(0deg);
  }
}`,
  tags: ['rotate', 'spin', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'fromAngle', label: 'Start Angle', description: 'Initial rotation angle', type: 'angle', defaultValue: '-200deg' },
  ],
};

/**
 * Rotate In Down Left
 */
export const rotateInDownLeft: RoyCSSEffect = {
  id: 'rotate-in-down-left',
  name: 'Rotate In Down Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element rotates in from top-left corner',
  css: `.rotate-in-down-left {
  animation: rotateInDownLeft 0.6s ease-out forwards;
  transform-origin: left bottom;
}

@keyframes rotateInDownLeft {
  from {
    opacity: 0;
    transform: rotate(-45deg);
  }
  to {
    opacity: 1;
    transform: rotate(0deg);
  }
}`,
  tags: ['rotate', 'corner', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * LightSpeed In - Fast sliding entrance with motion blur effect
 */
export const lightSpeedIn: RoyCSSEffect = {
  id: 'lightspeed-in',
  name: 'LightSpeed In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Fast entrance from the side with slight rotation',
  css: `.lightspeed-in {
  animation: lightSpeedIn 0.6s ease-out forwards;
}

@keyframes lightSpeedIn {
  from {
    opacity: 0;
    transform: translateX(100%) skewX(-30deg);
  }
  60% {
    opacity: 1;
    transform: translateX(-5%) skewX(20deg);
  }
  80% {
    transform: translateX(0%) skewX(-5deg);
  }
  100% {
    transform: translateX(0%) skewX(0deg);
  }
}`,
  tags: ['fast', 'skew', 'speed', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Roll In - Rolling entrance like a wheel
 */
export const rollIn: RoyCSSEffect = {
  id: 'roll-in',
  name: 'Roll In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element rolls in like a rotating wheel',
  css: `.roll-in {
  animation: rollIn 0.8s ease-out forwards;
}

@keyframes rollIn {
  from {
    opacity: 0;
    transform: translateX(-100%) rotate(-120deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotate(0deg);
  }
}`,
  tags: ['roll', 'wheel', 'rotate', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Expand In - Expands from center outward
 */
export const expandIn: RoyCSSEffect = {
  id: 'expand-in',
  name: 'Expand In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element expands outward from center point',
  css: `.expand-in {
  animation: expandIn 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}`,
  tags: ['expand', 'scale', 'center', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * BackInDown - Slides back then forward
 */
export const backInDown: RoyCSSEffect = {
  id: 'back-in-down',
  name: 'Back In Down',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element pulls back slightly before sliding forward',
  css: `.back-in-down {
  animation: backInDown 0.8s ease-out forwards;
}

@keyframes backInDown {
  0% {
    opacity: 0;
    transform: translateY(-1200px) scale(0.7);
  }
  80% {
    opacity: 1;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}`,
  tags: ['back', 'anticipation', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * BackInLeft
 */
export const backInLeft: RoyCSSEffect = {
  id: 'back-in-left',
  name: 'Back In Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element pulls back left before entering',
  css: `.back-in-left {
  animation: backInLeft 0.8s ease-out forwards;
}

@keyframes backInLeft {
  0% {
    opacity: 0;
    transform: translateX(-1200px) scale(0.7);
  }
  80% {
    opacity: 1;
    transform: translateX(20px) scale(0.95);
  }
  100% {
    transform: translateX(0) scale(1);
  }
}`,
  tags: ['back', 'anticipation', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * BackInRight
 */
export const backInRight: RoyCSSEffect = {
  id: 'back-in-right',
  name: 'Back In Right',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element pulls back right before entering',
  css: `.back-in-right {
  animation: backInRight 0.8s ease-out forwards;
}

@keyframes backInRight {
  0% {
    opacity: 0;
    transform: translateX(1200px) scale(0.7);
  }
  80% {
    opacity: 1;
    transform: translateX(-20px) scale(0.95);
  }
  100% {
    transform: translateX(0) scale(1);
  }
}`,
  tags: ['back', 'anticipation', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// EXIT ANIMATIONS
// ============================================================================

/**
 * Fade Out
 */
export const fadeOut: RoyCSSEffect = {
  id: 'fade-out',
  name: 'Fade Out',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element fades out to transparent',
  css: `.fade-out {
  animation: fadeOut 0.5s ease-in forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}`,
  tags: ['fade', 'exit', 'opacity', 'simple'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Fade Out Up
 */
export const fadeOutUp: RoyCSSEffect = {
  id: 'fade-out-up',
  name: 'Fade Out Up',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element fades out while moving upward',
  css: `.fade-out-up {
  animation: fadeOutUp 0.5s ease-in forwards;
}

@keyframes fadeOutUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}`,
  tags: ['fade', 'up', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Fade Out Down
 */
export const fadeOutDown: RoyCSSEffect = {
  id: 'fade-out-down',
  name: 'Fade Out Down',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element fades out while moving downward',
  css: `.fade-out-down {
  animation: fadeOutDown 0.5s ease-in forwards;
}

@keyframes fadeOutDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}`,
  tags: ['fade', 'down', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Fade Out Left
 */
export const fadeOutLeft: RoyCSSEffect = {
  id: 'fade-out-left',
  name: 'Fade Out Left',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element fades out while moving left',
  css: `.fade-out-left {
  animation: fadeOutLeft 0.5s ease-in forwards;
}

@keyframes fadeOutLeft {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}`,
  tags: ['fade', 'left', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Fade Out Right
 */
export const fadeOutRight: RoyCSSEffect = {
  id: 'fade-out-right',
  name: 'Fade Out Right',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element fades out while moving right',
  css: `.fade-out-right {
  animation: fadeOutRight 0.5s ease-in forwards;
}

@keyframes fadeOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}`,
  tags: ['fade', 'right', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Zoom Out
 */
export const zoomOut: RoyCSSEffect = {
  id: 'zoom-out',
  name: 'Zoom Out',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element scales down and fades out',
  css: `.zoom-out {
  animation: zoomOut 0.6s ease-in forwards;
}

@keyframes zoomOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.5);
  }
}`,
  tags: ['zoom', 'scale', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide Out Up
 */
export const slideOutUp: RoyCSSEffect = {
  id: 'slide-out-up',
  name: 'Slide Out Up',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element slides upward out of view',
  css: `.slide-out-up {
  animation: slideOutUp 0.5s ease-in forwards;
}

@keyframes slideOutUp {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}`,
  tags: ['slide', 'up', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide Out Down
 */
export const slideOutDown: RoyCSSEffect = {
  id: 'slide-out-down',
  name: 'Slide Out Down',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element slides downward out of view',
  css: `.slide-out-down {
  animation: slideOutDown 0.5s ease-in forwards;
}

@keyframes slideOutDown {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}`,
  tags: ['slide', 'down', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide Out Left
 */
export const slideOutLeft: RoyCSSEffect = {
  id: 'slide-out-left',
  name: 'Slide Out Left',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element slides left out of view',
  css: `.slide-out-left {
  animation: slideOutLeft 0.5s ease-in forwards;
}

@keyframes slideOutLeft {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}`,
  tags: ['slide', 'left', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Slide Out Right
 */
export const slideOutRight: RoyCSSEffect = {
  id: 'slide-out-right',
  name: 'Slide Out Right',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element slides right out of view',
  css: `.slide-out-right {
  animation: slideOutRight 0.5s ease-in forwards;
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}`,
  tags: ['slide', 'right', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Flip Out X
 */
export const flipOutX: RoyCSSEffect = {
  id: 'flip-out-x',
  name: 'Flip Out X',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element flips out horizontally',
  css: `.flip-out-x {
  animation: flipOutX 0.6s ease-in forwards;
  backface-visibility: visible !important;
}

@keyframes flipOutX {
  from {
    opacity: 1;
    transform: perspective(400px) rotateX(0deg);
  }
  40% {
    transform: perspective(400px) rotateX(-20deg);
  }
  100% {
    opacity: 0;
    transform: perspective(400px) rotateX(90deg);
  }
}`,
  tags: ['flip', '3d', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Flip Out Y
 */
export const flipOutY: RoyCSSEffect = {
  id: 'flip-out-y',
  name: 'Flip Out Y',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element flips out vertically',
  css: `.flip-out-y {
  animation: flipOutY 0.6s ease-in forwards;
  backface-visibility: visible !important;
}

@keyframes flipOutY {
  from {
    opacity: 1;
    transform: perspective(400px) rotateY(0deg);
  }
  40% {
    transform: perspective(400px) rotateY(20deg);
  }
  100% {
    opacity: 0;
    transform: perspective(400px) rotateY(-90deg);
  }
}`,
  tags: ['flip', '3d', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Rotate Out
 */
export const rotateOut: RoyCSSEffect = {
  id: 'rotate-out',
  name: 'Rotate Out',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element rotates out while fading',
  css: `.rotate-out {
  animation: rotateOut 0.6s ease-in forwards;
}

@keyframes rotateOut {
  from {
    opacity: 1;
    transform: rotate(0deg);
  }
  to {
    opacity: 0;
    transform: rotate(200deg);
  }
}`,
  tags: ['rotate', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * LightSpeed Out
 */
export const lightSpeedOut: RoyCSSEffect = {
  id: 'lightspeed-out',
  name: 'LightSpeed Out',
  category: 'animation',
  subCategory: 'exit',
  description: 'Fast exit with motion blur-like skew',
  css: `.lightspeed-out {
  animation: lightSpeedOut 0.5s ease-in forwards;
}

@keyframes lightSpeedOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateX(100%) skewX(30deg);
  }
}`,
  tags: ['fast', 'skew', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Roll Out
 */
export const rollOut: RoyCSSEffect = {
  id: 'roll-out',
  name: 'Roll Out',
  category: 'animation',
  subCategory: 'exit',
  description: 'Element rolls out like a wheel',
  css: `.roll-out {
  animation: rollOut 0.8s ease-in forwards;
}

@keyframes rollOut {
  from {
    opacity: 1;
    transform: translateX(0) rotate(0deg);
  }
  to {
    opacity: 0;
    transform: translateX(100%) rotate(120deg);
  }
}`,
  tags: ['roll', 'wheel', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// ATTENTION SEEKERS
// ============================================================================

/**
 * Pulse - Gentle pulsing effect
 */
export const pulse: RoyCSSEffect = {
  id: 'pulse',
  name: 'Pulse',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Gentle pulsing/scale animation to draw attention',
  css: `.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}`,
  tailwind: 'animate-pulse',
  tags: ['pulse', 'attention', 'looping', 'subtle'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'duration', label: 'Duration', description: 'Cycle duration', type: 'time', defaultValue: '2s' },
    { name: 'minOpacity', label: 'Min Opacity', description: 'Minimum opacity value', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
  ],
};

/**
 * Pulse Scale - Pulsing with scale change
 */
export const pulseScale: RoyCSSEffect = {
  id: 'pulse-scale',
  name: 'Pulse Scale',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Pulsing effect that also scales the element',
  css: `.pulse-scale {
  animation: pulseScale 2s ease-in-out infinite;
}

@keyframes pulseScale {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}`,
  tags: ['pulse', 'scale', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'scaleAmount', label: 'Scale Amount', description: 'Maximum scale', type: 'number', defaultValue: 1.05, min: 1, max: 1.5, step: 0.01 },
  ],
};

/**
 * Shake - Horizontal shaking
 */
export const shake: RoyCSSEffect = {
  id: 'shake',
  name: 'Shake',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Horizontal shake/vibration effect',
  css: `.shake {
  animation: shake 0.82s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}`,
  tags: ['shake', 'vibrate', 'error', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'intensity', label: 'Intensity', description: 'Shake distance in pixels', type: 'length', defaultValue: 8, min: 2, max: 20, unit: 'px' },
  ],
};

/**
 * Shake Vertical
 */
export const shakeVertical: RoyCSSEffect = {
  id: 'shake-vertical',
  name: 'Shake Vertical',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Vertical shake/vibration effect',
  css: `.shake-vertical {
  animation: shakeVertical 0.82s ease-in-out;
}

@keyframes shakeVertical {
  0%, 100% { transform: translateY(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateY(-8px); }
  20%, 40%, 60%, 80% { transform: translateY(8px); }
}`,
  tags: ['shake', 'vertical', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Shake Rotate - Combined shake and rotation
 */
export const shakeRotate: RoyCSSEffect = {
  id: 'shake-rotate',
  name: 'Shake Rotate',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Shake effect combined with slight rotation',
  css: `.shake-rotate {
  animation: shakeRotate 0.82s ease-in-out;
}

@keyframes shakeRotate {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  50% { transform: rotate(-5deg); }
  75% { transform: rotate(3deg); }
}`,
  tags: ['shake', 'rotate', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Swing - Pendulum swing effect
 */
export const swing: RoyCSSEffect = {
  id: 'swing',
  name: 'Swing',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Element swings like a pendulum',
  css: `.swing {
  animation: swing 1s ease-in-out;
  transform-origin: top center;
}

@keyframes swing {
  20% { transform: rotate(15deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(5deg); }
  80% { transform: rotate(-5deg); }
  100% { transform: rotate(0deg); }
}`,
  tags: ['swing', 'pendulum', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'maxAngle', label: 'Max Angle', description: 'Maximum swing angle', type: 'angle', defaultValue: '15deg' },
  ],
};

/**
 * Tada - Playful bouncing effect
 */
export const tada: RoyCSSEffect = {
  id: 'tada',
  name: 'Tada',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Playful scaling and rotation effect',
  css: `.tada {
  animation: tada 1s ease-in-out;
}

@keyframes tada {
  0% { transform: scale(1) rotate(0deg); }
  10%, 20% { transform: scale(0.9) rotate(-3deg); }
  30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
  40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
  100% { transform: scale(1) rotate(0deg); }
}`,
  tags: ['tada', 'playful', 'fun', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Wobble - Wobbly side-to-side effect
 */
export const wobble: RoyCSSEffect = {
  id: 'wobble',
  name: 'Wobble',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Wobbly, unstable-looking movement',
  css: `.wobble {
  animation: wobble 1s ease-in-out;
}

@keyframes wobble {
  0% { transform: translateX(0%); }
  15% { transform: translateX(-25%) rotate(-5deg); }
  30% { transform: translateX(20%) rotate(3deg); }
  45% { transform: translateX(-15%) rotate(-3deg); }
  60% { transform: translateX(10%) rotate(2deg); }
  75% { transform: translateX(-5%) rotate(-1deg); }
  100% { transform: translateX(0%); }
}`,
  tags: ['wobble', 'unstable', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Jello - Jelly-like deformation
 */
export const jello: RoyCSSEffect = {
  id: 'jello',
  name: 'Jello',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Jelly-like skewing deformation effect',
  css: `.jello {
  animation: jello 0.9s ease-in-out;
  transform-origin: center;
}

@keyframes jello {
  0%, 100% { transform: skewX(0deg) skewY(0deg); }
  11.1% { transform: skewX(-12.5deg) skewY(-12.5deg); }
  22.2% { transform: skewX(6.25deg) skewY(6.25deg); }
  33.3% { transform: skewX(-3.125deg) skewY(-3.125deg); }
  44.4% { transform: skewX(1.5625deg) skewY(1.5625deg); }
  55.5% { transform: skewX(-0.78125deg) skewY(-0.78125deg); }
  66.6% { transform: skewX(0.390625deg) skewY(0.390625deg); }
  77.7% { transform: skewX(-0.1953125deg) skewY(-0.1953125deg); }
}`,
  tags: ['jello', 'jelly', 'skew', 'fun'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Heartbeat - Heart beating rhythm
 */
export const heartbeat: RoyCSSEffect = {
  id: 'heartbeat',
  name: 'Heartbeat',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Rhythmic heartbeat pulse pattern',
  css: `.heartbeat {
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.15); }
  28% { transform: scale(1); }
  42% { transform: scale(1.15); }
  70% { transform: scale(1); }
}`,
  tags: ['heart', 'beat', 'rhythm', 'love'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'scale', label: 'Scale', description: 'Beat scale amount', type: 'number', defaultValue: 1.15, min: 1, max: 1.5, step: 0.01 },
  ],
};

/**
 * Flash - Flashing/blinking effect
 */
export const flash: RoyCSSEffect = {
  id: 'flash',
  name: 'Flash',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Quick flashing/blinking effect',
  css: `.flash {
  animation: flash 1.5s ease-in-out infinite;
}

@keyframes flash {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0; }
}`,
  tags: ['flash', 'blink', 'warning', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Rubber Band - Elastic snap-back effect
 */
export const rubberBand: RoyCSSEffect = {
  id: 'rubber-band',
  name: 'Rubber Band',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Elastic stretch and snap-back effect',
  css: `.rubber-band {
  animation: rubberBand 1s ease-in-out;
}

@keyframes rubberBand {
  0% { transform: scale(1); }
  30% { transform: scaleX(1.25) scaleY(0.75); }
  40% { transform: scaleX(0.75) scaleY(1.25); }
  50% { transform: scaleX(1.15) scaleY(0.85); }
  65% { transform: scaleX(0.95) scaleY(1.05); }
  75% { transform: scaleX(1.05) scaleY(0.95); }
  100% { transform: scale(1); }
}`,
  tags: ['rubber', 'elastic', 'stretch', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Bounce - Single bounce effect
 */
export const bounce: RoyCSSEffect = {
  id: 'bounce',
  name: 'Bounce',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Single bouncy drop effect',
  css: `.bounce {
  animation: bounce 1s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    transform: translateY(0);
  }
  40%, 43% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translateY(-30px);
  }
  70% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translateY(-15px);
  }
  90% {
    transform: translateY(-4px);
  }
}`,
  tailwind: 'animate-bounce',
  tags: ['bounce', 'drop', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'height', label: 'Bounce Height', description: 'Max bounce height', type: 'length', defaultValue: 30, unit: 'px' },
  ],
};

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

/**
 * Spinner - Classic rotating spinner
 */
export const spinner: RoyCSSEffect = {
  id: 'spinner',
  name: 'Spinner',
  category: 'animation',
  subCategory: 'loading',
  description: 'Classic circular loading spinner',
  css: `.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}`,
  tailwind: 'animate-spin rounded-full border-4 border-transparent border-t-current',
  tags: ['spinner', 'loading', 'rotation', 'circular'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'size', label: 'Size', description: 'Spinner diameter', type: 'length', defaultValue: 40, unit: 'px' },
    { name: 'borderWidth', label: 'Border Width', description: 'Border thickness', type: 'length', defaultValue: 4, unit: 'px' },
    { name: 'speed', label: 'Speed', description: 'Rotation speed', type: 'time', defaultValue: '1s' },
  ],
};

/**
 * Dots Loading - Three bouncing dots
 */
export const dotsLoading: RoyCSSEffect = {
  id: 'dots-loading',
  name: 'Dots Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Three dots that bounce sequentially',
  css: `.dots-loading {
  display: flex;
  gap: 8px;
}

.dots-loading span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  animation: dotBounce 1.4s ease-in-out infinite both;
}

.dots-loading span:nth-child(1) { animation-delay: -0.32s; }
.dots-loading span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dotBounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}`,
  tags: ['dots', 'loading', 'sequential', 'minimal'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Bars Loading - Animated progress bars
 */
export const barsLoading: RoyCSSEffect = {
  id: 'bars-loading',
  name: 'Bars Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Multiple bars animating at different speeds',
  css: `.bars-loading {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 40px;
}

.bars-loading span {
  width: 6px;
  height: 100%;
  background: currentColor;
  animation: barLoad 1.2s ease-in-out infinite;
}

.bars-loading span:nth-child(1) { animation-delay: 0s; }
.bars-loading span:nth-child(2) { animation-delay: 0.1s; }
.bars-loading span:nth-child(3) { animation-delay: 0.2s; }
.bars-loading span:nth-child(4) { animation-delay: 0.3s; }
.bars-loading span:nth-child(5) { animation-delay: 0.4s; }

@keyframes barLoad {
  0%, 40%, 100% { transform: scaleY(0.4); }
  20% { transform: scaleY(1); }
}`,
  tags: ['bars', 'loading', 'equalizer', 'audio'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Ring Loading - Concentric rings
 */
export const ringLoading: RoyCSSEffect = {
  id: 'ring-loading',
  name: 'Ring Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Concentric circles that pulse outward',
  css: `.ring-loading {
  display: inline-block;
  position: relative;
  width: 64px;
  height: 64px;
}

.ring-loading div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 51px;
  height: 51px;
  margin: 6px;
  border: 6px solid currentColor;
  border-radius: 50%;
  animation: ringPulse 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: currentColor transparent transparent transparent;
}

.ring-loading div:nth-child(1) { animation-delay: -0.45s; }
.ring-loading div:nth-child(2) { animation-delay: -0.3s; }
.ring-loading div:nth-child(3) { animation-delay: -0.15s; }

@keyframes ringPulse {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
  tags: ['ring', 'circular', 'loading', 'pulsing'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Ripple Loading - Expanding ripples
 */
export const rippleLoading: RoyCSSEffect = {
  id: 'ripple-loading',
  name: 'Ripple Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Expanding ripple circles from center',
  css: `.ripple-loading {
  display: inline-block;
  position: relative;
  width: 64px;
  height: 64px;
}

.ripple-loading div {
  position: absolute;
  border: 4px solid currentColor;
  opacity: 1;
  border-radius: 50%;
  animation: rippleEffect 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
}

.ripple-loading div:nth-child(2) { animation-delay: -0.5s; }

@keyframes rippleEffect {
  0% {
    top: 28px;
    left: 28px;
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    top: -1px;
    left: -1px;
    width: 58px;
    height: 58px;
    opacity: 0;
  }
}`,
  tags: ['ripple', 'expanding', 'water', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Wave Loading - Undulating wave motion
 */
export const waveLoading: RoyCSSEffect = {
  id: 'wave-loading',
  name: 'Wave Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Wave-like undulating dots',
  css: `.wave-loading {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.wave-loading span {
  width: 8px;
  height: 24px;
  border-radius: 4px;
  background: currentColor;
  animation: waveMotion 1.2s ease-in-out infinite;
}

.wave-loading span:nth-child(1) { animation-delay: 0s; }
.wave-loading span:nth-child(2) { animation-delay: 0.1s; }
.wave-loading span:nth-child(3) { animation-delay: 0.2s; }
.wave-loading span:nth-child(4) { animation-delay: 0.3s; }
.wave-loading span:nth-child(5) { animation-delay: 0.4s; }

@keyframes waveMotion {
  0%, 40%, 100% { transform: scaleY(0.4); }
  20% { transform: scaleY(1); }
}`,
  tags: ['wave', 'undulating', 'ocean', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Cube Grid - 3x3 grid of cubes
 */
export const cubeGridLoading: RoyCSSEffect = {
  id: 'cube-grid-loading',
  name: 'Cube Grid Loading',
  category: 'animation',
  subCategory: 'loading',
  description: '3x3 grid of cubes that fade in sequence',
  css: `.cube-grid-loading {
  display: grid;
  grid-template-columns: repeat(3, 16px);
  grid-template-rows: repeat(3, 16px);
  gap: 4px;
}

.cube-grid-loading span {
  background: currentColor;
  border-radius: 2px;
  animation: cubeGridFade 1.2s ease-in-out infinite both;
}

.cube-grid-loading span:nth-child(1) { animation-delay: 0s; }
.cube-grid-loading span:nth-child(2) { animation-delay: 0.1s; }
.cube-grid-loading span:nth-child(3) { animation-delay: 0.2s; }
.cube-grid-loading span:nth-child(4) { animation-delay: 0.1s; }
.cube-grid-loading span:nth-child(5) { animation-delay: 0.2s; }
.cube-grid-loading span:nth-child(6) { animation-delay: 0.3s; }
.cube-grid-loading span:nth-child(7) { animation-delay: 0.2s; }
.cube-grid-loading span:nth-child(8) { animation-delay: 0.3s; }
.cube-grid-loading span:nth-child(9) { animation-delay: 0.4s; }

@keyframes cubeGridFade {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}`,
  tags: ['cube', 'grid', 'matrix', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Folding Cube - Rotating cube faces
 */
export const foldingCubeLoading: RoyCSSEffect = {
  id: 'folding-cube-loading',
  name: 'Folding Cube Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Cube that folds/unfolds as it rotates',
  css: `.folding-cube-loading {
  width: 40px;
  height: 40px;
  position: relative;
  transform: rotateZ(45deg);
}

.folding-cube-loading span {
  position: absolute;
  width: 20px;
  height: 20px;
  background: currentColor;
  animation: foldingCube 2.4s ease-in-out infinite both;
}

.folding-cube-loading span:nth-child(1) { 
  top: 0; left: 0; animation-delay: 0s; 
}
.folding-cube-loading span:nth-child(2) { 
  top: 0; right: 0; animation-delay: 0.3s; 
}
.folding-cube-loading span:nth-child(3) { 
  bottom: 0; right: 0; animation-delay: 0.6s; 
}
.folding-cube-loading span:nth-child(4) { 
  bottom: 0; left: 0; animation-delay: 0.9s; 
}

@keyframes foldingCube {
  0%, 10% { transform: perspective(140px) rotateX(-180deg); opacity: 0; }
  25%, 75% { transform: perspective(140px) rotateX(0deg); opacity: 1; }
  90%, 100% { transform: perspective(140px) rotateY(180deg); opacity: 0; }
}`,
  tags: ['cube', '3d', 'fold', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Chasing Dots - Two chasing circles
 */
export const chasingDotsLoading: RoyCSSEffect = {
  id: 'chasing-dots-loading',
  name: 'Chasing Dots Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Two dots chasing each other in a circle',
  css: `.chasing-dots-loading {
  width: 48px;
  height: 48px;
  position: relative;
  animation: chaseRotate 2s linear infinite;
}

.chasing-dots-loading span,
.chasing-dots-loading span::after {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: currentColor;
  display: block;
}

.chasing-dots-loading span::after {
  content: '';
  position: absolute;
  top: 0;
  left: 24px;
  animation: chaseBounce 2s ease-in-out infinite;
}

@keyframes chaseRotate {
  100% { transform: rotate(360deg); }
}

@keyframes chaseBounce {
  0%, 100% { transform: scale(0); }
  50% { transform: scale(1); }
}`,
  tags: ['dots', 'chase', 'circular', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Double Bounce - Two overlapping bouncing balls
 */
export const doubleBounceLoading: RoyCSSEffect = {
  id: 'double-bounce-loading',
  name: 'Double Bounce Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Two balls bouncing alternately',
  css: `.double-bounce-loading {
  width: 54px;
  height: 54px;
  position: relative;
}

.double-bounce-loading span {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  position: absolute;
  top: 0;
  left: 0;
  animation: doubleBounce 2s ease-in-out infinite;
}

.double-bounce-loading span:last-child {
  animation-delay: -1s;
}

@keyframes doubleBounce {
  0%, 100% { transform: scale(0); }
  50% { transform: scale(1); }
}`,
  tags: ['bounce', 'double', 'ball', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Pulse Ring - Pulsing ring loader
 */
export const pulseRingLoading: RoyCSSEffect = {
  id: 'pulse-ring-loading',
  name: 'Pulse Ring Loading',
  category: 'animation',
  subCategory: 'loading',
  description: 'Ring that pulses outward repeatedly',
  css: `.pulse-ring-loading {
  width: 45px;
  height: 45px;
  display: inline-block;
  padding: 0px;
  border-radius: 100%;
  border: 5px solid;
  border-color: rgba(0, 0, 0, 0.25) currentColor currentColor currentColor;
  animation: pulseRing 1s linear infinite;
}

.pulse-ring-loading::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 100%;
  background: currentColor;
}

@keyframes pulseRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
  tags: ['ring', 'pulse', 'circular', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// LOOPING ANIMATIONS
// ============================================================================

/**
 * Spin - Continuous rotation
 */
export const spin: RoyCSSEffect = {
  id: 'spin',
  name: 'Spin',
  category: 'animation',
  subCategory: 'looping',
  description: 'Continuous smooth rotation',
  css: `.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
  tailwind: 'animate-spin',
  tags: ['spin', 'rotation', 'looping', 'continuous'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'direction', label: 'Direction', description: 'Rotation direction', type: 'enum', defaultValue: 'normal', options: ['normal', 'reverse'] },
    { name: 'duration', label: 'Duration', description: 'Full rotation time', type: 'time', defaultValue: '1s' },
  ],
};

/**
 * Ping - Radar ping effect
 */
export const ping: RoyCSSEffect = {
  id: 'ping',
  name: 'Ping',
  category: 'animation',
  subCategory: 'looping',
  description: 'Expanding radar ping/sonar effect',
  css: `.ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}`,
  tailwind: 'animate-ping',
  tags: ['ping', 'radar', 'sonar', 'expanding', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'scale', label: 'Scale', description: 'Final scale value', type: 'number', defaultValue: 2, min: 1.5, max: 4, step: 0.1 },
  ],
};

/**
 * Float - Gentle floating motion
 */
export const float: RoyCSSEffect = {
  id: 'float',
  name: 'Float',
  category: 'animation',
  subCategory: 'looping',
  description: 'Gentle up-and-down floating animation',
  css: `.float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}`,
  tags: ['float', 'gentle', 'hover', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Float distance', type: 'length', defaultValue: 10, unit: 'px' },
    { name: 'duration', label: 'Duration', description: 'Float cycle time', type: 'time', defaultValue: '3s' },
  ],
};

/**
 * Breathing - Slow scale breathing
 */
export const breathing: RoyCSSEffect = {
  id: 'breathing',
  name: 'Breathing',
  category: 'animation',
  subCategory: 'looping',
  description: 'Slow breathing/pulsing scale effect',
  css: `.breathing {
  animation: breathing 4s ease-in-out infinite;
}

@keyframes breathing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}`,
  tags: ['breathing', 'slow', 'meditation', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'intensity', label: 'Intensity', description: 'Breath intensity', type: 'number', defaultValue: 1.06, min: 1, max: 1.2, step: 0.01 },
  ],
};

/**
 * Rotate Continuous - Smooth continuous rotation
 */
export const rotateContinuous: RoyCSSEffect = {
  id: 'rotate-continuous',
  name: 'Rotate Continuous',
  category: 'animation',
  subCategory: 'looping',
  description: 'Smooth continuous 360-degree rotation',
  css: `.rotate-continuous {
  animation: rotateContinuous 2s linear infinite;
}

@keyframes rotateContinuous {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
  tags: ['rotate', 'continuous', 'looping', 'smooth'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Oscillate - Side to side oscillation
 */
export const oscillate: RoyCSSEffect = {
  id: 'oscillate',
  name: 'Oscillate',
  category: 'animation',
  subCategory: 'looping',
  description: 'Smooth side-to-side oscillation',
  css: `.oscillate {
  animation: oscillate 2s ease-in-out infinite;
}

@keyframes oscillate {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(15px); }
}`,
  tags: ['oscillate', 'pendulum', 'side-to-side', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amplitude', label: 'Amplitude', description: 'Oscillation distance', type: 'length', defaultValue: 15, unit: 'px' },
  ],
};

/**
 * Glow Pulse - Pulsing glow/shadow effect
 */
export const glowPulse: RoyCSSEffect = {
  id: 'glow-pulse',
  name: 'Glow Pulse',
  category: 'animation',
  subCategory: 'looping',
  description: 'Pulsing glow or shadow effect',
  css: `.glow-pulse {
  animation: glowPulse 2s ease-in-out infinite alternate;
}

@keyframes glowPulse {
  from {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5),
                0 0 10px rgba(255, 255, 255, 0.3);
  }
  to {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                0 0 30px rgba(255, 255, 255, 0.5),
                0 0 40px rgba(255, 255, 255, 0.3);
  }
}`,
  tags: ['glow', 'shadow', 'neon', 'pulse', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Gradient Shift - Animated gradient colors
 */
export const gradientShift: RoyCSSEffect = {
  id: 'gradient-shift',
  name: 'Gradient Shift',
  category: 'animation',
  subCategory: 'looping',
  description: 'Animated gradient color cycling',
  css: `.gradient-shift {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`,
  tags: ['gradient', 'color', 'shift', 'rainbow', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Morph Blob - Organic shape morphing
 */
export const morphBlob: RoyCSSEffect = {
  id: 'morph-blob',
  name: 'Morph Blob',
  category: 'animation',
  subCategory: 'looping',
  description: 'Organic blob shape that continuously morphs',
  css: `.morph-blob {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  animation: morphBlob 8s ease-in-out infinite;
}

@keyframes morphBlob {
  0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  50% { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
  75% { border-radius: 60% 30% 60% 40% / 70% 40% 30% 60%; }
}`,
  tags: ['blob', 'organic', 'morph', 'shape', 'looping'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Typewriter - Text reveal animation
 */
export const typewriter: RoyCSSEffect = {
  id: 'typewriter',
  name: 'Typewriter',
  category: 'animation',
  subCategory: 'looping',
  description: 'Text appears character by character',
  css: `.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 3px solid currentColor;
  animation: typewriter 3.5s steps(40, end), blinkCaret 0.75s step-end infinite;
}

@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blinkCaret {
  from, to { border-color: transparent; }
  50% { border-color: currentColor; }
}`,
  tags: ['typewriter', 'text', 'cursor', 'reveal'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'steps', label: 'Steps', description: 'Number of steps', type: 'number', defaultValue: 40, min: 10, max: 100 },
  ],
};

/**
 * Border Dash - Animated dashed border
 */
export const borderDash: RoyCSSEffect = {
  id: 'border-dash',
  name: 'Border Dash',
  category: 'animation',
  subCategory: 'looping',
  description: 'Animated moving dashed border',
  css: `.border-dash {
  border: 2px dashed transparent;
  background: linear-gradient(#fff, #fff) padding-box,
              repeating-linear-gradient(-45deg, #000 0, #000 10px, transparent 10px, transparent 20px) border-box;
  animation: borderDash 1s linear infinite;
  background-size: 100% 100%, 28px 28px;
}

@keyframes borderDash {
  to { background-position: 0 0, 28px 0; }
}`,
  tags: ['border', 'dash', 'animated', 'outline'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Skeleton Shimmer - Content placeholder shimmer
 */
export const skeletonShimmer: RoyCSSEffect = {
  id: 'skeleton-shimmer',
  name: 'Skeleton Shimmer',
  category: 'animation',
  subCategory: 'loading',
  description: 'Shimmer effect for content placeholders',
  css: `.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes skeletonShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
  tags: ['skeleton', 'shimmer', 'placeholder', 'loading'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// Additional Entrance Effects
// ============================================================================

/**
 * Scale In Center
 */
export const scaleInCenter: RoyCSSEffect = {
  id: 'scale-in-center',
  name: 'Scale In Center',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Scales in from center with spring effect',
  css: `.scale-in-center {
  animation: scaleInCenter 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes scaleInCenter {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}`,
  tags: ['scale', 'center', 'spring', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Scale In Top Left
 */
export const scaleInTopLeft: RoyCSSEffect = {
  id: 'scale-in-top-left',
  name: 'Scale In Top Left',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Scales in from top-left corner',
  css: `.scale-in-top-left {
  animation: scaleInTopLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  transform-origin: top left;
}

@keyframes scaleInTopLeft {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}`,
  tags: ['scale', 'corner', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Scale In Bottom Right
 */
export const scaleInBottomRight: RoyCSSEffect = {
  id: 'scale-in-bottom-right',
  name: 'Scale In Bottom Right',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Scales in from bottom-right corner',
  css: `.scale-in-bottom-right {
  animation: scaleInBottomRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  transform-origin: bottom right;
}

@keyframes scaleInBottomRight {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}`,
  tags: ['scale', 'corner', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Swirl In - Spiral entrance
 */
export const swirlIn: RoyCSSEffect = {
  id: 'swirl-in',
  name: 'Swirl In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element swirls/spirals into view',
  css: `.swirl-in {
  animation: swirlIn 1s ease-out forwards;
}

@keyframes swirlIn {
  0% {
    opacity: 0;
    transform: rotate(-540deg) scale(0);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}`,
  tags: ['swirl', 'spiral', 'rotate', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Drop In - Falls from above with gravity feel
 */
export const dropIn: RoyCSSEffect = {
  id: 'drop-in',
  name: 'Drop In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Element drops in from above with gravity effect',
  css: `.drop-in {
  animation: dropIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes dropIn {
  0% {
    opacity: 0;
    transform: translateY(-100vh) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateY(10px) scale(1.02);
  }
  80% {
    transform: translateY(-5px) scale(0.99);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}`,
  tags: ['drop', 'gravity', 'fall', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Pop In - Quick pop with overshoot
 */
export const popIn: RoyCSSEffect = {
  id: 'pop-in',
  name: 'Pop In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Quick popping entrance with overshoot',
  css: `.pop-in {
  animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  80% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}`,
  tags: ['pop', 'quick', 'overshoot', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Unfold In - Horizontal unfold
 */
export const unfoldIn: RoyCSSEffect = {
  id: 'unfold-in',
  name: 'Unfold In',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Unfolds horizontally from center',
  css: `.unfold-in {
  animation: unfoldIn 0.6s ease-out forwards;
  transform-origin: center;
}

@keyframes unfoldIn {
  0% {
    opacity: 0;
    transform: scaleX(0);
  }
  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}`,
  tags: ['unfold', 'horizontal', 'reveal', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Curtain Open - Opens like theater curtains
 */
export const curtainOpen: RoyCSSEffect = {
  id: 'curtain-open',
  name: 'Curtain Open',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Reveals content like opening curtains',
  css: `.curtain-open {
  overflow: hidden;
  animation: curtainOpen 0.8s ease-out forwards;
}

@keyframes curtainOpen {
  0% {
    clip-path: inset(0 50% 0 50%);
  }
  100% {
    clip-path: inset(0 0% 0 0%);
  }
}`,
  tags: ['curtain', 'theater', 'clip-path', 'reveal', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Reveal From Center - Radial reveal
 */
export const revealFromCenter: RoyCSSEffect = {
  id: 'reveal-from-center',
  name: 'Reveal From Center',
  category: 'animation',
  subCategory: 'entrance',
  description: 'Reveals element from center outward',
  css: `.reveal-from-center {
  clip-path: circle(0% at 50% 50%);
  animation: revealFromCenter 0.8s ease-out forwards;
}

@keyframes revealFromCenter {
  100% {
    clip-path: circle(150% at 50% 50%);
  }
}`,
  tags: ['reveal', 'radial', 'center', 'clip-path', 'entrance'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// More Attention Seekers
// ============================================================================

/**
 * Neon Flicker - Flickering neon light effect
 */
export const neonFlicker: RoyCSSEffect = {
  id: 'neon-flicker',
  name: 'Neon Flicker',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Flickering neon sign effect',
  css: `.neon-flicker {
  animation: neonFlicker 1.5s infinite alternate;
}

@keyframes neonFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    text-shadow: 
      0 0 4px #fff,
      0 0 11px #fff,
      0 0 19px #fff,
      0 0 40px #0fa,
      0 0 80px #0fa,
      0 0 90px #0fa,
      0 0 100px #0fa,
      0 0 150px #0fa;
  }
  20%, 24%, 55% {
    text-shadow: none;
  }
}`,
  tags: ['neon', 'flicker', 'sign', 'glow', 'retro'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Glitch Effect - Digital glitch distortion
 */
export const glitchEffect: RoyCSSEffect = {
  id: 'glitch-effect',
  name: 'Glitch Effect',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Digital glitch/distortion effect',
  css: `.glitch-effect {
  animation: glitchEffect 1s linear infinite;
}

@keyframes glitchEffect {
  2%, 64% {
    transform: translate(2px, 0) skew(0deg);
  }
  4%, 60% {
    transform: translate(-2px, 0) skew(0deg);
  }
  62% {
    transform: translate(0, 0) skew(5deg);
  }
  
  .glitch-effect:before,
  .glitch-effect:after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .glitch-effect:before {
    left: 2px;
    text-shadow: -2px 0 #ff00c1;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitchEffect-1 5s infinite linear alternate-reverse;
  }
  
  .glitch-effect:after {
    left: -2px;
    text-shadow: -2px 0 #00fff9;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitchEffect-2 5s infinite linear alternate-reverse;
  }
}`,
  tags: ['glitch', 'digital', 'distortion', 'cyberpunk'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Vibrate - Intense vibration
 */
export const vibrate: RoyCSSEffect = {
  id: 'vibrate',
  name: 'Vibrate',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Intense rapid vibration effect',
  css: `.vibrate {
  animation: vibrate 0.3s linear infinite;
}

@keyframes vibrate {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}`,
  tags: ['vibrate', 'intense', 'alert', 'urgent'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Squeeze - Compress and release
 */
export const squeeze: RoyCSSEffect = {
  id: 'squeeze',
  name: 'Squeeze',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Squeezes element inward then releases',
  css: `.squeeze {
  animation: squeeze 0.8s ease-in-out;
}

@keyframes squeeze {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.9, 1.1); }
}`,
  tags: ['squeeze', 'compress', 'squash', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Twister - Multi-axis rotation
 */
export const twister: RoyCSSEffect = {
  id: 'twister',
  name: 'Twister',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Complex multi-axis twisting animation',
  css: `.twister {
  animation: twister 1s ease-in-out;
}

@keyframes twister {
  0% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(180deg) scale(0.8); }
  40% { transform: rotate(360deg) scale(1.1); }
  60% { transform: rotate(540deg) scale(0.9); }
  80% { transform: rotate(720deg) scale(1.05); }
  100% { transform: rotate(720deg) scale(1); }
}`,
  tags: ['twist', 'complex', 'multi-axis', 'attention'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Magic - Magical sparkle effect
 */
export const magic: RoyCSSEffect = {
  id: 'magic',
  name: 'Magic',
  category: 'animation',
  subCategory: 'attention-seeker',
  description: 'Magical appearing/disappearing effect',
  css: `.magic {
  animation: magic 1s ease-in-out;
}

@keyframes magic {
  0% { 
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter: hue-rotate(0deg);
  }
  50% { 
    opacity: 0.8;
    transform: scale(1.2) rotate(10deg);
    filter: hue-rotate(180deg);
  }
  100% { 
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter: hue-rotate(360deg);
  }
}`,
  tags: ['magic', 'sparkle', 'hue-rotate', 'fantasy'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Hinge - Door hinge falling effect
 */
export const hinge: RoyCSSEffect = {
  id: 'hinge',
  name: 'Hinge',
  category: 'animation',
  subCategory: 'exit',
  description: 'Swings like a door hinge then falls',
  css: `.hinge {
  animation: hinge 2s ease-in-out forwards;
  transform-origin: top left;
}

@keyframes hinge {
  0% { transform: rotate(0deg); }
  20% { transform: rotate(80deg); }
  40% { transform: rotate(60deg); }
  60% { transform: rotate(80deg); }
  80% { transform: rotate(60deg) translateY(0); }
  100% { transform: rotate(60deg) translateY(300px); opacity: 0; }
}`,
  tags: ['hinge', 'door', 'fall', 'dramatic', 'exit'],
  browserSupport: ANIMATION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Animation Effects
// ============================================================================

/**
 * Complete array of all animation effects
 */
export const animationEffects: RoyCSSEffect[] = [
  // Entrances
  fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight,
  slideInUp, slideInDown, slideInLeft, slideInRight,
  zoomIn, bounceIn, bounceInUp, bounceInDown, bounceInLeft, bounceInRight,
  flipInX, flipInY, rotateIn, rotateInDownLeft,
  lightSpeedIn, rollIn, expandIn,
  backInDown, backInLeft, backInRight,
  scaleInCenter, scaleInTopLeft, scaleInBottomRight,
  swirlIn, dropIn, popIn, unfoldIn, curtainOpen, revealFromCenter,

  // Exits
  fadeOut, fadeOutUp, fadeOutDown, fadeOutLeft, fadeOutRight,
  zoomOut, slideOutUp, slideOutDown, slideOutLeft, slideOutRight,
  flipOutX, flipOutY, rotateOut, lightSpeedOut, rollOut, hinge,

  // Attention Seekers
  pulse, pulseScale, shake, shakeVertical, shakeRotate,
  swing, tada, wobble, jello, heartbeat, flash, rubberBand, bounce,
  neonFlicker, glitchEffect, vibrate, squeeze, twister, magic,

  // Loading
  spinner, dotsLoading, barsLoading, ringLoading, rippleLoading,
  waveLoading, cubeGridLoading, foldingCubeLoading,
  chasingDotsLoading, doubleBounceLoading, pulseRingLoading, skeletonShimmer,

  // Looping
  spin, ping, float, breathing, rotateContinuous, oscillate,
  glowPulse, gradientShift, morphBlob, typewriter, borderDash,
];

export default animationEffects;
