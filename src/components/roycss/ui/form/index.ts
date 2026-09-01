/**
 * ROYCSS Form Components
 * @module roycss/ui/form
 * @description Export all form components
 */

// New form components
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';

export { SelectInput } from './SelectInput';
export type { SelectInputProps, SelectOption } from './SelectInput';

export { CheckboxGroup } from './CheckboxGroup';
export type { CheckboxGroupProps, CheckboxOption } from './CheckboxGroup';

export { RadioGroup } from './RadioGroup';
export type { RadioGroupProps, RadioOption } from './RadioGroup';

export { ToggleSwitch } from './ToggleSwitch';
export type { ToggleSwitchProps } from './ToggleSwitch';

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

// Existing form components
export { default as MaskedInput } from './MaskedInput';
export type { MaskedInputProps, MaskPattern } from './MaskedInput';

export { default as ValidatedInput } from './ValidatedInput';
export type { ValidatedInputProps, ValidationRule } from './ValidatedInput';
export { validators } from './ValidatedInput';

export { default as Select } from './Select';
export type { SelectProps, SelectOption as LegacySelectOption } from './Select';

export { DatePicker } from './DatePicker';
export type { DatePickerProps, DatePickerVariant, DatePickerView } from './DatePicker';

export { default as FileUpload } from './FileUpload';
export type { FileUploadProps } from './FileUpload';

export { FormWizard } from './FormWizard';
export type { FormWizardProps } from './FormWizard';
