/**
 * ROYCSS Overlay Components
 * @module roycss/ui/overlay
 * @description Export all overlay components
 */

// Existing overlay components
export { Modal } from './overlay-legacy';
export type { ModalProps } from './overlay-legacy';

export { Drawer } from './overlay-legacy';
export type { DrawerProps } from './overlay-legacy';

export { ToastContainer } from './overlay-legacy';
export type { ToastContainerProps } from './overlay-legacy';

export { Popover } from './overlay-legacy';
export type { PopoverProps } from './overlay-legacy';

export { Tooltip } from './overlay-legacy';
export type { TooltipProps } from './overlay-legacy';

// New overlay components
export {
  Sheet,
  SheetTrigger,
  SheetComponents,
} from './Sheet';
export type {
  SheetProps,
  SheetTriggerProps,
  SheetSide,
  SheetSize,
} from './Sheet';

// Re-export default
export { default as ModalDefault } from './overlay-legacy';
