/**
 * ROYCSS Animation Configurations
 * 
 * Shared animation configurations for consistent motion design.
 * Uses Framer Motion compatible values and CSS keyframes.
 */

import { tokens } from './tokens';

// Animation duration presets
export const durations = {
  instant: 100,
  fast: 150,
  base: 200,
  slow: 300,
  slower: 500,
  verySlow: 750,
  snail: 1000,
} as const;

// Easing curves
export const easings = {
  // Standard
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Deceleration (entrance)
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  
  // Acceleration (exit)
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  
  // Spring-like
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  springGentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Bounce
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Emphasis
  emphasis: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// Framer Motion transition presets
export const transitions = {
  fast: {
    duration: durations.fast / 1000,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  base: {
    duration: durations.base / 1000,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  slow: {
    duration: durations.slow / 1000,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  springBouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 15,
  },
  springGentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
  },
} as const;

// Animation variants for common patterns
export const variants = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  fadeInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  
  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  scaleInBig: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  
  // Slide animations
  slideUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
  slideDown: {
    initial: { y: '-100%' },
    animate: { y: 0 },
    exit: { y: '-100%' },
  },
  slideLeft: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  slideRight: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },

  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
} as const;

// CSS Keyframe definitions (for non-Framer Motion usage)
export const keyframes = {
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  ping: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '75%, 100%': { transform: 'scale(2)', opacity: '0' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  bounce: {
    '0%, 100%': {
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': {
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  gradientShift: {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  glow: {
    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
    '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
  },
  slideUpFade: {
    from: { opacity: '0', transform: 'translateY(20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
} as const;

// Animation utility classes (for direct use in className)
export const animationClasses = {
  // Entrance animations
  'animate-fade-in': 'animate-fade-in',
  'animate-fade-in-up': 'animate-fade-in-up',
  'animate-fade-in-down': 'animate-fade-in-down',
  'animate-scale-in': 'animate-scale-in',
  'animate-slide-up': 'animate-slide-up',
  'animate-slide-down': 'animate-slide-down',
  
  // Loading states
  'animate-spin': 'animate-spin',
  'animate-pulse': 'animate-pulse',
  'animate-ping': 'animate-ping',
  'animate-bounce': 'animate-bounce',
  
  // Decorative
  'animate-shimmer': 'animate-shimmer',
  'animate-gradient-shift': 'animate-gradient-shift',
  'animate-float': 'animate-float',
  'animate-glow': 'animate-glow',
} as const;

/**
 * Generate CSS for custom animations
 */
export function generateAnimationCSS(): string {
  return `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    
    @keyframes slide-down {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
    }

    .animate-fade-in {
      animation: fade-in ${durations.base}ms ${easings.easeOut} both;
    }
    
    .animate-fade-in-up {
      animation: fade-in-up ${durations.slow}ms ${easings.easeOut} both;
    }
    
    .animate-fade-in-down {
      animation: fade-in-down ${durations.slow}ms ${easings.easeOut} both;
    }
    
    .animate-scale-in {
      animation: scale-in ${durations.base}ms ${easings.spring} both;
    }
    
    .animate-slide-up {
      animation: slide-up ${durations.slow}ms ${easings.decelerate} both;
    }
    
    .animate-slide-down {
      animation: slide-down ${durations.slow}ms ${easings.decelerate} both;
    }
    
    .animate-shimmer {
      background-size: 200% 100%;
      animation: shimmer 2s ${easings.linear} infinite;
    }
    
    .animate-gradient-shift {
      background-size: 200% 200%;
      animation: gradient-shift 3s ease infinite;
    }
    
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    
    .animate-glow {
      animation: glow 2s ease-in-out infinite;
    }
  `;
}

export default {
  durations,
  easings,
  transitions,
  variants,
  keyframes,
  animationClasses,
};
