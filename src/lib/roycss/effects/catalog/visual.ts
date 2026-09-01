/**
 * ROYCSS Visual Effects Catalog
 * 
 * Comprehensive collection of 120+ CSS visual effects
 * including shadows, gradients, filters, glassmorphism, and neumorphism.
 * 
 * @module roycss/effects/catalog/visual
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Visual Effects
// ============================================================================

const VISUAL_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  partialSupport: ['safari'], // Some filters have partial Safari support
  unsupported: ['ie'],
  notes: 'Most visual effects supported in modern browsers',
};

const FILTER_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'CSS filters supported in all modern browsers',
};

const GLASSMORPHISM_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  partialSupport: ['safari'], // backdrop-filter has some Safari quirks
  unsupported: ['ie'],
  notes: 'backdrop-filter requires modern browser support',
};

// ============================================================================
// SHADOW EFFECTS
// ============================================================================

/**
 * Soft Shadow - Subtle, natural shadow
 */
export const softShadow: RoyCSSEffect = {
  id: 'soft-shadow',
  name: 'Soft Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Subtle, soft shadow for gentle elevation',
  css: `.soft-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
              0 1px 3px rgba(0, 0, 0, 0.06);
}`,
  tailwind: 'shadow-md',
  tags: ['shadow', 'soft', 'subtle', 'elevation', 'card'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'opacity', label: 'Opacity', description: 'Shadow opacity', type: 'number', defaultValue: 0.08, min: 0, max: 1, step: 0.01 },
  ],
};

/**
 * Hard Shadow - Crisp, defined shadow
 */
