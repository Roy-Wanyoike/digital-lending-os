/**
 * ROYCSS Component Registry
 * @module roycss/components/registry
 * @description Register and lookup all components
 */

import {
  RoyCSSComponent,
  ComponentCategory,
  CATEGORIES,
  CategoryInfo,
  A11yFeature,
} from './types';

// ============================================================================
// Form Components
// ============================================================================

const formComponents: RoyCSSComponent[] = [
  {
    name: 'text-input',
    displayName: 'Text Input',
    category: 'form',
    description: 'Input field with label, error states, validation, and icon support.',
    props: [
      { name: 'label', type: 'string', required: false, description: 'Input label' },
      { name: 'value', type: 'string', required: true, description: 'Input value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'error', type: 'string', required: false, description: 'Error message' },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disabled state' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'type', type: '"text" | "email" | "password"', required: false, defaultValue: '"text"', description: 'Input type' },
      { name: 'leftIcon', type: 'ReactNode', required: false, description: 'Left icon element' },
      { name: 'rightIcon', type: 'ReactNode', required: false, description: 'Right icon element' },
    ],
    variants: ['default', 'error', 'success', 'with-icons'],
    filePath: 'src/components/roycss/ui/form/TextInput.tsx',
    importPath: '@/components/roycss/ui/form/TextInput',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'text-area',
    displayName: 'Text Area',
    category: 'form',
    description: 'Multi-line text input with character count and auto-resize.',
    props: [
      { name: 'label', type: 'string', required: false, description: 'Textarea label' },
      { name: 'value', type: 'string', required: true, description: 'Textarea value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'rows', type: 'number', required: false, defaultValue: '4', description: 'Number of rows' },
      { name: 'maxLength', type: 'number', required: false, description: 'Max characters' },
      { name: 'showCount', type: 'boolean', required: false, defaultValue: 'false', description: 'Show char count' },
      { name: 'resize', type: '"none" | "vertical" | "horizontal"', required: false, defaultValue: '"vertical"', description: 'Resize behavior' },
    ],
    variants: ['default', 'error', 'success', 'with-counter'],
    filePath: 'src/components/roycss/ui/form/TextArea.tsx',
    importPath: '@/components/roycss/ui/form/TextArea',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels'],
  },
  {
    name: 'select-input',
    displayName: 'Select Input',
    category: 'form',
    description: 'Dropdown select with search/filter functionality.',
    props: [
      { name: 'options', type: 'SelectOption[]', required: true, description: 'Available options' },
      { name: 'value', type: 'string', required: true, description: 'Selected value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'searchable', type: 'boolean', required: false, defaultValue: 'false', description: 'Enable search' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' },
      { name: 'emptyMessage', type: 'string', required: false, description: 'Empty state message' },
    ],
    variants: ['default', 'searchable', 'error', 'success'],
    filePath: 'src/components/roycss/ui/form/SelectInput.tsx',
    importPath: '@/components/roycss/ui/form/SelectInput',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'focus-management', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'checkbox-group',
    displayName: 'Checkbox Group',
    category: 'form',
    description: 'Group of checkboxes with multiple selection support.',
    props: [
      { name: 'options', type: 'CheckboxOption[]', required: true, description: 'Checkbox options' },
      { name: 'value', type: 'string[]', required: true, description: 'Selected values' },
      { name: 'onChange', type: '(values: string[]) => void', required: true, description: 'Change handler' },
      { name: 'orientation', type: '"horizontal" | "vertical"', required: false, defaultValue: '"vertical"', description: 'Layout direction' },
      { name: 'variant', type: '"default" | "card" | "toggle"', required: false, defaultValue: '"default"', description: 'Display style' },
      { name: 'maxSelections', type: 'number', required: false, description: 'Max selections allowed' },
    ],
    variants: ['default', 'card', 'toggle', 'horizontal'],
    filePath: 'src/components/roycss/ui/form/CheckboxGroup.tsx',
    importPath: '@/components/roycss/ui/form/CheckboxGroup',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'radio-group',
    displayName: 'Radio Group',
    category: 'form',
    description: 'Radio buttons for single selection with custom styling.',
    props: [
      { name: 'options', type: 'RadioOption[]', required: true, description: 'Radio options' },
      { name: 'value', type: 'string', required: true, description: 'Selected value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'orientation', type: '"horizontal" | "vertical"', required: false, defaultValue: '"vertical"', description: 'Layout direction' },
      { name: 'variant', type: '"default" | "card" | "button"', required: false, defaultValue: '"default"', description: 'Display style' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Size variant' },
    ],
    variants: ['default', 'card', 'button', 'horizontal'],
    filePath: 'src/components/roycss/ui/form/RadioGroup.tsx',
    importPath: '@/components/roycss/ui/form/RadioGroup',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'toggle-switch',
    displayName: 'Toggle Switch',
    category: 'form',
    description: 'On/off toggle switch with loading state.',
    props: [
      { name: 'checked', type: 'boolean', required: true, description: 'Checked state' },
      { name: 'onChange', type: '(checked: boolean) => void', required: true, description: 'Change handler' },
      { name: 'label', type: 'string', required: false, description: 'Toggle label' },
      { name: 'description', type: 'string', required: false, description: 'Description text' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Size variant' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' },
      { name: 'labelPosition', type: '"left" | "right" | "top" | "bottom"', required: false, defaultValue: '"right"', description: 'Label position' },
    ],
    variants: ['default', 'small', 'large', 'with-label-left', 'loading'],
    filePath: 'src/components/roycss/ui/form/ToggleSwitch.tsx',
    importPath: '@/components/roycss/ui/form/ToggleSwitch',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'search-input',
    displayName: 'Search Input',
    category: 'form',
    description: 'Search input with debounce functionality.',
    props: [
      { name: 'value', type: 'string', required: true, description: 'Search value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'onSearch', type: '(value: string) => void', required: false, description: 'Submit handler' },
      { name: 'debounceMs', type: 'number', required: false, defaultValue: '300', description: 'Debounce delay (ms)' },
      { name: 'clearable', type: 'boolean', required: false, defaultValue: 'true', description: 'Show clear button' },
      { name: 'showButton', type: 'boolean', required: false, defaultValue: 'false', description: 'Show search button' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' },
    ],
    variants: ['default', 'with-button', 'loading', 'compact'],
    filePath: 'src/components/roycss/ui/form/SearchInput.tsx',
    importPath: '@/components/roycss/ui/form/SearchInput',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'date-picker',
    displayName: 'Date Picker',
    category: 'form',
    description: 'Date selection component with calendar view.',
    props: [
      { name: 'value', type: 'Date | null', required: true, description: 'Selected date' },
      { name: 'onChange', type: '(date: Date | null) => void', required: true, description: 'Change handler' },
      { name: 'minDate', type: 'Date', required: false, description: 'Minimum selectable date' },
      { name: 'maxDate', type: 'Date', required: false, description: 'Maximum selectable date' },
      { name: 'format', type: 'string', required: false, defaultValue: '"MM/dd/yyyy"', description: 'Display format' },
    ],
    variants: ['default', 'range', 'time', 'inline'],
    filePath: 'src/components/roycss/ui/form/DatePicker.tsx',
    importPath: '@/components/roycss/ui/form/DatePicker',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'focus-management', 'aria-labels'],
  },
  {
    name: 'file-upload',
    displayName: 'File Upload',
    category: 'form',
    description: 'Drag-and-drop file upload with preview.',
    props: [
      { name: 'onFilesSelected', type: '(files: File[]) => void', required: true, description: 'Files selected handler' },
      { name: 'accept', type: 'string', required: false, description: 'Accepted file types' },
      { name: 'maxSize', type: 'number', required: false, description: 'Max file size in bytes' },
      { name: 'multiple', type: 'boolean', required: false, defaultValue: 'false', description: 'Allow multiple files' },
      { name: 'maxFiles', type: 'number', required: false, description: 'Maximum files allowed' },
    ],
    variants: ['default', 'drag-active', 'error', 'with-preview'],
    filePath: 'src/components/roycss/ui/form/FileUpload.tsx',
    importPath: '@/components/roycss/ui/form/FileUpload',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'aria-labels'],
  },
  {
    name: 'form-wizard',
    displayName: 'Form Wizard',
    category: 'form',
    description: 'Multi-step form wizard with progress tracking.',
    props: [
      { name: 'steps', type: 'WizardStep[]', required: true, description: 'Wizard steps config' },
      { name: 'currentStep', type: 'number', required: true, description: 'Current step index' },
      { name: 'onStepChange', type: '(step: number) => void', required: true, description: 'Step change handler' },
      { name: 'onComplete', type: '(data: Record<string, unknown>) => void', required: false, description: 'Completion handler' },
      { name: 'showProgress', type: 'boolean', required: false, defaultValue: 'true', description: 'Show progress bar' },
    ],
    variants: ['default', 'vertical', 'numbered', 'with-validation'],
    filePath: 'src/components/roycss/ui/form/FormWizard.tsx',
    importPath: '@/components/roycss/ui/form/FormWizard',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'focus-management', 'aria-labels', 'semantic-html'],
  },
];

// ============================================================================
// Data Display Components
// ============================================================================

const dataDisplayComponents: RoyCSSComponent[] = [
  {
    name: 'data-table',
    displayName: 'Data Table',
    category: 'data-display',
    description: 'Sortable, filterable data table with pagination.',
    props: [
      { name: 'data', type: 'T[]', required: true, description: 'Table data' },
      { name: 'columns', type: 'Column<T>[]', required: true, description: 'Column definitions' },
      { name: 'rowKey', type: '(row: T) => string', required: true, description: 'Row key extractor' },
      { name: 'sortable', type: 'boolean', required: false, defaultValue: 'true', description: 'Enable sorting' },
      { name: 'filterable', type: 'boolean', required: false, defaultValue: 'true', description: 'Enable filtering' },
      { name: 'paginated', type: 'boolean', required: false, defaultValue: 'true', description: 'Enable pagination' },
      { name: 'selectable', type: 'boolean', required: false, defaultValue: 'false', description: 'Enable row selection' },
      { name: 'onRowClick', type: '(row: T) => void', required: false, description: 'Row click handler' },
    ],
    variants: ['default', 'striped', 'selectable', 'compact'],
    filePath: 'src/components/roycss/ui/data/DataTable.tsx',
    importPath: '@/components/roycss/ui/data/DataTable',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'screen-reader-support', 'semantic-html', 'aria-labels'],
  },
  {
    name: 'data-grid',
    displayName: 'Data Grid',
    category: 'data-display',
    description: 'Responsive grid layout for displaying cards or items.',
    props: [
      { name: 'data', type: 'T[]', required: true, description: 'Grid data' },
      { name: 'renderItem', type: '(item: T, index: number) => ReactNode', required: true, description: 'Item renderer' },
      { name: 'itemKey', type: '(item: T) => string', required: true, description: 'Item key extractor' },
      { name: 'columns', type: '{ sm?: number; md?: number; lg?: number }', required: false, description: 'Columns per breakpoint' },
      { name: 'gap', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Gap size' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' },
    ],
    variants: ['default', '2-col', '3-col', '4-col', 'loading'],
    filePath: 'src/components/roycss/ui/data/DataGrid.tsx',
    importPath: '@/components/roycss/ui/data/DataGrid',
    versionAdded: '1.0.0',
    a11yFeatures: ['semantic-html', 'aria-labels'],
  },
  {
    name: 'stat-card',
    displayName: 'Stat Card',
    category: 'data-display',
    description: 'Statistics display card with trend indicator.',
    props: [
      { name: 'title', type: 'string', required: true, description: 'Stat title' },
      { name: 'value', type: 'string | number', required: true, description: 'Main value' },
      { name: 'change', type: 'number', required: false, description: 'Change percentage' },
      { name: 'trend', type: '"up" | "down" | "neutral"', required: false, description: 'Trend direction' },
      { name: 'icon', type: 'ReactNode', required: false, description: 'Card icon' },
      { name: 'color', type: '"default" | "primary" | "success" | "warning"', required: false, defaultValue: '"default"', description: 'Color theme' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Card size' },
    ],
    variants: ['default', 'gradient', 'outlined', 'filled', 'small', 'large'],
    filePath: 'src/components/roycss/ui/data/StatCard.tsx',
    importPath: '@/components/roycss/ui/data/StatCard',
    versionAdded: '1.0.0',
    a11yFeatures: ['semantic-html', 'aria-labels', 'screen-reader-support'],
  },
  {
    name: 'avatar',
    displayName: 'Avatar',
    category: 'data-display',
    description: 'User avatar with fallback initials and status indicator.',
    props: [
      { name: 'src', type: 'string', required: false, description: 'Image source URL' },
      { name: 'fallback', type: 'string', required: false, description: 'Fallback text/initials' },
      { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', required: false, defaultValue: '"md"', description: 'Avatar size' },
      { name: 'shape', type: '"circle" | "square" | "rounded"', required: false, defaultValue: '"circle"', description: 'Shape' },
      { name: 'status', type: '"online" | "offline" | "away" | "busy"', required: false, description: 'Status indicator' },
      { name: 'bordered', type: 'boolean', required: false, defaultValue: 'false', description: 'Show border' },
    ],
    variants: ['default', 'square', 'rounded', 'with-status', 'grouped'],
    filePath: 'src/components/roycss/ui/data/Avatar.tsx',
    importPath: '@/components/roycss/ui/data/Avatar',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-labels', 'semantic-html'],
  },
  {
    name: 'badge',
    displayName: 'Badge',
    category: 'data-display',
    description: 'Status badges and tags with variants.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'Badge content' },
      { name: 'variant', type: '"default" | "primary" | "success" | "warning" | "destructive"', required: false, defaultValue: '"default"', description: 'Badge variant' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Badge size' },
      { name: 'shape', type: '"rounded" | "pill" | "square"', required: false, defaultValue: '"rounded"', description: 'Shape' },
      { name: 'dot', type: 'boolean', required: false, defaultValue: 'false', description: 'Show dot indicator' },
      { name: 'removable', type: 'boolean', required: false, defaultValue: 'false', description: 'Removable badge' },
    ],
    variants: ['default', 'primary', 'success', 'warning', 'destructive', 'pill', 'dot', 'removable'],
    filePath: 'src/components/roycss/ui/data/Badge.tsx',
    importPath: '@/components/roycss/ui/data/Badge',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-labels', 'semantic-html'],
  },
  {
    name: 'progress-bars',
    displayName: 'Progress Bars',
    category: 'data-display',
    description: 'Various progress indicators - linear, circular, and steps.',
    props: [
      { name: 'value', type: 'number', required: true, description: 'Progress value (0-100)' },
      { name: 'variant', type: '"default" | "success" | "warning" | "destructive"', required: false, defaultValue: '"default"', description: 'Color variant' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Size' },
      { name: 'showLabel', type: 'boolean', required: false, defaultValue: 'false', description: 'Show percentage label' },
      { name: 'striped', type: 'boolean', required: false, defaultValue: 'false', description: 'Striped animation' },
    ],
    variants: ['linear', 'circular', 'steps', 'striped', 'indeterminate'],
    filePath: 'src/components/roycss/ui/data/ProgressBars.tsx',
    importPath: '@/components/roycss/ui/data/ProgressBars',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-labels', 'semantic-html', 'screen-reader-support'],
  },
  {
    name: 'skeleton-loader',
    displayName: 'Skeleton Loader',
    category: 'data-display',
    description: 'Loading skeleton placeholders for various content types.',
    props: [
      { name: 'width', type: 'string', required: false, defaultValue: '"full"', description: 'Width class' },
      { name: 'height', type: 'string', required: false, defaultValue: '"base"', description: 'Height class' },
      { name: 'shape', type: '"rectangle" | "circle" | "text"', required: false, defaultValue: '"rectangle"', description: 'Shape' },
      { name: 'lines', type: 'number', required: false, defaultValue: '1', description: 'Number of lines (text shape)' },
      { name: 'animation', type: '"pulse" | "wave" | "none"', required: false, defaultValue: '"pulse"', description: 'Animation type' },
    ],
    variants: ['rectangle', 'circle', 'text', 'card', 'table', 'list'],
    filePath: 'src/components/roycss/ui/data/SkeletonLoader.tsx',
    importPath: '@/components/roycss/ui/data/SkeletonLoader',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-hidden', 'semantic-html'],
  },
  {
    name: 'pagination',
    displayName: 'Pagination',
    category: 'data-display',
    description: 'Page navigation with configurable options.',
    props: [
      { name: 'currentPage', type: 'number', required: true, description: 'Current page (1-based)' },
      { name: 'totalPages', type: 'number', required: true, description: 'Total pages' },
      { name: 'onPageChange', type: '(page: number) => void', required: true, description: 'Page change handler' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, defaultValue: '"md"', description: 'Size' },
      { name: 'variant', type: '"default" | "outline" | "ghost"', required: false, defaultValue: '"default"', description: 'Style variant' },
      { name: 'showEdges', type: 'boolean', required: false, defaultValue: 'true', description: 'Show first/last buttons' },
      { name: 'showTotal', type: 'boolean', required: false, defaultValue: 'false', description: 'Show total items count' },
    ],
    variants: ['default', 'outline', 'ghost', 'small', 'large'],
    filePath: 'src/components/roycss/ui/data/Pagination.tsx',
    importPath: '@/components/roycss/ui/data/Pagination',
    versionAdded: '1.0.0',
    a11yFeatures: ['keyboard-navigation', 'focus-management', 'aria-labels', 'semantic-html'],
  },
];

// ============================================================================
// Feedback Components
// ============================================================================

const feedbackComponents: RoyCSSComponent[] = [
  {
    name: 'alert-banner',
    displayName: 'Alert Banner',
    category: 'feedback',
    description: 'Alert messages with success/error/warning/info variants.',
    props: [
      { name: 'variant', type: '"success" | "error" | "warning" | "info"', required: true, description: 'Alert variant' },
      { name: 'title', type: 'string', required: false, description: 'Alert title' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Alert message' },
      { name: 'dismissible', type: 'boolean', required: false, defaultValue: 'false', description: 'Dismissible alert' },
      { name: 'bannerStyle', type: '"solid" | "outlined" | "soft"', required: false, defaultValue: '"soft"', description: 'Banner style' },
      { name: 'action', type: '{ label: string; onClick: () => void }', required: false, description: 'Action button' },
    ],
    variants: ['success', 'error', 'warning', 'info', 'solid', 'outlined', 'soft'],
    filePath: 'src/components/roycss/ui/feedback/AlertBanner.tsx',
    importPath: '@/components/roycss/ui/feedback/AlertBanner',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-live', 'role-alert', 'keyboard-navigation', 'aria-labels'],
  },
  {
    name: 'toast',
    displayName: 'Toast Notification',
    category: 'feedback',
    description: 'Toast notification system with queue management.',
    props: [
      { name: 'type', type: '"success" | "error" | "warning" | "info" | "loading"', required: false, defaultValue: '"info"', description: 'Toast type' },
      { name: 'title', type: 'string', required: false, description: 'Toast title' },
      { name: 'message', type: 'string', required: false, description: 'Toast message' },
      { name: 'duration', type: 'number', required: false, defaultValue: '5000', description: 'Duration in ms (0 = persistent)' },
      { name: 'action', type: '{ label: string; onClick: () => void }', required: false, description: 'Action button' },
      { name: 'position', type: 'ToastPosition', required: false, description: 'Screen position' },
    ],
    variants: ['success', 'error', 'warning', 'info', 'loading', 'with-action'],
    filePath: 'src/components/roycss/ui/feedback/Toast.tsx',
    importPath: '@/components/roycss/ui/feedback/Toast',
    versionAdded: '1.0.0',
    a11yFeatures: ['aria-live', 'role-alert', 'keyboard-navigation', 'aria-labels'],
  },
  {
    name: 'confirm-dialog',
    displayName: 'Confirm Dialog',
    category: 'feedback',
    description: 'Confirmation modal for destructive actions.',
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Dialog open state' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'onConfirm', type: '() => void | Promise<void>', required: true, description: 'Confirm handler' },
      { name: 'title', type: 'string', required: true, description: 'Dialog title' },
      { name: 'message', type: 'string', required: false, description: 'Dialog message' },
      { name: 'variant', type: '"default" | "destructive" | "warning"', required: false, defaultValue: '"default"', description: 'Variant style' },
      { name: 'danger', type: 'boolean', required: false, defaultValue: 'false', description: 'Danger mode' },
    ],
    variants: ['default', 'destructive', 'warning', 'loading'],
    filePath: 'src/components/roycss/ui/feedback/feedback-legacy.tsx',
    importPath: '@/components/roycss/ui/feedback/feedback-legacy',
    versionAdded: '1.0.0',
    a11yFeatures: ['focus-management', 'aria-modal', 'keyboard-navigation', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'tooltip',
    displayName: 'Tooltip',
    category: 'feedback',
    description: 'Hover tooltip for additional information.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'Trigger element' },
      { name: 'content', type: 'ReactNode', required: true, description: 'Tooltip content' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', required: false, defaultValue: '"top"', description: 'Position side' },
      { name: 'delay', type: 'number', required: false, defaultValue: '200', description: 'Show delay (ms)' },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disable tooltip' },
    ],
    variants: ['top', 'bottom', 'left', 'right', 'with-delay'],
    filePath: 'src/components/roycss/ui/overlay/overlay-legacy.tsx',
    importPath: '@/components/roycss/ui/overlay/overlay-legacy',
    versionAdded: '1.0.0',
    a11yFeatures: ['role-tooltip', 'keyboard-navigation', 'aria-labels'],
  },
  {
    name: 'loading-spinner',
    displayName: 'Loading Spinner',
    category: 'feedback',
    description: 'Loading indicator with various styles.',
    props: [
      { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', required: false, defaultValue: '"md"', description: 'Spinner size' },
      { name: 'variant', type: '"default" | "primary" | "success" | "warning"', required: false, defaultValue: '"default"', description: 'Color variant' },
      { name: 'label', type: 'string', required: false, defaultValue: '"Loading..."', description: 'Screen reader label' },
      { name: 'centered', type: 'boolean', required: false, defaultValue: 'false', description: 'Center in container' },
      { name: 'overlay', type: 'boolean', required: false, defaultValue: 'false', description: 'Overlay mode' },
      { name: 'text', type: 'string', required: false, description: 'Text below spinner' },
    ],
    variants: ['spinner', 'dots', 'pulse', 'overlay', 'page-loader'],
    filePath: 'src/components/roycss/ui/feedback/LoadingSpinner.tsx',
    importPath: '@/components/roycss/ui/feedback/LoadingSpinner',
    versionAdded: '1.0.0',
    a11yFeatures: ['role-status', 'aria-labels', 'aria-busy'],
  },
];

// ============================================================================
// Overlay Components
// ============================================================================

const overlayComponents: RoyCSSComponent[] = [
  {
    name: 'modal',
    displayName: 'Modal',
    category: 'overlay',
    description: 'Dialog/modal window with focus trap and scroll lock.',
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Modal open state' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'title', type: 'string', required: false, description: 'Modal title' },
      { name: 'size', type: '"sm" | "md" | "lg" | "xl" | "full"', required: false, defaultValue: '"md"', description: 'Modal size' },
      { name: 'closeOnBackdrop', type: 'boolean', required: false, defaultValue: 'true', description: 'Close on backdrop click' },
      { name: 'closeOnEscape', type: 'boolean', required: false, defaultValue: 'true', description: 'Close on escape key' },
      { name: 'footer', type: 'ReactNode', required: false, description: 'Footer content' },
    ],
    variants: ['small', 'medium', 'large', 'full-screen', 'with-footer'],
    filePath: 'src/components/roycss/ui/overlay/overlay-legacy.tsx',
    importPath: '@/components/roycss/ui/overlay/overlay-legacy',
    versionAdded: '1.0.0',
    a11yFeatures: ['focus-management', 'aria-modal', 'trap-focus', 'keyboard-navigation', 'scroll-lock', 'aria-labels', 'semantic-html'],
  },
  {
    name: 'drawer',
    displayName: 'Drawer',
    category: 'overlay',
    description: 'Slide-out panel from any edge.',
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Drawer open state' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'position', type: '"left" | "right" | "top" | "bottom"', required: false, defaultValue: '"right"', description: 'Slide position' },
      { name: 'size', type: '"sm" | "md" | "lg" | "xl" | "full"', required: false, defaultValue: '"md"', description: 'Drawer size' },
      { name: 'title', type: 'string', required: false, description: 'Drawer title' },
      { name: 'footer', type: 'ReactNode', required: false, description: 'Footer content' },
    ],
    variants: ['left', 'right', 'top', 'bottom', 'small', 'large', 'full'],
    filePath: 'src/components/roycss/ui/overlay/overlay-legacy.tsx',
    importPath: '@/components/roycss/ui/overlay/overlay-legacy',
    versionAdded: '1.0.0',
    a11yFeatures: ['focus-management', 'aria-modal', 'trap-focus', 'keyboard-navigation', 'scroll-lock', 'aria-labels'],
  },
  {
    name: 'popover',
    displayName: 'Popover',
    category: 'overlay',
    description: 'Floating content panel triggered by click/hover.',
    props: [
      { name: 'trigger', type: 'ReactNode', required: true, description: 'Trigger element' },
      { name: 'content', type: 'ReactNode', required: true, description: 'Popover content' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', required: false, defaultValue: '"bottom"', description: 'Position side' },
      { name: 'align', type: '"start" | "center" | "end"', required: false, defaultValue: '"center"', description: 'Alignment' },
      { name: 'offset', type: 'number', required: false, defaultValue: '8', description: 'Offset from trigger' },
      { name: 'showArrow', type: 'boolean', required: false, defaultValue: 'false', description: 'Show arrow' },
    ],
    variants: ['top', 'bottom', 'left', 'right', 'with-arrow'],
    filePath: 'src/components/roycss/ui/overlay/overlay-legacy.tsx',
    importPath: '@/components/roycss/ui/overlay/overlay-legacy',
    versionAdded: '1.0.0',
    a11yFeatures: ['role-tooltip', 'keyboard-navigation', 'aria-labels'],
  },
  {
    name: 'sheet',
    displayName: 'Sheet',
    category: 'overlay',
    description: 'Full-screen overlay panel for mobile navigation.',
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Sheet open state' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', required: false, defaultValue: '"right"', description: 'Slide-in side' },
      { name: 'size', type: '"sm" | "md" | "lg" | "xl" | "full"', required: false, defaultValue: '"md"', description: 'Sheet size' },
      { name: 'title', type: 'string', required: false, description: 'Sheet title' },
      { name: 'footer', type: 'ReactNode', required: false, description: 'Footer content' },
      { name: 'lockScroll', type: 'boolean', required: false, defaultValue: 'true', description: 'Lock body scroll' },
    ],
    variants: ['top', 'bottom', 'left', 'right', 'small', 'large', 'full'],
    filePath: 'src/components/roycss/ui/overlay/Sheet.tsx',
    importPath: '@/components/roycss/ui/overlay/Sheet',
    versionAdded: '1.0.0',
    a11yFeatures: ['focus-management', 'trap-focus', 'aria-modal', 'keyboard-navigation', 'scroll-lock', 'aria-labels', 'semantic-html'],
  },
];

// ============================================================================
// Complete Registry
// ============================================================================

export const allComponents: RoyCSSComponent[] = [
  ...formComponents,
  ...dataDisplayComponents,
  ...feedbackComponents,
  ...overlayComponents,
];

// Create lookup maps
const componentMap = new Map<string, RoyCSSComponent>();
const categoryMap = new Map<ComponentCategory, RoyCSSComponent[]>();

allComponents.forEach((component) => {
  componentMap.set(component.name, component);
  
  const existing = categoryMap.get(component.category) || [];
  existing.push(component);
  categoryMap.set(component.category, existing);
});

// Update category counts
CATEGORIES.forEach((cat) => {
  cat.count = categoryMap.get(cat.key)?.length || 0;
});

// ============================================================================
// Registry API
// ============================================================================

/**
 * Get all registered components
 */
export function getAllComponents(): RoyCSSComponent[] {
  return [...allComponents];
}

/**
 * Get component by name
 */
export function getComponent(name: string): RoyCSSComponent | undefined {
  return componentMap.get(name);
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category: ComponentCategory): RoyCSSComponent[] {
  return categoryMap.get(category) || [];
}

/**
 * Search components by query
 */
export function searchComponents(query: string): RoyCSSComponent[] {
  const lowerQuery = query.toLowerCase();
  
  return allComponents.filter(
    (component) =>
      component.name.includes(lowerQuery) ||
      component.displayName.toLowerCase().includes(lowerQuery) ||
      component.description.toLowerCase().includes(lowerQuery) ||
      component.category.includes(lowerQuery)
  );
}

/**
 * Get total component count
 */
export function getComponentCount(): number {
  return allComponents.length;
}

/**
 * Get categories with counts
 */
export function getCategories(): CategoryInfo[] {
  return [...CATEGORIES];
}

/**
 * Get category by key
 */
export function getCategory(key: ComponentCategory): CategoryInfo | undefined {
  return CATEGORIES.find((cat) => cat.key === key);
}

// Export registry info
export const registry = {
  components: allComponents,
  total: allComponents.length,
  categories: CATEGORIES,
  getAllComponents,
  getComponent,
  getComponentsByCategory,
  searchComponents,
  getComponentCount,
  getCategories,
  getCategory,
};

export default registry;
