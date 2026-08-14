import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    description,
    error,
    required = false,
    fullWidth = false,
    disabled = false,
    className,
    id,
    type = 'text',
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-1.5">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-lg
            bg-white text-foreground placeholder-foreground-muted
            border-border transition-colors
            focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100
            disabled:bg-neutral-100 disabled:text-foreground-disabled disabled:border-border disabled:cursor-not-allowed
            ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-100' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {description && !error && (
          <p className="text-xs text-foreground-muted mt-1">{description}</p>
        )}
        {error && (
          <p className="text-xs text-error-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    description,
    error,
    required = false,
    fullWidth = false,
    disabled = false,
    className,
    id,
    rows = 4,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground mb-1.5">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-lg
            bg-white text-foreground placeholder-foreground-muted
            border-border transition-colors
            focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100
            disabled:bg-neutral-100 disabled:text-foreground-disabled disabled:border-border disabled:cursor-not-allowed
            resize-vertical font-inherit
            ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-100' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {description && !error && (
          <p className="text-xs text-foreground-muted mt-1">{description}</p>
        )}
        {error && (
          <p className="text-xs text-error-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    description,
    error,
    required = false,
    fullWidth = false,
    disabled = false,
    className,
    id,
    options,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-foreground mb-1.5">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-lg
            bg-white text-foreground
            border-border transition-colors
            focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100
            disabled:bg-neutral-100 disabled:text-foreground-disabled disabled:border-border disabled:cursor-not-allowed
            ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-100' : ''}
            ${className || ''}
          `}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {description && !error && (
          <p className="text-xs text-foreground-muted mt-1">{description}</p>
        )}
        {error && (
          <p className="text-xs text-error-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    label,
    description,
    disabled = false,
    className,
    id,
    ...props
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          className={`
            w-5 h-5 rounded border-border border-2 mt-0.5
            bg-white text-brand-pink
            focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-brand-pink
            disabled:bg-neutral-100 disabled:border-neutral-300 disabled:cursor-not-allowed
            cursor-pointer accent-brand-pink
            ${className || ''}
          `}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="ml-2 flex flex-col cursor-pointer">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {description && (
              <span className="text-xs text-foreground-muted mt-0.5">{description}</span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({
    label,
    description,
    disabled = false,
    className,
    id,
    ...props
  }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start">
        <input
          ref={ref}
          id={radioId}
          type="radio"
          disabled={disabled}
          className={`
            w-5 h-5 rounded-full border-border border-2 mt-0.5
            bg-white text-brand-pink
            focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-brand-pink
            disabled:bg-neutral-100 disabled:border-neutral-300 disabled:cursor-not-allowed
            cursor-pointer accent-brand-pink
            ${className || ''}
          `}
          {...props}
        />
        {label && (
          <label htmlFor={radioId} className="ml-2 flex flex-col cursor-pointer">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {description && (
              <span className="text-xs text-foreground-muted mt-0.5">{description}</span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
