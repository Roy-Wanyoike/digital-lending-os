/**
 * ROYCSS Transition Effects Catalog
 * 
 * Comprehensive collection of 80+ CSS transition effects
 * including smooth transitions, timing functions, and state changes.
 * 
 * @module roycss/effects/catalog/transitions
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Transitions
// ============================================================================

const TRANSITION_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'CSS transitions supported in all modern browsers',
};

// ============================================================================
// EASING / TIMING FUNCTION TRANSITIONS
// ============================================================================

/**
 * Ease In - Starts slow, accelerates
 */
export const easeIn: RoyCSSEffect = {
  id: 'ease-in',
  name: 'Ease In',
  category: 'transition',
  subCategory: 'timing',
  description: 'Transition that starts slow and accelerates toward the end',
  css: `.ease-in {
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}`,
  tailwind: 'ease-in',
  tags: ['easing', 'acceleration', 'timing', 'basic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Ease Out - Starts fast, decelerates
 */
export const easeOut: RoyCSSEffect = {
  id: 'ease-out',
  name: 'Ease Out',
  category: 'transition',
  subCategory: 'timing',
  description: 'Transition that starts fast and decelerates toward the end',
  css: `.ease-out {
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}`,
  tailwind: 'ease-out',
  tags: ['easing', 'deceleration', 'timing', 'basic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Ease In Out - Smooth start and end
 */
export const easeInOut: RoyCSSEffect = {
  id: 'ease-in-out',
  name: 'Ease In Out',
  category: 'transition',
  subCategory: 'timing',
  description: 'Smooth transition that eases in and out',
  css: `.ease-in-out {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}`,
  tailwind: 'ease-in-out',
  tags: ['easing', 'smooth', 'timing', 'basic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Linear - Constant speed transition
 */
export const linear: RoyCSSEffect = {
  id: 'linear-transition',
  name: 'Linear Transition',
  category: 'transition',
  subCategory: 'timing',
  description: 'Constant speed transition throughout',
  css: `.linear-transition {
  transition-timing-function: linear;
}`,
  tailwind: 'linear',
  tags: ['easing', 'constant', 'timing', 'basic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Bounce - Bouncy easing function
 */
export const bounceEase: RoyCSSEffect = {
  id: 'bounce-ease',
  name: 'Bounce Ease',
  category: 'transition',
  subCategory: 'timing',
  description: 'Bouncy easing with overshoot at the end',
  css: `.bounce-ease {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}`,
  tags: ['easing', 'bounce', 'overshoot', 'playful'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'bounciness', label: 'Bounciness', description: 'Overshoot amount', type: 'number', defaultValue: 1.55, min: 1, max: 2 },
  ],
};

/**
 * Elastic - Springy elastic effect
 */
export const elasticEase: RoyCSSEffect = {
  id: 'elastic-ease',
  name: 'Elastic Ease',
  category: 'transition',
  subCategory: 'timing',
  description: 'Elastic spring-like easing effect',
  css: `.elastic-ease {
  transition-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6);
}`,
  tags: ['easing', 'elastic', 'spring', 'overshoot'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Back Ease - Pull back then go forward
 */
export const backEase: RoyCSSEffect = {
  id: 'back-ease',
  name: 'Back Ease',
  category: 'transition',
  subCategory: 'timing',
  description: 'Pulls back slightly before moving forward',
  css: `.back-ease {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}`,
  tags: ['easing', 'anticipation', 'pull-back'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Smooth Step - Very smooth gradual change
 */
export const smoothStep: RoyCSSEffect = {
  id: 'smooth-step',
  name: 'Smooth Step',
  category: 'transition',
  subCategory: 'timing',
  description: 'Extra smooth step-based easing',
  css: `.smooth-step {
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
}`,
  tags: ['easing', 'smooth', 'gradual'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Sharp - Quick sharp transition
 */
export const sharp: RoyCSSEffect = {
  id: 'sharp',
  name: 'Sharp',
  category: 'transition',
  subCategory: 'timing',
  description: 'Quick, snappy transition with minimal smoothing',
  css: `.sharp {
  transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
}`,
  tags: ['easing', 'sharp', 'snappy', 'quick'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Expo In - Exponential acceleration
 */
export const expoIn: RoyCSSEffect = {
  id: 'expo-in',
  name: 'Expo In',
  category: 'transition',
  subCategory: 'timing',
  description: 'Exponential curve starting very slow',
  css: `.expo-in {
  transition-timing-function: cubic-bezier(0.7, 0, 0.84, 0);
}`,
  tags: ['easing', 'exponential', 'dramatic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Expo Out - Exponential deceleration
 */
export const expoOut: RoyCSSEffect = {
  id: 'expo-out',
  name: 'Expo Out',
  category: 'transition',
  subCategory: 'timing',
  description: 'Exponential curve ending very smooth',
  css: `.expo-out {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}`,
  tags: ['easing', 'exponential', 'smooth-end'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Circ In - Circular acceleration
 */
export const circIn: RoyCSSEffect = {
  id: 'circ-in',
  name: 'Circ In',
  category: 'transition',
  subCategory: 'timing',
  description: 'Circular (quarter-circle) acceleration curve',
  css: `.circ-in {
  transition-timing-function: cubic-bezier(0.55, 0.085, 0.68, 0.53);
}`,
  tags: ['easing', 'circular', 'natural'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Circ Out - Circular deceleration
 */
export const circOut: RoyCSSEffect = {
  id: 'circ-out',
  name: 'Circ Out',
  category: 'transition',
  subCategory: 'timing',
  description: 'Circular (quarter-circle) deceleration curve',
  css: `.circ-out {
  transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}`,
  tags: ['easing', 'circular', 'natural-decelerate'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// SMOOTH PROPERTY TRANSITIONS
// ============================================================================

/**
 * Fade Transition - Opacity change
 */
export const fadeTransition: RoyCSSEffect = {
  id: 'fade-transition',
  name: 'Fade Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth opacity fade transition on hover/focus',
  css: `.fade-transition {
  transition: opacity 0.3s ease;
}

.fade-transition:hover {
  opacity: 0.7;
}`,
  tags: ['fade', 'opacity', 'hover', 'smooth'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'duration', label: 'Duration', description: 'Transition duration', type: 'time', defaultValue: '0.3s' },
    { name: 'targetOpacity', label: 'Target Opacity', description: 'Opacity on hover', type: 'number', defaultValue: 0.7, min: 0, max: 1, step: 0.1 },
  ],
};

/**
 * Scale Transition - Size change
 */
export const scaleTransition: RoyCSSEffect = {
  id: 'scale-transition',
  name: 'Scale Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth scale transformation on hover',
  css: `.scale-transition {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-transition:hover {
  transform: scale(1.05);
}`,
  tags: ['scale', 'size', 'hover', 'zoom'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'scaleAmount', label: 'Scale Amount', description: 'Hover scale value', type: 'number', defaultValue: 1.05, min: 1, max: 1.5, step: 0.01 },
  ],
};

/**
 * Rotate Transition - Rotation on hover
 */
export const rotateTransition: RoyCSSEffect = {
  id: 'rotate-transition',
  name: 'Rotate Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth rotation on hover',
  css: `.rotate-transition {
  transition: transform 0.5s ease;
}

.rotate-transition:hover {
  transform: rotate(5deg);
}`,
  tags: ['rotate', 'spin', 'hover', 'tilt'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'angle', label: 'Rotation Angle', description: 'Hover rotation angle', type: 'angle', defaultValue: '5deg' },
  ],
};

/**
 * Slide Up Transition
 */
export const slideUpTransition: RoyCSSEffect = {
  id: 'slide-up-transition',
  name: 'Slide Up Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Slides element up slightly on hover',
  css: `.slide-up-transition {
  transition: transform 0.3s ease-out;
}

.slide-up-transition:hover {
  transform: translateY(-5px);
}`,
  tags: ['slide', 'up', 'lift', 'hover'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'distance', label: 'Distance', description: 'Slide distance', type: 'length', defaultValue: 5, unit: 'px' },
  ],
};

/**
 * Slide Down Transition
 */
export const slideDownTransition: RoyCSSEffect = {
  id: 'slide-down-transition',
  name: 'Slide Down Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Slides element down slightly on hover',
  css: `.slide-down-transition {
  transition: transform 0.3s ease-out;
}

.slide-down-transition:hover {
  transform: translateY(5px);
}`,
  tags: ['slide', 'down', 'drop', 'hover'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Color Shift Transition
 */
export const colorShiftTransition: RoyCSSEffect = {
  id: 'color-shift-transition',
  name: 'Color Shift Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth color/background color transition',
  css: `.color-shift-transition {
  transition: background-color 0.3s ease, color 0.3s ease;
  background-color: #3b82f6;
  color: white;
}

.color-shift-transition:hover {
  background-color: #1d4ed8;
}`,
  tags: ['color', 'background', 'shift', 'hover'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Border Color Transition
 */
export const borderColorTransition: RoyCSSEffect = {
  id: 'border-color-transition',
  name: 'Border Color Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth border color change on interaction',
  css: `.border-color-transition {
  border: 2px solid #e5e7eb;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.border-color-transition:focus,
.border-color-transition:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}`,
  tags: ['border', 'color', 'focus', 'form'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Shadow Grow Transition
 */
export const shadowGrowTransition: RoyCSSEffect = {
  id: 'shadow-grow-transition',
  name: 'Shadow Grow Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Box shadow grows smoothly on hover',
  css: `.shadow-grow-transition {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.shadow-grow-transition:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}`,
  tags: ['shadow', 'grow', 'depth', 'elevation'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Border Radius Morph
 */
export const borderRadiusMorph: RoyCSSEffect = {
  id: 'border-radius-morph',
  name: 'Border Radius Morph',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Corner radius changes smoothly on hover',
  css: `.border-radius-morph {
  border-radius: 8px;
  transition: border-radius 0.4s ease;
}

.border-radius-morph:hover {
  border-radius: 24px;
}`,
  tags: ['border-radius', 'corners', 'morph', 'shape'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'fromRadius', label: 'Start Radius', description: 'Initial radius', type: 'length', defaultValue: 8, unit: 'px' },
    { name: 'toRadius', label: 'End Radius', description: 'Hover radius', type: 'length', defaultValue: 24, unit: 'px' },
  ],
};

/**
 * Width Expand Transition
 */
export const widthExpandTransition: RoyCSSEffect = {
  id: 'width-expand-transition',
  name: 'Width Expand Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element width expands on hover',
  css: `.width-expand-transition {
  width: 100px;
  transition: width 0.3s ease;
}

.width-expand-transition:hover {
  width: 150px;
}`,
  tags: ['width', 'expand', 'grow', 'size'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Height Expand Transition
 */
export const heightExpandTransition: RoyCSSEffect = {
  id: 'height-expand-transition',
  name: 'Height Expand Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element height expands on hover',
  css: `.height-expand-transition {
  height: 50px;
  transition: height 0.3s ease;
  overflow: hidden;
}

.height-expand-transition:hover {
  height: 100px;
}`,
  tags: ['height', 'expand', 'grow', 'accordion'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// COMPOUND / MULTI-PROPERTY TRANSITIONS
// ============================================================================

/**
 * Lift & Shadow - Combined lift and shadow increase
 */
export const liftAndShadow: RoyCSSEffect = {
  id: 'lift-and-shadow',
  name: 'Lift & Shadow',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element lifts up while shadow deepens',
  css: `.lift-and-shadow {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.lift-and-shadow:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}`,
  tags: ['lift', 'shadow', 'elevation', 'card', 'compound'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'liftHeight', label: 'Lift Height', description: 'Upward movement', type: 'length', defaultValue: 8, unit: 'px' },
  ],
};

/**
 * Scale & Glow - Scale up with glow effect
 */
export const scaleAndGlow: RoyCSSEffect = {
  id: 'scale-and-glow',
  name: 'Scale & Glow',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Scales up while adding a colored glow',
  css: `.scale-and-glow {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.scale-and-glow:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}`,
  tags: ['scale', 'glow', 'neon', 'highlight'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Rotate & Scale - Combined rotation and scaling
 */
export const rotateAndScale: RoyCSSEffect = {
  id: 'rotate-and-scale',
  name: 'Rotate & Scale',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Rotates and scales simultaneously on hover',
  css: `.rotate-and-scale {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rotate-and-scale:hover {
  transform: rotate(3deg) scale(1.03);
}`,
  tags: ['rotate', 'scale', 'combined', 'dynamic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Flip Card - 3D card flip transition
 */
export const flipCard: RoyCSSEffect = {
  id: 'flip-card',
  name: 'Flip Card',
  category: 'transition',
  subCategory: 'smooth',
  description: '3D card flip to reveal content on back',
  css: `.flip-card-container {
  perspective: 1000px;
}

.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card-container:hover .flip-card {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}`,
  tags: ['flip', 'card', '3d', 'reveal', 'interactive'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [
    { name: 'perspective', label: 'Perspective', description: '3D perspective depth', type: 'number', defaultValue: 1000, min: 500, max: 2000 },
  ],
};

/**
 * Accordion Expand - Vertical accordion
 */
export const accordionExpand: RoyCSSEffect = {
  id: 'accordion-expand',
  name: 'Accordion Expand',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Smooth vertical expand/collapse like an accordion',
  css: `.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out, padding 0.4s ease-out, opacity 0.3s ease-out;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.accordion-item.active .accordion-content {
  max-height: 500px; /* Adjust based on content */
  opacity: 1;
  padding-top: 16px;
  padding-bottom: 16px;
}`,
  tags: ['accordion', 'expand', 'collapse', 'menu', 'dropdown'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Collapse Width - Horizontal collapse
 */
export const collapseWidth: RoyCSSEffect = {
  id: 'collapse-width',
  name: 'Collapse Width',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Collapses horizontally with smooth animation',
  css: `.collapse-width {
  width: 200px;
  overflow: hidden;
  transition: width 0.3s ease, opacity 0.3s ease;
}

.collapsed .collapse-width {
  width: 60px;
  opacity: 0.8;
}`,
  tags: ['collapse', 'sidebar', 'shrink', 'horizontal'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// STATE TRANSITIONS (Hover, Focus, Active)
// ============================================================================

/**
 * Button Press - Interactive button feedback
 */
export const buttonPress: RoyCSSEffect = {
  id: 'button-press',
  name: 'Button Press',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Button scales down when pressed, returns on release',
  css: `.button-press {
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.button-press:active {
  transform: scale(0.97);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}`,
  tags: ['button', 'press', 'active', 'feedback', 'interactive'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'pressScale', label: 'Press Scale', description: 'Scale when pressed', type: 'number', defaultValue: 0.97, min: 0.9, max: 1, step: 0.01 },
  ],
};

/**
 * Input Focus Glow - Form input focus state
 */
export const inputFocusGlow: RoyCSSEffect = {
  id: 'input-focus-glow',
  name: 'Input Focus Glow',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Input field glows when focused',
  css: `.input-focus-glow {
  border: 2px solid #e5e7eb;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-focus-glow:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.1);
}`,
  tags: ['input', 'focus', 'glow', 'form', 'validation'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Link Underline Grow - Animated underline
 */
export const underlineGrow: RoyCSSEffect = {
  id: 'underline-grow',
  name: 'Underline Grow',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Underline grows from center on hover',
  css: `.underline-grow {
  position: relative;
  text-decoration: none;
}

.underline-grow::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s ease, left 0.3s ease;
}

.underline-grow:hover::after {
  width: 100%;
  left: 0;
}`,
  tags: ['link', 'underline', 'grow', 'nav', 'text'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Underline Slide Left
 */
export const underlineSlideLeft: RoyCSSEffect = {
  id: 'underline-slide-left',
  name: 'Underline Slide Left',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Underline slides in from left on hover',
  css: `.underline-slide-left {
  position: relative;
  text-decoration: none;
}

.underline-slide-left::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s ease;
}

.underline-slide-left:hover::after {
  width: 100%;
}`,
  tags: ['link', 'underline', 'slide', 'left', 'nav'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Background Fill - Background fills from left
 */
export const backgroundFill: RoyCSSEffect = {
  id: 'background-fill',
  name: 'Background Fill',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Background color fills from left to right',
  css: `.background-fill {
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: color 0.3s ease;
}

.background-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: #3b82f6;
  z-index: -1;
  transition: left 0.3s ease;
  color: white;
}

.background-fill:hover::before {
  left: 0;
}

.background-fill:hover {
  color: white;
}`,
  tags: ['background', 'fill', 'cta', 'button', 'reveal'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Icon Spin on Hover
 */
export const iconSpinHover: RoyCSSEffect = {
  id: 'icon-spin-hover',
  name: 'Icon Spin Hover',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Icon rotates/spins on hover',
  css: `.icon-spin-hover svg,
.icon-spin-hover i {
  transition: transform 0.4s ease;
}

.icon-spin-hover:hover svg,
.icon-spin-hover:hover i {
  transform: rotate(360deg);
}`,
  tags: ['icon', 'spin', 'rotate', 'hover', 'interactive'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Icon Bounce on Hover
 */
export const iconBounceHover: RoyCSSEffect = {
  id: 'icon-bounce-hover',
  name: 'Icon Bounce Hover',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Icon bounces on hover',
  css: `.icon-bounce-hover svg,
.icon-bounce-hover i {
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-bounce-hover:hover svg,
.icon-bounce-hover:hover i {
  transform: translateY(-4px);
}`,
  tags: ['icon', 'bounce', 'hover', 'playful'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Checkbox Custom - Styled checkbox transition
 */
export const checkboxCustom: RoyCSSEffect = {
  id: 'checkbox-custom',
  name: 'Checkbox Custom',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Custom checkbox with smooth check animation',
  css: `.checkbox-custom {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.checkbox-custom:checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkbox-custom:checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  animation: checkboxCheck 0.2s ease forwards;
}

@keyframes checkboxCheck {
  to { transform: rotate(45deg) scale(1); }
}`,
  tags: ['checkbox', 'custom', 'form', 'check', 'toggle'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Toggle Switch - On/off toggle
 */
export const toggleSwitch: RoyCSSEffect = {
  id: 'toggle-switch',
  name: 'Toggle Switch',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Smooth sliding toggle switch',
  css: `.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  appearance: none;
  background: #d1d5db;
  border-radius: 13px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch:checked {
  background: #3b82f6;
}

.toggle-switch:checked::before {
  transform: translateX(22px);
}`,
  tags: ['toggle', 'switch', 'on-off', 'slider', 'form'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Radio Pulse - Pulsing radio selection
 */
export const radioPulse: RoyCSSEffect = {
  id: 'radio-pulse',
  name: 'Radio Pulse',
  category: 'transition',
  subCategory: 'state-change',
  description: 'Radio button with pulsing inner dot',
  css: `.radio-pulse {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s ease;
}

.radio-pulse:checked {
  border-color: #3b82f6;
}

.radio-pulse::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s ease;
}

.radio-pulse:checked::after {
  transform: translate(-50%, -50%) scale(1);
}`,
  tags: ['radio', 'pulse', 'selection', 'form', 'circle'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

/**
 * Page Fade - Simple page crossfade
 */
export const pageFade: RoyCSSEffect = {
  id: 'page-fade',
  name: 'Page Fade',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'Page fades out and new page fades in',
  css: `.page-fade-enter {
  opacity: 0;
  animation: pageFadeIn 0.3s ease-out forwards;
}

.page-fade-exit {
  opacity: 1;
  animation: pageFadeOut 0.3s ease-in forwards;
}

@keyframes pageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pageFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  tags: ['page', 'fade', 'route', 'navigation', 'spa'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Page Slide Right - Pages slide horizontally
 */
export const pageSlideRight: RoyCSSEffect = {
  id: 'page-slide-right',
  name: 'Page Slide Right',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'New page slides in from right, old exits left',
  css: `.page-slide-right-enter {
  transform: translateX(100%);
  animation: pageSlideInRight 0.4s ease-out forwards;
}

.page-slide-right-exit {
  transform: translateX(0);
  animation: pageSlideOutLeft 0.4s ease-in forwards;
}

@keyframes pageSlideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes pageSlideOutLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-30%); }
}`,
  tags: ['page', 'slide', 'route', 'navigation', 'mobile'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Page Slide Up - Pages slide vertically
 */
export const pageSlideUp: RoyCSSEffect = {
  id: 'page-slide-up',
  name: 'Page Slide Up',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'New page slides up from below',
  css: `.page-slide-up-enter {
  transform: translateY(100%);
  animation: pageSlideInUp 0.4s ease-out forwards;
}

.page-slide-up-exit {
  transform: translateY(0);
  animation: pageSlideOutDown 0.4s ease-in forwards;
}

@keyframes pageSlideInUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes pageSlideOutDown {
  from { transform: translateY(0); }
  to { transform: translateY(30%); }
}`,
  tags: ['page', 'slide', 'vertical', 'navigation'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Page Zoom - Zoom transition between pages
 */
export const pageZoom: RoyCSSEffect = {
  id: 'page-zoom',
  name: 'Page Zoom',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'Current page zooms out, new zooms in',
  css: `.page-zoom-enter {
  opacity: 0;
  transform: scale(0.9);
  animation: pageZoomIn 0.4s ease-out forwards;
}

.page-zoom-exit {
  opacity: 1;
  transform: scale(1);
  animation: pageZoomOut 0.4s ease-in forwards;
}

@keyframes pageZoomIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pageZoomOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.1); }
}`,
  tags: ['page', 'zoom', 'scale', 'route', 'modern'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Cover Reveal - New page covers old one
 */
export const coverReveal: RoyCSSEffect = {
  id: 'cover-reveal',
  name: 'Cover Reveal',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'Overlay covers old page, reveals new one',
  css: `.cover-reveal-overlay {
  position: fixed;
  inset: 0;
  background: white;
  transform: scaleX(0);
  transform-origin: right;
  animation: coverReveal 0.6s ease-in-out forwards;
}

@keyframes coverReveal {
  0% { transform: scaleX(0); transform-origin: right; }
  50% { transform: scaleX(1); transform-origin: right; }
  50.01% { transform-origin: left; }
  100% { transform: scaleX(0); transform-origin: left; }
}`,
  tags: ['page', 'cover', 'wipe', 'cinematic', 'dramatic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Curtain Wipe - Theater curtain transition
 */
export const curtainWipe: RoyCSSEffect = {
  id: 'curtain-wipe',
  name: 'Curtain Wipe',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'Two curtains wipe to reveal new page',
  css: `.curtain-wipe {
  position: fixed;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.curtain-wipe::before,
.curtain-wipe::after {
  content: '';
  flex: 1;
  background: white;
  animation: curtainWipe 0.6s ease-in-out forwards;
}

.curtain-wipe::before {
  transform-origin: left;
}

.curtain-wipe::after {
  transform-origin: right;
}

@keyframes curtainWipe {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(0); }
  100% { transform: scaleX(0); }
}`,
  tags: ['page', 'curtain', 'theater', 'wipe', 'classic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Circle Reveal - Circular reveal transition
 */
export const circleReveal: RoyCSSEffect = {
  id: 'circle-reveal',
  name: 'Circle Reveal',
  category: 'transition',
  subCategory: 'page-transition',
  description: 'Circle expands to reveal new content',
  css: `.circle-reveal {
  position: fixed;
  inset: 0;
  background: white;
  clip-path: circle(0% at var(--x, 50%) var(--y, 50%));
  animation: circleReveal 0.6s ease-out forwards;
}

@keyframes circleReveal {
  to { clip-path: circle(150% at var(--x, 50%) var(--y, 50%)); }
}`,
  tags: ['page', 'circle', 'radial', 'material', 'ripple'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// SPECIAL TRANSITIONS
// ============================================================================

/**
 * Morph Shape - Shape morphing transition
 */
export const morphShape: RoyCSSEffect = {
  id: 'morph-shape',
  name: 'Morph Shape',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element morphs between shapes using clip-path',
  css: `.morph-shape {
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  transition: clip-path 0.5s ease;
}

.morph-shape:hover {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}`,
  tags: ['morph', 'shape', 'clip-path', 'polygon', 'creative'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Blur Transition - Blur in/out effect
 */
export const blurTransition: RoyCSSEffect = {
  id: 'blur-transition',
  name: 'Blur Transition',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element blurs/unblurs during transition',
  css: `.blur-transition {
  filter: blur(0);
  transition: filter 0.4s ease, opacity 0.4s ease;
}

.blur-transition.blurred {
  filter: blur(10px);
  opacity: 0.6;
}`,
  tags: ['blur', 'filter', 'glass', 'focus'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'blurAmount', label: 'Blur Amount', description: 'Blur intensity', type: 'number', defaultValue: 10, min: 0, max: 20 },
  ],
};

/**
 * Grayscale to Color
 */
export const grayscaleToColor: RoyCSSEffect = {
  id: 'grayscale-to-color',
  name: 'Grayscale to Color',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Image/element transitions from grayscale to full color',
  css: `.grayscale-to-color {
  filter: grayscale(100%);
  transition: filter 0.5s ease;
}

.grayscale-to-color:hover {
  filter: grayscale(0%);
}`,
  tags: ['grayscale', 'color', 'image', 'filter', 'photo'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Sepia to Normal
 */
export const sepiaToNormal: RoyCSSEffect = {
  id: 'sepia-to-normal',
  name: 'Sepia to Normal',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Transitions from sepia tone to normal colors',
  css: `.sepia-to-normal {
  filter: sepia(100%);
  transition: filter 0.5s ease;
}

.sepia-to-normal:hover {
  filter: sepia(0%);
}`,
  tags: ['sepia', 'vintage', 'filter', 'image', 'retro'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Brightness Boost
 */
export const brightnessBoost: RoyCSSEffect = {
  id: 'brightness-boost',
  name: 'Brightness Boost',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Element brightens on hover',
  css: `.brightness-boost {
  filter: brightness(1);
  transition: filter 0.3s ease;
}

.brightness-boost:hover {
  filter: brightness(1.2);
}`,
  tags: ['brightness', 'lighten', 'filter', 'highlight'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Contrast Increase
 */
export const contrastIncrease: RoyCSSEffect = {
  id: 'contrast-increase',
  name: 'Contrast Increase',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Contrast increases on hover for emphasis',
  css: `.contrast-increase {
  filter: contrast(1);
  transition: filter 0.3s ease;
}

.contrast-increase:hover {
  filter: contrast(1.3);
}`,
  tags: ['contrast', 'emphasis', 'filter', 'pop'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Hue Rotate Loop
 */
export const hueRotateLoop: RoyCSSEffect = {
  id: 'hue-rotate-loop',
  name: 'Hue Rotate Loop',
  category: 'transition',
  subCategory: 'looping',
  description: 'Colors cycle through hue spectrum continuously',
  css: `.hue-rotate-loop {
  animation: hueRotateLoop 5s linear infinite;
}

@keyframes hueRotateLoop {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}`,
  tags: ['hue', 'color', 'rainbow', 'cycle', 'psychedelic'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'duration', label: 'Duration', description: 'Full cycle time', type: 'time', defaultValue: '5s' },
  ],
};

/**
 * Saturate Pop
 */
export const saturatePop: RoyCSSEffect = {
  id: 'saturate-pop',
  name: 'Saturate Pop',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Saturation pops on hover for vibrant colors',
  css: `.saturate-pop {
  filter: saturate(0.8);
  transition: filter 0.3s ease;
}

.saturate-pop:hover {
  filter: saturate(1.5);
}`,
  tags: ['saturation', 'vibrant', 'color', 'pop'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Invert Colors
 */
export const invertColors: RoyCSSEffect = {
  id: 'invert-colors',
  name: 'Invert Colors',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Colors invert on hover',
  css: `.invert-colors {
  filter: invert(0);
  transition: filter 0.3s ease;
}

.invert-colors:hover {
  filter: invert(1);
}`,
  tags: ['invert', 'negative', 'filter', 'effect'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// DELAYED / STAGGERED TRANSITIONS
// ============================================================================

/**
 * Stagger Children - Sequential child animations
 */
export const staggerChildren: RoyCSSEffect = {
  id: 'stagger-children',
  name: 'Stagger Children',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Children animate sequentially with staggered delays',
  css: `.stagger-children > * {
  opacity: 0;
  transform: translateY(20px);
  animation: staggerFadeIn 0.5s ease-out forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 80ms; }
.stagger-children > *:nth-child(3) { animation-delay: 160ms; }
.stagger-children > *:nth-child(4) { animation-delay: 240ms; }
.stagger-children > *:nth-child(5) { animation-delay: 320ms; }
.stagger-children > *:nth-child(6) { animation-delay: 400ms; }

@keyframes staggerFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  tags: ['stagger', 'sequential', 'list', 'delay', 'children'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'staggerDelay', label: 'Stagger Delay', description: 'Delay between items', type: 'time', defaultValue: '80ms' },
  ],
};

/**
 * Cascade Effect - Waterfall cascade
 */
export const cascadeEffect: RoyCSSEffect = {
  id: 'cascade-effect',
  name: 'Cascade Effect',
  category: 'transition',
  subCategory: 'smooth',
  description: 'Elements animate in a cascading waterfall pattern',
  css: `.cascade-effect {
  display: grid;
  gap: 12px;
}

.cascade-effect > * {
  opacity: 0;
  transform: translateY(-20px);
  animation: cascadeIn 0.4s ease-out forwards;
}

.cascade-effect > *:nth-child(n) {
  animation-delay: calc(var(--index, 0) * 100ms);
}

@keyframes cascadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  tags: ['cascade', 'waterfall', 'grid', 'stagger', 'flow'],
  browserSupport: TRANSITION_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Transition Effects
// ============================================================================

/**
 * Complete array of all transition effects
 */
export const transitionEffects: RoyCSSEffect[] = [
  // Timing Functions
  easeIn, easeOut, easeInOut, linear,
  bounceEase, elasticEase, backEase, smoothStep, sharp,
  expoIn, expoOut, circIn, circOut,

  // Smooth Transitions
  fadeTransition, scaleTransition, rotateTransition,
  slideUpTransition, slideDownTransition,
  colorShiftTransition, borderColorTransition,
  shadowGrowTransition, borderRadiusMorph,
  widthExpandTransition, heightExpandTransition,

  // Compound Transitions
  liftAndShadow, scaleAndGlow, rotateAndScale,
  flipCard, accordionExpand, collapseWidth,

  // State Transitions
  buttonPress, inputFocusGlow,
  underlineGrow, underlineSlideLeft,
  backgroundFill, iconSpinHover, iconBounceHover,
  checkboxCustom, toggleSwitch, radioPulse,

  // Page Transitions
  pageFade, pageSlideRight, pageSlideUp, pageZoom,
  coverReveal, curtainWipe, circleReveal,

  // Special Transitions
  morphShape, blurTransition,
  grayscaleToColor, sepiaToNormal,
  brightnessBoost, contrastIncrease,
  hueRotateLoop, saturatePop, invertColors,

  // Staggered/Delayed
  staggerChildren, cascadeEffect,
];

export default transitionEffects;