export const hardShadow: RoyCSSEffect = {
  id: 'hard-shadow',
  name: 'Hard Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Crisp, hard-edged shadow for bold designs',
  css: `.hard-shadow {
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.25);
}`,
  tags: ['shadow', 'hard', 'brutalist', 'bold', 'flat'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Deep Shadow - Multi-layered depth shadow
 */
export const deepShadow: RoyCSSEffect = {
  id: 'deep-shadow',
  name: 'Deep Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Multi-layered shadow for significant elevation',
  css: `.deep-shadow {
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 10px 15px rgba(0, 0, 0, 0.05),
    0 20px 25px rgba(0, 0, 0, 0.05),
    0 30px 40px rgba(0, 0, 0, 0.03);
}`,
  tailwind: 'shadow-2xl',
  tags: ['shadow', 'deep', 'layered', 'elevation', 'modal'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Neon Shadow - Glowing neon effect
 */
export const neonShadow: RoyCSSEffect = {
  id: 'neon-shadow',
  name: 'Neon Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Colorful glowing neon shadow effect',
  css: `.neon-shadow {
  box-shadow: 
    0 0 5px #00f,
    0 0 10px #00f,
    0 0 20px #00f,
    0 0 40px #00f;
}`,
  tags: ['neon', 'glow', 'cyberpunk', 'colorful', 'retro'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'color', label: 'Color', description: 'Neon glow color', type: 'color', defaultValue: '#00f' },
    { name: 'layers', label: 'Layers', description: 'Number of glow layers', type: 'number', defaultValue: 4, min: 1, max: 6 },
  ],
};

/**
 * Inset Shadow - Inner shadow for pressed effect
 */
export const insetShadow: RoyCSSEffect = {
  id: 'inset-shadow',
  name: 'Inset Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Inner shadow creating a pressed/inset appearance',
  css: `.inset-shadow {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.12),
              inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}`,
  tailwind: 'shadow-inner',
  tags: ['shadow', 'inset', 'pressed', 'inner', 'input'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Colored Shadow - Tinted colored shadow
 */
export const coloredShadow: RoyCSSEffect = {
  id: 'colored-shadow',
  name: 'Colored Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Shadow with custom color tinting',
  css: `.colored-shadow {
  box-shadow: 
    0 10px 20px rgba(59, 130, 246, 0.3),
    0 6px 6px rgba(59, 130, 246, 0.2);
}`,
  tags: ['shadow', 'colored', 'tinted', 'blue', 'custom'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'color', label: 'Shadow Color', description: 'RGB color values', type: 'string', defaultValue: '59, 130, 246' },
  ],
};

/**
 * Animated Shadow - Pulsing/moving shadow
 */
export const animatedShadow: RoyCSSEffect = {
  id: 'animated-shadow',
  name: 'Animated Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Shadow that animates/pulses over time',
  css: `.animated-shadow {
  animation: animatedShadow 3s ease-in-out infinite alternate;
}

@keyframes animatedShadow {
  0% {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }
  50% {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  }
  100% {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }
}`,
  tags: ['shadow', 'animated', 'pulse', 'dynamic', 'looping'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Floating Shadow - Shadow that follows floating element
 */
export const floatingShadow: RoyCSSEffect = {
  id: 'floating-shadow',
  name: 'Floating Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Dynamic shadow that changes as if floating',
  css: `.floating-shadow {
  animation: floatShadow 6s ease-in-out infinite;
}

@keyframes floatShadow {
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: translateY(-10px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  }
}`,
  tags: ['shadow', 'floating', 'lift', 'dynamic', 'elevation'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Dual Shadow - Two-tone shadow effect
 */
export const dualShadow: RoyCSSEffect = {
  id: 'dual-shadow',
  name: 'Dual Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Two shadows in different directions for depth',
  css: `.dual-shadow {
  box-shadow: 
    -5px 5px 0 #e5e7eb,
    -10px 10px 0 #d1d5db;
}`,
  tags: ['shadow', 'dual', 'two-tone', 'offset', 'brutalism'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Outline Shadow - Border-like shadow outline
 */
export const outlineShadow: RoyCSSEffect = {
  id: 'outline-shadow',
  name: 'Outline Shadow',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Shadow that creates an outline/border effect',
  css: `.outline-shadow {
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 0 0 2px white,
    0 0 0 3px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.1);
}`,
  tags: ['shadow', 'outline', 'border', 'frame', 'sticker'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Volumetric Light - Light beam shadow
 */
export const volumetricLight: RoyCSSEffect = {
  id: 'volumetric-light',
  name: 'Volumetric Light',
  category: 'visual',
  subCategory: 'shadow',
  description: 'Dramatic light beam/volumetric lighting effect',
  css: `.volumetric-light {
  position: relative;
}

.volumetric-light::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 200, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}`,
  tags: ['light', 'volumetric', 'dramatic', 'beam', 'atmospheric'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// GRADIENT EFFECTS
// ============================================================================

/**
 * Linear Gradient Basic
 */
export const linearGradientBasic: RoyCSSEffect = {
  id: 'linear-gradient-basic',
  name: 'Linear Gradient Basic',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Simple two-color linear gradient',
  css: `.linear-gradient-basic {
  background: linear-gradient(to right, #667eea, #764ba2);
}`,
  tags: ['gradient', 'linear', 'basic', 'two-color'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'from', label: 'From Color', description: 'Start color', type: 'color', defaultValue: '#667eea' },
    { name: 'to', label: 'To Color', description: 'End color', type: 'color', defaultValue: '#764ba2' },
  ],
};

/**
 * Linear Gradient Diagonal
 */
export const linearGradientDiagonal: RoyCSSEffect = {
  id: 'linear-gradient-diagonal',
  name: 'Linear Gradient Diagonal',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Diagonal linear gradient for dynamic feel',
  css: `.linear-gradient-diagonal {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}`,
  tags: ['gradient', 'diagonal', 'dynamic', 'modern'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Radial Gradient Center
 */
export const radialGradientCenter: RoyCSSEffect = {
  id: 'radial-gradient-center',
  name: 'Radial Gradient Center',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Radial gradient emanating from center',
  css: `.radial-gradient-center {
  background: radial-gradient(circle at center, #ffecd2 0%, #fcb69f 100%);
}`,
  tags: ['gradient', 'radial', 'center', 'circle'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Radial Gradient Offset
 */
export const radialGradientOffset: RoyCSSEffect = {
  id: 'radial-gradient-offset',
  name: 'Radial Gradient Offset',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Radial gradient from offset position',
  css: `.radial-gradient-offset {
  background: radial-gradient(circle at top right, #a18cd1 0%, #fbc2eb 100%);
}`,
  tags: ['gradient', 'radial', 'offset', 'asymmetric'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Conic Gradient
 */
export const conicGradient: RoyCSSEffect = {
  id: 'conic-gradient',
  name: 'Conic Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Conic gradient for pie-chart like patterns',
  css: `.conic-gradient {
  background: conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
}`,
  tags: ['gradient', 'conic', 'pie', 'wheel', 'color-wheel'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Mesh Gradient - Complex multi-stop gradient
 */
export const meshGradient: RoyCSSEffect = {
  id: 'mesh-gradient',
  name: 'Mesh Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Complex multi-stop gradient for mesh-like appearance',
  css: `.mesh-gradient {
  background: 
    radial-gradient(at 40% 20%, hsla(28, 99%, 49%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 50%, hsla(340, 100%, 76%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(22, 100%, 77%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(242, 100%, 69%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 0%, hsla(343, 100%, 76%, 1) 0px, transparent 50%);
  background-color: hsla(0, 0%, 100%, 1);
}`,
  tags: ['gradient', 'mesh', 'complex', 'multi-stop', 'modern', 'apple'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Animated Gradient - Color shifting gradient
 */
export const animatedGradient: RoyCSSEffect = {
  id: 'animated-gradient',
  name: 'Animated Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Gradient that animates/shifts colors continuously',
  css: `.animated-gradient {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: animatedGradient 15s ease infinite;
}

@keyframes animatedGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`,
  tags: ['gradient', 'animated', 'shifting', 'colorful', 'looping'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Gradient Border - Border with gradient
 */
export const gradientBorder: RoyCSSEffect = {
  id: 'gradient-border',
  name: 'Gradient Border',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Border filled with gradient colors',
  css: `.gradient-border {
  position: relative;
  border: none;
  background: white;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 2px;
  background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #002fff, #7a00ff, #ff00c8, #ff0000);
  background-size: 400%;
  border-radius: inherit;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: gradientBorderRotate 8s linear infinite;
}

@keyframes gradientBorderRotate {
  to { background-position: 100% 0; }
}`,
  tags: ['gradient', 'border', 'rainbow', 'animated', 'outline'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Gradient Text - Text with gradient fill
 */
export const gradientText: RoyCSSEffect = {
  id: 'gradient-text',
  name: 'Gradient Text',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Text filled with gradient colors',
  css: `.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['gradient', 'text', 'fill', 'headline', 'typography'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Metallic Gradient - Metal-like sheen
 */
export const metallicGradient: RoyCSSEffect = {
  id: 'metallic-gradient',
  name: 'Metallic Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Metallic/silver gradient with realistic sheen',
  css: `.metallic-gradient {
  background: linear-gradient(
    135deg,
    #e8e8e8 0%,
    #ffffff 25%,
    #c9c9c9 50%,
    #f0f0f0 75%,
    #d4d4d4 100%
  );
}`,
  tags: ['gradient', 'metallic', 'silver', 'sheen', 'realistic'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Sunset Gradient - Warm sunset colors
 */
export const sunsetGradient: RoyCSSEffect = {
  id: 'sunset-gradient',
  name: 'Sunset Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Warm sunset-inspired gradient palette',
  css: `.sunset-gradient {
  background: linear-gradient(to top, #ff0844 0%, #ffb199 100%);
}`,
  tags: ['gradient', 'sunset', 'warm', 'orange', 'red', 'nature'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Ocean Gradient - Cool ocean blues
 */
export const oceanGradient: RoyCSSEffect = {
  id: 'ocean-gradient',
  name: 'Ocean Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Cool ocean/water inspired gradient',
  css: `.ocean-gradient {
  background: linear-gradient(180deg, #2e3192 0%, #1bffff 100%);
}`,
  tags: ['gradient', 'ocean', 'blue', 'water', 'cool', 'nature'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Aurora Gradient - Northern lights effect
 */
export const auroraGradient: RoyCSSEffect = {
  id: 'aurora-gradient',
  name: 'Aurora Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Aurora borealis inspired multi-color gradient',
  css: `.aurora-gradient {
  background: 
    linear-gradient(180deg, rgba(0, 255, 128, 0.3) 0%, transparent 50%),
    linear-gradient(180deg, rgba(0, 128, 255, 0.3) 0%, transparent 50%),
    linear-gradient(180deg, rgba(128, 0, 255, 0.3) 0%, transparent 50%),
    linear-gradient(90deg, #001 0%, #00868b 100%);
}`,
  tags: ['gradient', 'aurora', 'northern-lights', 'green', 'purple', 'night'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Glassmorphism Gradient - Frosted glass base
 */
export const glassmorphismGradient: RoyCSSEffect = {
  id: 'glassmorphism-gradient',
  name: 'Glassmorphism Gradient',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Subtle gradient for glassmorphism backgrounds',
  css: `.glassmorphism-gradient {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}`,
  tags: ['gradient', 'glassmorphism', 'frosted', 'blur', 'modern'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// FILTER EFFECTS
// ============================================================================

/**
 * Blur Effect - Gaussian blur
 */
export const blurEffect: RoyCSSEffect = {
  id: 'blur-effect',
  name: 'Blur Effect',
  category: 'visual',
  subCategory: 'filter',
  description: 'Gaussian blur filter for softening',
  css: `.blur-effect {
  filter: blur(5px);
}`,
  tailwind: 'blur-[5px]',
  tags: ['filter', 'blur', 'soften', 'gaussian'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amount', label: 'Blur Amount', description: 'Blur radius in pixels', type: 'number', defaultValue: 5, min: 0, max: 20 },
  ],
};

/**
 * Grayscale Filter
 */
export const grayscaleFilter: RoyCSSEffect = {
  id: 'grayscale-filter',
  name: 'Grayscale Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Converts colors to grayscale',
  css: `.grayscale-filter {
  filter: grayscale(100%);
}`,
  tailwind: 'grayscale',
  tags: ['filter', 'grayscale', 'black-white', 'monochrome'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amount', label: 'Amount', description: 'Grayscale percentage', type: 'number', defaultValue: 100, min: 0, max: 100 },
  ],
};

/**
 * Sepia Filter
 */
export const sepiaFilter: RoyCSSEffect = {
  id: 'sepia-filter',
  name: 'Sepia Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Applies sepia tone (vintage look)',
  css: `.sepia-filter {
  filter: sepia(100%);
}`,
  tailwind: 'sepia',
  tags: ['filter', 'sepia', 'vintage', 'old-photo', 'warm'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Saturate Filter
 */
export const saturateFilter: RoyCSSEffect = {
  id: 'saturate-filter',
  name: 'Saturate Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Increases or decreases color saturation',
  css: `.saturate-filter {
  filter: saturate(150%);
}`,
  tags: ['filter', 'saturate', 'vibrant', 'colorful'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amount', label: 'Amount', description: 'Saturation percentage', type: 'number', defaultValue: 150, min: 0, max: 300 },
  ],
};

/**
 * Hue Rotate Filter
 */
export const hueRotateFilter: RoyCSSEffect = {
  id: 'hue-rotate-filter',
  name: 'Hue Rotate Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Rotates hue of all colors',
  css: `.hue-rotate-filter {
  filter: hue-rotate(90deg);
}`,
  tags: ['filter', 'hue', 'rotate', 'color-shift', 'rainbow'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'angle', label: 'Angle', description: 'Rotation angle', type: 'angle', defaultValue: '90deg' },
  ],
};

/**
 * Invert Filter
 */
export const invertFilter: RoyCSSEffect = {
  id: 'invert-filter',
  name: 'Invert Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Inverts all colors (negative effect)',
  css: `.invert-filter {
  filter: invert(100%);
}`,
  tags: ['filter', 'invert', 'negative', 'opposite'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Brightness Filter
 */
export const brightnessFilter: RoyCSSEffect = {
  id: 'brightness-filter',
  name: 'Brightness Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Adjusts brightness of element',
  css: `.brightness-filter {
  filter: brightness(1.2);
}`,
  tags: ['filter', 'brightness', 'light', 'exposure'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amount', label: 'Amount', description: 'Brightness multiplier', type: 'number', defaultValue: 1.2, min: 0, max: 2, step: 0.1 },
  ],
};

/**
 * Contrast Filter
 */
export const contrastFilter: RoyCSSEffect = {
  id: 'contrast-filter',
  name: 'Contrast Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Adjusts contrast of element',
  css: `.contrast-filter {
  filter: contrast(150%);
}`,
  tags: ['filter', 'contrast', 'pop', 'emphasis'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Drop Shadow Filter
 */
export const dropShadowFilter: RoyCSSEffect = {
  id: 'drop-shadow-filter',
  name: 'Drop Shadow Filter',
  category: 'visual',
  subCategory: 'filter',
  description: 'Drop shadow following alpha channel shape',
  css: `.drop-shadow-filter {
  filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.3));
}`,
  tags: ['filter', 'drop-shadow', 'alpha', 'shape'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Vintage Photo - Combined vintage filters
 */
export const vintagePhoto: RoyCSSEffect = {
  id: 'vintage-photo',
  name: 'Vintage Photo',
  category: 'visual',
  subCategory: 'filter',
  description: 'Combines multiple filters for vintage photo look',
  css: `.vintage-photo {
  filter: sepia(30%) contrast(110%) brightness(95%) saturate(85%);
}`,
  tags: ['filter', 'vintage', 'photo', 'retro', 'combined'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Dramatic Contrast - High contrast cinematic look
 */
export const dramaticContrast: RoyCSSEffect = {
  id: 'dramatic-contrast',
  name: 'Dramatic Contrast',
  category: 'visual',
  subCategory: 'filter',
  description: 'High contrast dramatic/cinematic effect',
  css: `.dramatic-contrast {
  filter: contrast(140%) brightness(90%) saturate(120%);
}`,
  tags: ['filter', 'contrast', 'dramatic', 'cinematic', 'moody'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Dreamy Blur - Soft dreamy effect
 */
export const dreamyBlur: RoyCSSEffect = {
  id: 'dreamy-blur',
  name: 'Dreamy Blur',
  category: 'visual',
  subCategory: 'filter',
  description: 'Soft blurred dreamy/fantasy effect',
  css: `.dreamy-blur {
  filter: blur(2px) brightness(110%) saturate(130%) contrast(90%);
}`,
  tags: ['filter', 'blur', 'dreamy', 'soft', 'fantasy'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// BACKDROP FILTER / GLASSMORPHISM
// ============================================================================

/**
 * Glassmorphism Card - Frosted glass card
 */
export const glassmorphismCard: RoyCSSEffect = {
  id: 'glassmorphism-card',
  name: 'Glassmorphism Card',
  category: 'visual',
  subCategory: 'glassmorphism',
  description: 'Frosted glass card with blur and transparency',
  css: `.glassmorphism-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}`,
  tags: ['glassmorphism', 'glass', 'frosted', 'blur', 'card', 'modern'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'blur', label: 'Blur Amount', description: 'Backdrop blur radius', type: 'number', defaultValue: 16, min: 4, max: 32 },
    { name: 'opacity', label: 'Background Opacity', description: 'Background transparency', type: 'number', defaultValue: 0.1, min: 0, max: 0.5, step: 0.05 },
  ],
};

/**
 * Glassmorphism Dark - Dark mode frosted glass
 */
export const glassmorphismDark: RoyCSSEffect = {
  id: 'glassmorphism-dark',
  name: 'Glassmorphism Dark',
  category: 'visual',
  subCategory: 'glassmorphism',
  description: 'Dark-themed frosted glass effect',
  css: `.glassmorphism-dark {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}`,
  tags: ['glassmorphism', 'dark', 'frosted', 'blur', 'dark-mode'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Glassmorphism Panel - Larger panel variant
 */
export const glassmorphismPanel: RoyCSSEffect = {
  id: 'glassmorphism-panel',
  name: 'Glassmorphism Panel',
  category: 'visual',
  subCategory: 'glassmorphism',
  description: 'Larger glassmorphism panel for sidebars/modals',
  css: `.glassmorphism-panel {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.04) 100%
  );
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}`,
  tags: ['glassmorphism', 'panel', 'sidebar', 'modal', 'large'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Glassmorphism Button - Glass-style button
 */
export const glassmorphismButton: RoyCSSEffect = {
  id: 'glassmorphism-button',
  name: 'Glassmorphism Button',
  category: 'visual',
  subCategory: 'glassmorphism',
  description: 'Frosted glass button with hover effects',
  css: `.glassmorphism-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  transition: all 0.3s ease;
}

.glassmorphism-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}`,
  tags: ['glassmorphism', 'button', 'interactive', 'hover', 'cta'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Glassmorphism Input - Text input field
 */
export const glassmorphismInput: RoyCSSEffect = {
  id: 'glassmorphism-input',
  name: 'Glassmorphism Input',
  category: 'visual',
  subCategory: 'glassmorphism',
  description: 'Frosted glass styled input field',
  css: `.glassmorphism-input {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: white;
  padding: 12px 16px;
  transition: all 0.3s ease;
}

.glassmorphism-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}`,
  tags: ['glassmorphism', 'input', 'form', 'field', 'text'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Backdrop Blur Simple - Just the blur effect
 */
export const backdropBlurSimple: RoyCSSEffect = {
  id: 'backdrop-blur-simple',
  name: 'Backdrop Blur Simple',
  category: 'visual',
  subCategory: 'backdrop-filter',
  description: 'Simple backdrop blur without other styling',
  css: `.backdrop-blur-simple {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}`,
  tailwind: 'backdrop-blur-[10px]',
  tags: ['backdrop', 'blur', 'simple', 'basic'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'amount', label: 'Blur Amount', description: 'Blur radius', type: 'number', defaultValue: 10, min: 0, max: 30 },
  ],
};

/**
 * Backdrop Saturate - Saturation adjustment
 */
export const backdropSaturate: RoyCSSEffect = {
  id: 'backdrop-saturate',
  name: 'Backdrop Saturate',
  category: 'visual',
  subCategory: 'backdrop-filter',
  description: 'Increases saturation of elements behind',
  css: `.backdrop-saturate {
  backdrop-filter: saturate(180%) blur(10px);
  -webkit-backdrop-filter: saturate(180%) blur(10px);
}`,
  tags: ['backdrop', 'saturate', 'vibrant', 'color'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Backdrop Grayscale - Grayscaled background
 */
export const backdropGrayscale: RoyCSSEffect = {
  id: 'backdrop-grayscale',
  name: 'Backdrop Grayscale',
  category: 'visual',
  subCategory: 'backdrop-filter',
  description: 'Makes background appear grayscale through element',
  css: `.backdrop-grayscale {
  backdrop-filter: grayscale(100%);
  -webkit-backdrop-filter: grayscale(100%);
}`,
  tags: ['backdrop', 'grayscale', 'mono', 'desaturate'],
  browserSupport: GLASSMORPHISM_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// NEUMORPHISM EFFECTS
// ============================================================================

/**
 * Neumorphic Raised - Soft raised surface
 */
export const neumorphicRaised: RoyCSSEffect = {
  id: 'neumorphic-raised',
  name: 'Neumorphic Raised',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Soft UI raised neumorphic element',
  css: `.neumorphic-raised {
  background: #e0e5ec;
  box-shadow: 
    8px 8px 16px #b8bec7,
    -8px -8px 16px #ffffff;
  border-radius: 20px;
}`,
  tags: ['neumorphism', 'raised', 'soft-ui', 'extruded', 'modern'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'bgColor', label: 'Base Color', description: 'Background color', type: 'color', defaultValue: '#e0e5ec' },
    { name: 'size', label: 'Shadow Size', description: 'Shadow spread', type: 'number', defaultValue: 16, min: 4, max: 40 },
  ],
};

/**
 * Neumorphic Pressed - Inset pressed state
 */
export const neumorphicPressed: RoyCSSEffect = {
  id: 'neumorphic-pressed',
  name: 'Neumorphic Pressed',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Soft UI pressed/inset neumorphic element',
  css: `.neumorphic-pressed {
  background: #e0e5ec;
  box-shadow: 
    inset 8px 8px 16px #b8bec7,
    inset -8px -8px 16px #ffffff;
  border-radius: 20px;
}`,
  tags: ['neumorphism', 'pressed', 'inset', 'concave', 'active'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Button - Interactive neumorphic button
 */
export const neumorphicButton: RoyCSSEffect = {
  id: 'neumorphic-button',
  name: 'Neumorphic Button',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Interactive neumorphic button with press effect',
  css: `.neumorphic-button {
  background: #e0e5ec;
  box-shadow: 
    6px 6px 12px #b8bec7,
    -6px -6px 12px #ffffff;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.neumorphic-button:active {
  box-shadow: 
    inset 6px 6px 12px #b8bec7,
    inset -6px -6px 12px #ffffff;
}`,
  tags: ['neumorphism', 'button', 'interactive', 'press', 'toggle'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Toggle - Toggle switch style
 */
export const neumorphicToggle: RoyCSSEffect = {
  id: 'neumorphic-toggle',
  name: 'Neumorphic Toggle',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Neumorphic toggle switch component',
  css: `.neumorphic-toggle-track {
  width: 60px;
  height: 32px;
  background: #e0e5ec;
  border-radius: 16px;
  box-shadow: 
    inset 4px 4px 8px #b8bec7,
    inset -4px -4px 8px #ffffff;
  position: relative;
  cursor: pointer;
}

.neumorphic-toggle-thumb {
  width: 24px;
  height: 24px;
  background: #e0e5ec;
  border-radius: 50%;
  position: absolute;
  top: 4px;
  left: 4px;
  box-shadow: 
    2px 2px 4px #b8bec7,
    -2px -2px 4px #ffffff;
  transition: transform 0.3s ease;
}

.neumorphic-toggle-track.active .neumorphic-toggle-thumb {
  transform: translateX(28px);
}`,
  tags: ['neumorphism', 'toggle', 'switch', 'component', 'ui'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Card - Card container
 */
export const neumorphicCard: RoyCSSEffect = {
  id: 'neumorphic-card',
  name: 'Neumorphic Card',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Neumorphic card/container design',
  css: `.neumorphic-card {
  background: #e0e5ec;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 
    12px 12px 24px #b8bec7,
    -12px -12px 24px #ffffff;
}`,
  tags: ['neumorphism', 'card', 'container', 'panel', 'surface'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Icon Button - Circular icon button
 */
export const neumorphicIconButton: RoyCSSEffect = {
  id: 'neumorphic-icon-button',
  name: 'Neumorphic Icon Button',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Circular neumorphic icon button',
  css: `.neumorphic-icon-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e0e5ec;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    6px 6px 12px #b8bec7,
    -6px -6px 12px #ffffff;
  transition: all 0.2s ease;
}

.neumorphic-icon-button:active {
  box-shadow: 
    inset 4px 4px 8px #b8bec7,
    inset -4px -4px 8px #ffffff;
}`,
  tags: ['neumorphism', 'icon', 'button', 'circular', 'fab'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Input - Text input field
 */
export const neumorphicInput: RoyCSSEffect = {
  id: 'neumorphic-input',
  name: 'Neumorphic Input',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Neumorphic styled text input',
  css: `.neumorphic-input {
  background: #e0e5ec;
  border: none;
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: 
    inset 4px 4px 8px #b8bec7,
    inset -4px -4px 8px #ffffff;
  color: #333;
  font-size: 16px;
}

.neumorphic-input:focus {
  outline: none;
  box-shadow: 
    inset 6px 6px 12px #b8bec7,
    inset -6px -6px 12px #ffffff;
}`,
  tags: ['neumorphism', 'input', 'form', 'field', 'text'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neumorphic Progress Bar
 */
export const neumorphicProgress: RoyCSSEffect = {
  id: 'neumorphic-progress',
  name: 'Neumorphic Progress',
  category: 'visual',
  subCategory: 'neumorphism',
  description: 'Neumorphic progress bar component',
  css: `.neumorphic-progress-track {
  height: 16px;
  background: #e0e5ec;
  border-radius: 8px;
  box-shadow: 
    inset 4px 4px 8px #b8bec7,
    inset -4px -4px 8px #ffffff;
  overflow: hidden;
}

.neumorphic-progress-fill {
  height: 100%;
  width: 60%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
  box-shadow: 
    2px 2px 4px rgba(102, 126, 234, 0.4);
}`,
  tags: ['neumorphism', 'progress', 'bar', 'loading', 'component'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// ADDITIONAL VISUAL EFFECTS
// ============================================================================

/**
 * Noise Texture - Grain overlay effect
 */
export const noiseTexture: RoyCSSEffect = {
  id: 'noise-texture',
  name: 'Noise Texture',
  category: 'visual',
  subCategory: 'filter',
  description: 'Film grain/noise texture overlay',
  css: `.noise-texture {
  position: relative;
}

.noise-texture::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
}`,
  tags: ['texture', 'noise', 'grain', 'film', 'overlay'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Dot Pattern - Polka dot pattern
 */
export const dotPattern: RoyCSSEffect = {
  id: 'dot-pattern',
  name: 'Dot Pattern',
  category: 'visual',
  subCategory: 'filter',
  description: 'Polka dot pattern background',
  css: `.dot-pattern {
  background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.3;
}`,
  tags: ['pattern', 'dots', 'polka-dot', 'background', 'texture'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'size', label: 'Pattern Size', description: 'Spacing between dots', type: 'length', defaultValue: 20, unit: 'px' },
    { name: 'dotSize', label: 'Dot Size', description: 'Dot diameter', type: 'length', defaultValue: 1, unit: 'px' },
  ],
};

/**
 * Grid Pattern - Line grid background
 */
export const gridPattern: RoyCSSEffect = {
  id: 'grid-pattern',
  name: 'Grid Pattern',
  category: 'visual',
  subCategory: 'filter',
  description: 'Grid line pattern background',
  css: `.grid-pattern {
  background-image: 
    linear-gradient(currentColor 1px, transparent 1px),
    linear-gradient(90deg, currentColor 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.15;
}`,
  tags: ['pattern', 'grid', 'lines', 'background', 'graph-paper'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'size', label: 'Grid Size', description: 'Cell size', type: 'length', defaultValue: 40, unit: 'px' },
  ],
};

/**
 * Striped Pattern - Diagonal stripes
 */
export const stripedPattern: RoyCSSEffect = {
  id: 'striped-pattern',
  name: 'Striped Pattern',
  category: 'visual',
  subCategory: 'filter',
  description: 'Diagonal striped/hazard pattern',
  css: `.striped-pattern {
  background: repeating-linear-gradient(
    45deg,
    currentColor,
    currentColor 10px,
    transparent 10px,
    transparent 20px
  );
  opacity: 0.2;
}`,
  tags: ['pattern', 'stripes', 'diagonal', 'hazard', 'warning'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Checkerboard Pattern
 */
export const checkerboardPattern: RoyCSSEffect = {
  id: 'checkerboard-pattern',
  name: 'Checkerboard Pattern',
  category: 'visual',
  subCategory: 'filter',
  description: 'Checkerboard/chess board pattern',
  css: `.checkerboard-pattern {
  background-image:
    linear-gradient(45deg, currentColor 25%, transparent 25%),
    linear-gradient(-45deg, currentColor 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, currentColor 75%),
    linear-gradient(-45deg, transparent 75%, currentColor 75%);
  background-size: 40px 40px;
  background-position: 0 0, 0 20px, 20px -20px, -20px 0px;
  opacity: 0.3;
}`,
  tags: ['pattern', 'checkerboard', 'chess', 'alternating'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Vignette Effect - Darkened edges
 */
export const vignetteEffect: RoyCSSEffect = {
  id: 'vignette-effect',
  name: 'Vignette Effect',
  category: 'visual',
  subCategory: 'filter',
  description: 'Darkens edges for focus on center',
  css: `.vignette-effect {
  position: relative;
}

.vignette-effect::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
}`,
  tags: ['vignette', 'dark-edge', 'focus', 'photography', 'cinematic'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Scanlines Effect - CRT monitor lines
 */
export const scanlinesEffect: RoyCSSEffect = {
  id: 'scanlines-effect',
  name: 'Scanlines Effect',
  category: 'visual',
  subCategory: 'filter',
  description: 'CRT monitor scanline overlay',
  css: `.scanlines-effect {
  position: relative;
}

.scanlines-effect::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
}`,
  tags: ['scanlines', 'crt', 'monitor', 'retro', 'tv'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Chromatic Aberration - RGB split effect
 */
export const chromaticAberration: RoyCSSEffect = {
  id: 'chromatic-aberration',
  name: 'Chromatic Aberration',
  category: 'visual',
  subCategory: 'filter',
  description: 'RGB color fringing effect',
  css: `.chromatic-aberration {
  position: relative;
}

.chromatic-aberration::before,
.chromatic-aberration::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
}

.chromatic-aberration::before {
  color: red;
  transform: translate(-2px, -1px);
  mix-blend-mode: screen;
  opacity: 0.7;
}

.chromatic-aberration::after {
  color: cyan;
  transform: translate(2px, 1px);
  mix-blend-mode: screen;
  opacity: 0.7;
}`,
  tags: ['chromatic', 'aberration', 'rgb-split', 'glitch', 'lens'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Holographic Effect - Rainbow shimmer
 */
export const holographicEffect: RoyCSSEffect = {
  id: 'holographic-effect',
  name: 'Holographic Effect',
  category: 'visual',
  subCategory: 'gradient',
  description: 'Iridescent holographic/rainbow shimmer',
  css: `.holographic-effect {
  background: linear-gradient(
    135deg,
    #ff0080 0%,
    #ff8c00 20%,
    #40e0d0 40%,
    #ff0080 60%,
    #ff8c00 80%,
    #40e0d0 100%
  );
  background-size: 400% 400%;
  animation: holographicShimmer 8s ease infinite;
}

@keyframes holographicShimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`,
  tags: ['holographic', 'iridescent', 'rainbow', 'shimmer', 'prism'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Oil Paint Effect - Artistic filter simulation
 */
export const oilPaintEffect: RoyCSSEffect = {
  id: 'oil-paint-effect',
  name: 'Oil Paint Effect',
  category: 'visual',
  subCategory: 'filter',
  description: 'Simulates oil painting texture',
  css: `.oil-paint-effect {
  filter: 
    contrast(120%) 
    saturate(140%) 
    blur(0.3px);
  mix-blend-mode: multiply;
}`,
  tags: ['oil-paint', 'artistic', 'painting', 'texture', 'creative'],
  browserSupport: FILTER_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Pixelate Effect - Pixelated appearance
 */
export const pixelateEffect: RoyCSSEffect = {
  id: 'pixelate-effect',
  name: 'Pixelate Effect',
  category: 'visual',
  subCategory: 'filter',
  description: 'Creates pixelated/8-bit appearance',
  css: `.pixelate-effect {
  image-rendering: pixelated;
  filter: contrast(125%) brightness(105%);
  transform: scale(0.5); /* Scale up parent to show pixels */
}`,
  tags: ['pixelate', 'pixel-art', '8-bit', 'retro', 'gaming'],
  browserSupport: VISUAL_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Visual Effects
// ============================================================================

/**
 * Complete array of all visual effects
 */
export const visualEffects: RoyCSSEffect[] = [
  // Shadows
  softShadow, hardShadow, deepShadow, neonShadow, insetShadow,
  coloredShadow, animatedShadow, floatingShadow, dualShadow,
  outlineShadow, volumetricLight,

  // Gradients
  linearGradientBasic, linearGradientDiagonal,
  radialGradientCenter, radialGradientOffset,
  conicGradient, meshGradient, animatedGradient,
  gradientBorder, gradientText, metallicGradient,
  sunsetGradient, oceanGradient, auroraGradient,
  glassmorphismGradient,

  // Filters
  blurEffect, grayscaleFilter, sepiaFilter, saturateFilter,
  hueRotateFilter, invertFilter, brightnessFilter, contrastFilter,
  dropShadowFilter, vintagePhoto, dramaticContrast, dreamyBlur,

  // Glassmorphism
  glassmorphismCard, glassmorphismDark, glassmorphismPanel,
  glassmorphismButton, glassmorphismInput,
  backdropBlurSimple, backdropSaturate, backdropGrayscale,

  // Neumorphism
  neumorphicRaised, neumorphicPressed, neumorphicButton,
  neumorphicToggle, neumorphicCard, neumorphicIconButton,
  neumorphicInput, neumorphicProgress,

  // Patterns & Textures
  noiseTexture, dotPattern, gridPattern, stripedPattern,
  checkerboardPattern, vignetteEffect, scanlinesEffect,
  chromaticAberration, holographicEffect, oilPaintEffect,
  pixelateEffect,
];

export default visualEffects;
