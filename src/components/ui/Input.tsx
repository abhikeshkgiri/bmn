'use client';

import React, { useId } from 'react';

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
    onChange,
    maxLength,
    pattern,
    inputMode,
    autoComplete,
    ...props
  }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const isPhone = type === 'tel';
    const isEmail = type === 'email';

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
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[description && !error ? descriptionId : undefined, errorId].filter(Boolean).join(' ') || undefined}
          maxLength={isEmail ? Math.min(maxLength ?? 160, 160) : maxLength}
          pattern={isPhone ? '[0-9]{10}' : pattern}
          inputMode={isPhone ? 'numeric' : inputMode}
          autoComplete={isPhone ? (autoComplete || 'tel-national') : autoComplete}
          onChange={(event) => {
            if (isPhone) {
              const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
              if (event.currentTarget.value !== digits) event.currentTarget.value = digits;
            }
            onChange?.(event);
          }}
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
          <p id={descriptionId} className="mt-1 text-xs text-foreground-secondary">{description}</p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-error-700">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

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
    const generatedId = useId();
    const textareaId = id || generatedId;
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

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
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[description && !error ? descriptionId : undefined, errorId].filter(Boolean).join(' ') || undefined}
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
          <p id={descriptionId} className="mt-1 text-xs text-foreground-secondary">{description}</p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-error-700">{error}</p>
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
    const generatedId = useId();
    const selectId = id || generatedId;
    const descriptionId = description ? `${selectId}-description` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;

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
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[description && !error ? descriptionId : undefined, errorId].filter(Boolean).join(' ') || undefined}
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
          <p id={descriptionId} className="mt-1 text-xs text-foreground-secondary">{description}</p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-error-700">{error}</p>
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
    error,
    disabled = false,
    className,
    id,
    ...props
  }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const descriptionId = description ? `${checkboxId}-description` : undefined;
    const errorId = error ? `${checkboxId}-error` : undefined;

    return (
      <div className="flex items-start">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          className={`
            w-5 h-5 rounded border-border border-2 mt-0.5
            bg-white text-brand-pink
            focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-brand-pink
            disabled:bg-neutral-100 disabled:border-neutral-300 disabled:cursor-not-allowed
            cursor-pointer accent-brand-pink
            ${error ? 'border-error-600 focus:border-error-600 focus:ring-error-50' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {(label || description || error) && (
          <div className="ml-2 flex flex-col">
            {label && <label htmlFor={checkboxId} className="cursor-pointer text-sm font-medium text-foreground">{label}</label>}
            {description && <span id={descriptionId} className="mt-0.5 text-xs text-foreground-secondary">{description}</span>}
            {error && <span id={errorId} className="mt-0.5 text-xs font-medium text-error-700">{error}</span>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({
    label,
    description,
    error,
    disabled = false,
    className,
    id,
    ...props
  }, ref) => {
    const generatedId = useId();
    const radioId = id || generatedId;
    const descriptionId = description ? `${radioId}-description` : undefined;
    const errorId = error ? `${radioId}-error` : undefined;

    return (
      <div className="flex items-start">
        <input
          ref={ref}
          id={radioId}
          type="radio"
          disabled={disabled}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          className={`
            w-5 h-5 rounded-full border-border border-2 mt-0.5
            bg-white text-brand-pink
            focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-brand-pink
            disabled:bg-neutral-100 disabled:border-neutral-300 disabled:cursor-not-allowed
            cursor-pointer accent-brand-pink
            ${error ? 'border-error-600 focus:border-error-600 focus:ring-error-50' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {(label || description || error) && (
          <div className="ml-2 flex flex-col">
            {label && <label htmlFor={radioId} className="cursor-pointer text-sm font-medium text-foreground">{label}</label>}
            {description && <span id={descriptionId} className="mt-0.5 text-xs text-foreground-secondary">{description}</span>}
            {error && <span id={errorId} className="mt-0.5 text-xs font-medium text-error-700">{error}</span>}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
