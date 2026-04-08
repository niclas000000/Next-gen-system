export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'daterange'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  | 'file'
  | 'image'
  | 'user'
  | 'multiuser'
  | 'group'
  | 'table'
  | 'keyvalue'
  | 'section'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'alert'
  | 'signature'
  | 'geolocation'
  | 'barcode'
  | 'custom'

export interface FormField {
  id: string
  type: FieldType
  name: string
  label: string
  description?: string
  placeholder?: string
  defaultValue?: unknown
  validation: ValidationRule[]
  conditional?: ConditionalRule
  calculation?: string
  dataSource?: DataSource
  properties: FieldProperties
  layout?: FieldLayout
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: unknown
  expression?: string
  message: string
}

export interface ConditionalRule {
  show: boolean
  expression: string
}

export interface DataSource {
  type: 'static' | 'database' | 'api' | 'variable' | 'expression'
  options?: Array<{ label: string; value: string }>
  query?: string
  url?: string
  variable?: string
  expression?: string
}

export interface FieldLayout {
  columns?: 1 | 2 | 3
  width?: 'full' | 'half' | 'third'
}

export type FieldProperties =
  | TextFieldProperties
  | NumberFieldProperties
  | DateFieldProperties
  | FileFieldProperties
  | TableFieldProperties
  | SelectFieldProperties
  | BaseFieldProperties

export interface BaseFieldProperties {
  cssClass?: string
  ariaLabel?: string
  readOnly?: boolean
}

export interface TextFieldProperties extends BaseFieldProperties {
  multiline?: boolean
  rows?: number
  maxLength?: number
}

export interface NumberFieldProperties extends BaseFieldProperties {
  step?: number
  prefix?: string
  suffix?: string
  thousandSeparator?: boolean
  decimalPlaces?: number
  min?: number
  max?: number
}

export interface DateFieldProperties extends BaseFieldProperties {
  minDate?: string
  maxDate?: string
  disableWeekends?: boolean
  format?: string
}

export interface FileFieldProperties extends BaseFieldProperties {
  allowedTypes?: string[]
  maxSize?: number
  maxFiles?: number
  destination?: string
  previewImages?: boolean
}

export interface TableFieldProperties extends BaseFieldProperties {
  columns: TableColumn[]
  minRows?: number
  maxRows?: number
  defaultRows?: number
}

export interface TableColumn {
  id: string
  label: string
  type: FieldType
  width?: number
  required?: boolean
}

export interface SelectFieldProperties extends BaseFieldProperties {
  searchable?: boolean
  clearable?: boolean
}

export interface FormDefinition {
  id: string
  workflowId: string
  nodeId: string
  name: string
  fields: FormField[]
  settings: FormSettings
}

export interface FormSettings {
  title?: string
  submitButtonText: string
  saveDraftEnabled: boolean
  autoSaveInterval?: number
  confirmationMessage?: string
  layout?: 'default' | 'compact' | 'comfortable'
}
