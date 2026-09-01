/**
 * ROYCSS Text Effects Catalog
 * 
 * Comprehensive collection of 60+ CSS text effects
 * including gradients, shadows, typewriter, glitch, and neon styles.
 * 
 * @module roycss/effects/catalog/text
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Text Effects
// ============================================================================

const TEXT_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'Text effects well-supported in modern browsers',
};

const CLIP_TEXT_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  partialSupport: ['safari'], // -webkit-background-clip needed
  unsupported: ['ie'],
  notes: 'background-clip: text requires webkit prefix for Safari',
};

// ============================================================================
// TEXT GRADIENT EFFECTS
// ============================================================================

/**
 * Basic Text Gradient - Simple gradient fill
 */
export const basicTextGradient: RoyCSSEffect = {
  id: 'basic-text-gradient',
  name: 'Basic Text Gradient',
  category: 'text',
  subCategory: 'gradient',
  description: 'Text filled with a simple two-color gradient',
  css: `.basic-text-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['gradient', 'text-fill', 'simple', 'two-color'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'fromColor', label: 'From Color', description: 'Start color', type: 'color', defaultValue: '#667eea' },
    { name: 'toColor', label: 'To Color', description: 'End color', type: 'color', defaultValue: '#764ba2' },
  ],
};

/**
 * Rainbow Text Gradient - Full spectrum rainbow
 */
export const rainbowTextGradient: RoyCSSEffect = {
  id: 'rainbow-text-gradient',
  name: 'Rainbow Text Gradient',
  category: 'text',
  subCategory: 'gradient',
  description: 'Text with full rainbow/spectrum colors',
  css: `.rainbow-text-gradient {
  background: linear-gradient(
    to right,
    #ff0000, #ff8000, #ffff00, #80ff00,
    #00ff00, #00ff80, #00ffff, #0080ff,
    #0000ff, #8000ff, #ff00ff, #ff0080,
    #ff0000
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbowShift 3s linear infinite;
}

@keyframes rainbowShift {
  to { background-position: 200% center; }
}`,
  tags: ['rainbow', 'spectrum', 'animated', 'colorful', 'pride'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Sunset Text Gradient - Warm sunset colors
 */
export const sunsetTextGradient: RoyCSSEffect = {
  id: 'sunset-text-gradient',
  name: 'Sunset Text Gradient',
  category: 'text',
  subCategory: 'gradient',
  description: 'Warm sunset-inspired text gradient',
  css: `.sunset-text-gradient {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['sunset', 'warm', 'orange', 'pink', 'golden'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Ocean Text Gradient - Cool blue tones
 */
export const oceanTextGradient: RoyCSSEffect = {
  id: 'ocean-text-gradient',
  name: 'Ocean Text Gradient',
  category: 'text',
  subCategory: 'gradient',
  description: 'Cool ocean/water blue text gradient',
  css: `.ocean-text-gradient {
  background: linear-gradient(135deg, #667eea 0%, #00d4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['ocean', 'blue', 'water', 'cool', 'fresh'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Metallic Text Gradient - Silver/gold metallic
 */
export const metallicTextGradient: RoyCSSEffect = {
  id: 'metallic-text-gradient',
  name: 'Metallic Text Gradient',
  category: 'text',
  subCategory: 'gradient',
  description: 'Realistic metallic gold or silver text',
  css: `.metallic-text-gradient {
  background: linear-gradient(
    135deg,
    #bf953f 0%,
    #fcf6ba 25%,
    #b38728 50%,
    #fbf5b7 75%,
    #aa771c 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['metallic', 'gold', 'silver', 'premium', 'luxury'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Animated Gradient Text - Shifting colors
 */
export const animatedGradientText: RoyCSSEffect = {
  id: 'animated-gradient-text',
  name: 'Animated Gradient Text',
  category: 'text',
  subCategory: 'gradient',
  description: 'Text with continuously shifting gradient colors',
  css: `.animated-gradient-text {
  background: linear-gradient(
    -45deg,
    #ee7752,
    #e73c7e,
    #23a6d5,
    #23d5ab,
    #ee7752
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: animatedGradientText 4s ease infinite;
}

@keyframes animatedGradientText {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`,
  tags: ['animated', 'shifting', 'dynamic', 'gradient', 'looping'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Striped Text - Horizontal stripes on text
 */
export const stripedText: RoyCSSEffect = {
  id: 'striped-text',
  name: 'Striped Text',
  category: 'text',
  subCategory: 'gradient',
  description: 'Text with horizontal stripe pattern',
  css: `.striped-text {
  background: repeating-linear-gradient(
    0deg,
    #3b82f6 0px,
    #3b82f6 10px,
    #ffffff 10px,
    #ffffff 20px
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
  tags: ['stripes', 'lines', 'pattern', 'retro', 'bold'],
  browserSupport: CLIP_TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// TEXT SHADOW EFFECTS
// ============================================================================

/**
 * Classic Text Shadow - Simple drop shadow
 */
export const classicTextShadow: RoyCSSEffect = {
  id: 'classic-text-shadow',
  name: 'Classic Text Shadow',
  category: 'text',
  subCategory: 'shadow',
  description: 'Simple classic text shadow for depth',
  css: `.classic-text-shadow {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}`,
  tags: ['shadow', 'classic', 'depth', 'simple', 'readable'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'offsetX', label: 'X Offset', description: 'Horizontal offset', type: 'number', defaultValue: 2 },
    { name: 'offsetY', label: 'Y Offset', description: 'Vertical offset', type: 'number', defaultValue: 2 },
    { name: 'blur', label: 'Blur', description: 'Blur radius', type: 'number', defaultValue: 4 },
  ],
};

/**
 * Long Shadow - Extended shadow effect
 */
export const longTextShadow: RoyCSSEffect = {
  id: 'long-text-shadow',
  name: 'Long Text Shadow',
  category: 'text',
  subCategory: 'shadow',
  description: 'Dramatic long shadow extending at an angle',
  css: `.long-text-shadow {
  text-shadow: 
    1px 1px 0 #ccc,
    2px 2px 0 #c9c9c9,
    3px 3px 0 #bbb,
    4px 4px 0 #b9b9b9,
    5px 5px 0 #aaa,
    6px 6px 1px rgba(0,0,0,.1),
    0 0 5px rgba(0,0,0,.1),
    1px 1px 3px rgba(0,0,0,.3);
}`,
  tags: ['long-shadow', 'dramatic', 'vintage', 'retro', '3d'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Neon Glow Text - Glowing neon effect
 */
export const neonGlowText: RoyCSSEffect = {
  id: 'neon-glow-text',
  name: 'Neon Glow Text',
  category: 'text',
  subCategory: 'neon',
  description: 'Bright neon sign glow effect on text',
  css: `.neon-glow-text {
  color: #fff;
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #ff00de,
    0 0 40px #ff00de,
    0 0 80px #ff00de;
  font-weight: bold;
}`,
  tags: ['neon', 'glow', 'cyberpunk', 'bright', 'sign'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'glowColor', label: 'Glow Color', description: 'Neon glow color', type: 'color', defaultValue: '#ff00de' },
  ],
};

/**
 * Multi-Layer Shadow - Rich layered shadow
 */
export const multiLayerTextShadow: RoyCSSEffect = {
  id: 'multi-layer-text-shadow',
  name: 'Multi-Layer Text Shadow',
  category: 'text',
  subCategory: 'shadow',
  description: 'Multiple layered shadows for rich depth',
  css: `.multi-layer-text-shadow {
  color: #1a1a2e;
  text-shadow:
    1px 1px 0 #16213e,
    2px 2px 0 #0f3460,
    3px 3px 0 #e94560;
}`,
  tags: ['multi-layer', 'layered', 'depth', '3d', 'rich'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Inset Shadow - Inner text shadow (engraved)
 */
export const insetTextShadow: RoyCSSEffect = {
  id: 'inset-text-shadow',
  name: 'Inset Text Shadow',
  category: 'text',
  subCategory: 'shadow',
  description: 'Engraved/inner shadow text effect',
  css: `.inset-text-shadow {
  background: #4a4a4a;
  color: transparent;
  text-shadow:
    -1px -1px 2px rgba(255, 255, 255, 0.3),
    1px 1px 2px rgba(0, 0, 0, 0.8);
  -webkit-background-clip: text;
  background-clip: text;
}`,
  tags: ['inset', 'engraved', 'inner', 'recessed', '3d'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Retro Text Shadow - Vintage 70s style
 */
export const retroTextShadow: RoyCSSEffect = {
  id: 'retro-text-shadow',
  name: 'Retro Text Shadow',
  category: 'text',
  subCategory: 'shadow',
  description: 'Vintage retro 70s/80s style text shadow',
  css: `.retro-text-shadow {
  color: #f7ce3b;
  text-shadow:
    3px 3px 0 #e36414,
    6px 6px 0 #b83a18;
  font-family: Impact, sans-serif;
  font-weight: bold;
  letter-spacing: 2px;
}`,
  tags: ['retro', 'vintage', '70s', '80s', 'comic', 'fun'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Soft Glow - Subtle luminous effect
 */
export const softGlowText: RoyCSSEffect = {
  id: 'soft-glow-text',
  name: 'Soft Glow Text',
  category: 'text',
  subCategory: 'shadow',
  description: 'Soft subtle glowing text effect',
  css: `.soft-glow-text {
  color: #fff;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(255, 255, 255, 0.6),
    0 0 30px rgba(255, 255, 255, 0.4);
}`,
  tags: ['soft-glow', 'luminous', 'subtle', 'ethereal', 'light'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Fire Text - Burning flame effect
 */
export const fireText: RoyCSSEffect = {
  id: 'fire-text',
  name: 'Fire Text',
  category: 'text',
  subCategory: 'shadow',
  description: 'Burning fire/flame text effect',
  css: `.fire-text {
  color: #ffeb3b;
  text-shadow:
    0 0 5px #ff5722,
    0 0 10px #ff5722,
    0 0 20px #ff5722,
    0 0 40px #f44336,
    0 0 80px #f44336;
  animation: fireFlicker 0.5s ease-in-out infinite alternate;
}

@keyframes fireFlicker {
  from { opacity: 1; }
  to { opacity: 0.85; }
}`,
  tags: ['fire', 'flame', 'burning', 'hot', 'intense'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Ice Text - Frozen ice effect
 */
export const iceText: RoyCSSEffect = {
  id: 'ice-text',
  name: 'Ice Text',
  category: 'text',
  subCategory: 'shadow',
  description: 'Cold frozen ice text effect',
  css: `.ice-text {
  color: #e0f7fa;
  text-shadow:
    0 0 5px #00bcd4,
    0 0 10px #00bcd4,
    0 0 20px #00bcd4,
    0 0 40px #0097a7,
    0 0 80px #0097a7;
}`,
  tags: ['ice', 'frozen', 'cold', 'blue', 'crystal'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// TYPOGRAPHY EFFECTS
// ============================================================================

/**
 * Typewriter Effect - Character by character reveal
 */
export const typewriterEffect: RoyCSSEffect = {
  id: 'typewriter-effect',
  name: 'Typewriter Effect',
  category: 'text',
  subCategory: 'typewriter',
  description: 'Text appears character by character like typing',
  css: `.typewriter-effect {
  overflow: hidden;
  white-space: nowrap;
  border-right: 3px solid currentColor;
  animation: 
    typing 3.5s steps(40, end),
    blinkCaret 0.75s step-end infinite;
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blinkCaret {
  from, to { border-color: transparent; }
  50% { border-color: currentColor; }
}`,
  tags: ['typewriter', 'typing', 'cursor', 'reveal', 'code'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'steps', label: 'Steps', description: 'Number of typing steps', type: 'number', defaultValue: 40 },
    { name: 'duration', label: 'Duration', description: 'Typing duration', type: 'time', defaultValue: '3.5s' },
  ],
};

/**
 * Typewriter Loop - Continuous loop typing
 */
export const typewriterLoop: RoyCSSEffect = {
  id: 'typewriter-loop',
  name: 'Typewriter Loop',
  category: 'text',
  subCategory: 'typewriter',
  description: 'Typing effect that loops infinitely',
  css: `.typewriter-loop {
  overflow: hidden;
  white-space: nowrap;
  border-right: 3px solid currentColor;
  animation: 
    typingLoop 4s steps(40) infinite,
    blinkCaret 0.75s step-end infinite;
}

@keyframes typingLoop {
  0%, 90%, 100% { width: 0; }
  30%, 60% { width: 100%; }
}

@keyframes blinkCaret {
  from, to { border-color: transparent; }
  50% { border-color: currentColor; }
}`,
  tags: ['typewriter', 'loop', 'infinite', 'typing', 'animation'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Text Reveal - Fade in word by word
 */
export const textReveal: RoyCSSEffect = {
  id: 'text-reveal',
  name: 'Text Reveal',
  category: 'text',
  subCategory: 'typewriter',
  description: 'Words fade in sequentially for dramatic reveal',
  css: `.text-reveal span {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: wordReveal 0.5s ease forwards;
}

.text-reveal span:nth-child(1) { animation-delay: 0.1s; }
.text-reveal span:nth-child(2) { animation-delay: 0.2s; }
.text-reveal span:nth-child(3) { animation-delay: 0.3s; }
.text-reveal span:nth-child(4) { animation-delay: 0.4s; }
.text-reveal span:nth-child(5) { animation-delay: 0.5s; }

@keyframes wordReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  tags: ['reveal', 'words', 'sequential', 'fade-in', 'dramatic'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Letter Spacing Animation - Letters spread out
 */
export const letterSpacingAnimation: RoyCSSEffect = {
  id: 'letter-spacing-animation',
  name: 'Letter Spacing Animation',
  category: 'text',
  subCategory: 'typewriter',
  description: 'Letters animate their spacing dynamically',
  css: `.letter-spacing-animation {
  animation: letterSpacingPulse 2s ease-in-out infinite alternate;
}

@keyframes letterSpacingPulse {
  from { letter-spacing: 0; }
  to { letter-spacing: 10px; }
}`,
  tags: ['letter-spacing', 'spread', 'breathing', 'dynamic'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'maxSpacing', label: 'Max Spacing', description: 'Maximum spacing', type: 'length', defaultValue: 10, unit: 'px' },
  ],
};

// ============================================================================
// GLITCH EFFECTS
// ============================================================================

/**
 * Glitch Text - Digital distortion effect
 */
export const glitchText: RoyCSSEffect = {
  id: 'glitch-text',
  name: 'Glitch Text',
  category: 'text',
  subCategory: 'glitch',
  description: 'Digital glitch/distortion text effect',
  css: `.glitch-text {
  position: relative;
  animation: glitchSkew 1s infinite linear alternate-reverse;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  left: 2px;
  text-shadow: -2px 0 #ff00ff;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitchAnim 5s infinite linear alternate-reverse;
}

.glitch-text::after {
  left: -2px;
  text-shadow: -2px 0 #00ffff;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitchAnim2 5s infinite linear alternate-reverse;
}

@keyframes glitchAnim {
  0% { clip: rect(31px, 9999px, 94px, 0); }
  5% { clip: rect(70px, 9999px, 71px, 0); }
  10% { clip: rect(29px, 9999px, 24px, 0); }
  /* ... more keyframes ... */
  100% { clip: rect(15px, 9999px, 86px, 0); }
}

@keyframes glitchAnim2 {
  0% { clip: rect(65px, 9999px, 119px, 0); }
  5% { clip: rect(11px, 9999px, 29px, 0); }
  10% { clip: rect(58px, 9999px, 68px, 0); }
  /* ... more keyframes ... */
  100% { clip: rect(91px, 9999px, 98px, 0); }
}

@keyframes glitchSkew {
  0% { transform: skew(0deg); }
  20% { transform: skew(-1deg); }
  40% { transform: skew(1deg); }
  60% { transform: skew(-0.5deg); }
  80% { transform: skew(0.5deg); }
  100% { transform: skew(0deg); }
}`,
  tags: ['glitch', 'digital', 'distortion', 'cyberpunk', 'error'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Glitch Hover - Glitch on hover only
 */
export const glitchHover: RoyCSSEffect = {
  id: 'glitch-hover',
  name: 'Glitch Hover',
  category: 'text',
  subCategory: 'glitch',
  description: 'Glitch effect that triggers on hover',
  css: `.glitch-hover {
  position: relative;
}

.glitch-hover::before,
.glitch-hover::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.glitch-hover:hover::before {
  animation: glitchHover1 0.3s linear;
  opacity: 1;
  left: 2px;
  text-shadow: -2px 0 #ff0000;
}

.glitch-hover:hover::after {
  animation: glitchHover2 0.3s linear;
  opacity: 1;
  left: -2px;
  text-shadow: 2px 0 #00ff00;
}

@keyframes glitchHover1 {
  0% { clip: inset(20% 0 60% 0); }
  100% { clip: inset(50% 0 30% 0); }
}

@keyframes glitchHover2 {
  0% { clip: inset(60% 0 20% 0); }
  100% { clip: inset(30% 0 50% 0); }
}`,
  tags: ['glitch', 'hover', 'interactive', 'digital', 'effect'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Scanlines Effect - CRT monitor lines
 */
export const scanlinesEffect: RoyCSSEffect = {
  id: 'scanlines-effect',
  name: 'Scanlines Effect',
  category: 'text',
  subCategory: 'glitch',
  description: 'CRT monitor scanline overlay on text',
  css: `.scanlines-container {
  position: relative;
}

.scanlines-effect {
  position: relative;
}

.scanlines-container::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 2px,
    rgba(0, 0, 0, 0.15) 4px
  );
  pointer-events: none;
}`,
  tags: ['scanlines', 'crt', 'monitor', 'retro', 'tv'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// NEON EFFECTS
// ============================================================================

/**
 * Neon Sign - Complete neon sign look
 */
export const neonSign: RoyCSSEffect = {
  id: 'neon-sign',
  name: 'Neon Sign',
  category: 'text',
  subCategory: 'neon',
  description: 'Complete neon sign with tube and glow effect',
  css: `.neon-sign {
  font-size: 48px;
  font-family: 'Arial Black', sans-serif;
  color: #fff;
  text-transform: uppercase;
  padding: 20px 40px;
  border: 4px solid #fff;
  border-radius: 8px;
  position: relative;
  
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #fff,
    0 0 40px #0ff,
    0 0 80px #0ff;
  
  box-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #0ff,
    0 0 40px #0ff,
    inset 0 0 10px #0ff;
  
  animation: neonFlicker 1.5s infinite alternate;
}

@keyframes neonFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    text-shadow:
      0 0 5px #fff,
      0 0 10px #fff,
      0 0 20px #0ff,
      0 0 40px #0ff;
  }
  20%, 24%, 55% {
    text-shadow: none;
  }
}`,
  tags: ['neon', 'sign', 'tube', 'flicker', 'complete'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [
    { name: 'neonColor', label: 'Neon Color', description: 'Glow color', type: 'color', defaultValue: '#0ff' },
  ],
};

/**
 * Neon Pink - Pink neon variant
 */
export const neonPink: RoyCSSEffect = {
  id: 'neon-pink',
  name: 'Neon Pink',
  category: 'text',
  subCategory: 'neon',
  description: 'Vibrant pink neon glow effect',
  css: `.neon-pink {
  color: #fff;
  font-weight: bold;
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #ff006e,
    0 0 40px #ff006e,
    0 0 80px #ff006e;
}`,
  tags: ['neon', 'pink', 'magenta', 'vibrant', 'glow'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Neon Green - Matrix-style green
 */
export const neonGreen: RoyCSSEffect = {
  id: 'neon-green',
  name: 'Neon Green',
  category: 'text',
  subCategory: 'neon',
  description: 'Matrix/hacker green neon effect',
  css: `.neon-green {
  color: #39ff14;
  font-family: 'Courier New', monospace;
  text-shadow:
    0 0 5px #39ff14,
    0 0 10px #39ff14,
    0 0 20px #39ff14,
    0 0 40px #39ff14;
}`,
  tags: ['neon', 'green', 'matrix', 'hacker', 'terminal'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Neon Blue - Electric blue neon
 */
export const neonBlue: RoyCSSEffect = {
  id: 'neon-blue',
  name: 'Neon Blue',
  category: 'text',
  subCategory: 'neon',
  description: 'Electric blue neon glow effect',
  css: `.neon-blue {
  color: #fff;
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #0073ff,
    0 0 40px #0073ff,
    0 0 80px #0073ff;
}`,
  tags: ['neon', 'blue', 'electric', 'tech', 'digital'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// OUTLINE / STROKE EFFECTS
// ============================================================================

/**
 * Stroke Text - Outlined/stroke text
 */
export const strokeText: RoyCSSEffect = {
  id: 'stroke-text',
  name: 'Stroke Text',
  category: 'text',
  subCategory: 'outline',
  description: 'Text with outline/stroke only (hollow)',
  css: `.stroke-text {
  color: transparent;
  -webkit-text-stroke: 2px #333;
  text-stroke: 2px #333;
}`,
  tags: ['stroke', 'outline', 'hollow', 'border', 'wireframe'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'strokeWidth', label: 'Stroke Width', description: 'Outline thickness', type: 'number', defaultValue: 2, min: 1, max: 5 },
    { name: 'strokeColor', label: 'Stroke Color', description: 'Outline color', type: 'color', defaultValue: '#333' },
  ],
};

/**
 * Gradient Stroke - Colored stroke text
 */
export const gradientStrokeText: RoyCSSEffect = {
  id: 'gradient-stroke-text',
  name: 'Gradient Stroke Text',
  category: 'text',
  subCategory: 'outline',
  description: 'Text with gradient-colored stroke/outline',
  css: `.gradient-stroke-text {
  color: transparent;
  background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 3px transparent;
  paint-order: stroke fill;
}`,
  tags: ['stroke', 'gradient', 'rainbow', 'outline', 'colored'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Double Outline - Double line text border
 */
export const doubleOutlineText: RoyCSSEffect = {
  id: 'double-outline-text',
  name: 'Double Outline Text',
  category: 'text',
  subCategory: 'outline',
  description: 'Double outlined text with two borders',
  css: `.double-outline-text {
  color: #fff;
  text-shadow:
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    2px 2px 0 #000,
    -4px -4px 0 #ff0,
    4px -4px 0 #ff0,
    -4px 4px 0 #ff0,
    4px 4px 0 #ff0;
}`,
  tags: ['double', 'outline', 'border', 'thick', 'comic'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// DECORATIVE TEXT EFFECTS
// ============================================================================

/**
 * Underline Decoration - Animated underline
 */
export const underlineDecoration: RoyCSSEffect = {
  id: 'underline-decoration',
  name: 'Underline Decoration',
  category: 'text',
  subCategory: 'outline',
  description: 'Decorative animated underline on text',
  css: `.underline-decoration {
  position: relative;
  display: inline-block;
}

.underline-decoration::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff);
  border-radius: 2px;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.underline-decoration:hover::after {
  transform: scaleX(1);
}`,
  tags: ['underline', 'decoration', 'animated', 'hover', 'accent'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Highlight Marker - Highlighter pen effect
 */
export const highlightMarker: RoyCSSEffect = {
  id: 'highlight-marker',
  name: 'Highlight Marker',
  category: 'text',
  subCategory: 'outline',
  description: 'Text highlighted with marker pen effect',
  css: `.highlight-marker {
  background: linear-gradient(
    180deg,
    transparent 50%,
    rgba(255, 255, 0, 0.5) 50%
  );
  background-size: 100% 200%;
  transition: background-position 0.3s ease;
}

.highlight-marker:hover {
  background-position: 0 100%;
}`,
  tags: ['highlight', 'marker', 'yellow', 'emphasis', 'note'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Strike Through - Decorative strikethrough
 */
export const strikeThroughDecoration: RoyCSSEffect = {
  id: 'strike-through-decoration',
  name: 'Strike Through Decoration',
  category: 'text',
  subCategory: 'outline',
  description: 'Stylized decorative strikethrough effect',
  css: `.strike-through-decoration {
  position: relative;
  display: inline-block;
}

.strike-through-decoration::before {
  content: '';
  position: absolute;
  left: -5%;
  top: 50%;
  width: 110%;
  height: 3px;
  background: #ef4444;
  transform: rotate(-2deg);
}

.strike-through-decoration::after {
  content: '';
  position: absolute;
  left: -5%;
  top: 52%;
  width: 110%;
  height: 2px;
  background: #ef4444;
  transform: rotate(2deg);
}`,
  tags: ['strikethrough', 'strike', 'delete', 'decorative', 'hand-drawn'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Superscript/Subscript Style - Elevated/lowered text
 */
export const superscriptStyle: RoyCSSEffect = {
  id: 'superscript-style',
  name: 'Superscript Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Superscript styled text element',
  css: `.superscript-style {
  vertical-align: super;
  font-size: 0.7em;
  line-height: 0;
  color: #6b7280;
}`,
  tags: ['superscript', 'small', 'raised', 'note', 'reference'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Small Caps - Small capital letters
 */
export const smallCapsStyle: RoyCSSEffect = {
  id: 'small-caps-style',
  name: 'Small Caps Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Small caps typography styling',
  css: `.small-caps-style {
  font-variant: small-caps;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}`,
  tags: ['small-caps', 'caps', 'uppercase', 'elegant', 'typography'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Drop Cap - Large initial letter
 */
export const dropCapStyle: RoyCSSEffect = {
  id: 'drop-cap-style',
  name: 'Drop Cap Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Large decorative first letter (drop cap)',
  css: `.drop-cap-style::first-letter {
  float: left;
  font-size: 4em;
  line-height: 0.9;
  margin: 0 0.1em 0.15em 0;
  font-weight: bold;
  color: #3b82f6;
}`,
  tags: ['drop-cap', 'initial', 'first-letter', 'editorial', 'magazine'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Truncated Text - Ellipsis overflow
 */
export const truncatedTextStyle: RoyCSSEffect = {
  id: 'truncated-text-style',
  name: 'Truncated Text Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Text that truncates with ellipsis when overflowing',
  css: `.truncated-text-style {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}`,
  tailwind: 'truncate max-w-[300px]',
  tags: ['truncate', 'ellipsis', 'overflow', 'single-line'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'maxWidth', label: 'Max Width', description: 'Maximum width before truncation', type: 'length', defaultValue: 300, unit: 'px' },
  ],
};

/**
 * Line Clamp - Multi-line truncation
 */
export const lineClampStyle: RoyCSSEffect = {
  id: 'line-clamp-style',
  name: 'Line Clamp Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Truncate text after specified number of lines',
  css: `.line-clamp-style {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}`,
  tailwind: 'line-clamp-3',
  tags: ['clamp', 'truncate', 'multi-line', 'ellipsis', 'limit'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'lines', label: 'Lines', description: 'Number of lines to show', type: 'number', defaultValue: 3, min: 1, max: 10 },
  ],
};

/**
 * Word Break - Force word wrapping
 */
export const wordBreakStyle: RoyCSSEffect = {
  id: 'word-break-style',
  name: 'Word Break Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Handle long words and URLs properly',
  css: `.word-break-style {
  word-break: break-word;
  overflow-wrap: break-word;
}`,
  tags: ['word-break', 'wrap', 'url', 'long-word', 'responsive'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Uppercase Style - All caps with tracking
 */
export const uppercaseStyle: RoyCSSEffect = {
  id: 'uppercase-style',
  name: 'Uppercase Style',
  category: 'text',
  subCategory: 'outline',
  description: 'Uppercase text with increased letter spacing',
  css: `.uppercase-style {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}`,
  tailwind: 'uppercase tracking-wider font-semibold',
  tags: ['uppercase', 'caps', 'heading', 'label', 'button'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Number Counter - Animated number display
 */
export const numberCounterStyle: RoyCSSEffect = {
  id: 'number-counter-style',
  name: 'Number Counter Style',
  category: 'text',
  subCategory: 'typewriter',
  description: 'Styled number/stat counter display',
  css: `.number-counter-style {
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #1f2937;
  line-height: 1;
}

.number-counter-suffix {
  font-size: 24px;
  font-weight: 500;
  color: #6b7280;
  margin-left: 4px;
}`,
  tabular-nums: '',
  tags: ['counter', 'number', 'statistic', 'metric', 'display'],
  browserSupport: TEXT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Text Effects
// ============================================================================

/**
 * Complete array of all text effects
 */
export const textEffects: RoyCSSEffect[] = [
  // Text Gradients
  basicTextGradient, rainbowTextGradient, sunsetTextGradient,
  oceanTextGradient, metallicTextGradient, animatedGradientText,
  stripedText,

  // Text Shadows
  classicTextShadow, longTextShadow, neonGlowText,
  multiLayerTextShadow, insetTextShadow, retroTextShadow,
  softGlowText, fireText, iceText,

  // Typography Effects
  typewriterEffect, typewriterLoop, textReveal,
  letterSpacingAnimation,

  // Glitch Effects
  glitchText, glitchHover, scanlinesEffect,

  // Neon Effects
  neonSign, neonPink, neonGreen, neonBlue,

  // Outline/Stroke Effects
  strokeText, gradientStrokeText, doubleOutlineText,

  // Decorative Effects
  underlineDecoration, highlightMarker, strikeThroughDecoration,
  superscriptStyle, smallCapsStyle, dropCapStyle,
  truncatedTextStyle, lineClampStyle, wordBreakStyle,
  uppercaseStyle, numberCounterStyle,
];

export default textEffects;
