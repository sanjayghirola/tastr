// ═══════════════════════════════════════════════════════════════════════════
//  TASTR  —  Global Component Library
//  src/components/global/index.jsx
//
//  All components use only Tailwind utility classes + the custom classes
//  defined in index.css. No inline styles. No third-party UI library.
//
//  Usage:
//    import { Button, Input, Modal, Card, Badge, ... } from '@/components/global'
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, createContext, useContext } from 'react'


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Button
 * Props: variant ('primary'|'secondary'|'ghost'|'danger'|'outline')
 *        size ('sm'|'md'|'lg'|'full')
 *        loading, disabled, icon, iconRight, onClick, type, className, children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  onClick,
  type = 'button',
  className = '',
  children,
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed'

  const variants = {
    primary:  'bg-brand-500 text-white shadow-btn hover:bg-brand-600 hover:-translate-y-px active:bg-brand-700 active:translate-y-0',
    secondary:'bg-transparent text-brand-500 border-[1.5px] border-brand-500 hover:bg-brand-50 active:bg-brand-100',
    ghost:    'bg-transparent text-brand-500 hover:bg-brand-50',
    danger:   'bg-error-600 text-white hover:bg-error-700',
    outline:  'bg-transparent text-text-secondary border border-border hover:bg-brand-50 hover:text-brand-500 hover:border-brand-500',
  }

  const sizes = {
    sm:   'text-sm px-4 py-2',
    md:   'text-base px-7 py-3.5',
    lg:   'text-lg px-8 py-4',
    full: 'text-lg px-6 py-4 w-full',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <span className="spinner spinner-sm" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
}

/**
 * IconButton — circular icon-only button
 * Props: icon, onClick, size ('sm'|'md'|'lg'), variant ('default'|'brand'|'ghost'), className
 */
export function IconButton({ icon, onClick, size = 'md', variant = 'default', className = '', label }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' }
  const variants = {
    default: 'bg-bg-card border border-border text-text-primary hover:bg-brand-50',
    brand:   'bg-brand-500 text-white hover:bg-brand-600',
    ghost:   'bg-transparent text-text-muted hover:bg-brand-50 hover:text-brand-500',
  }
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`btn-icon flex items-center justify-center rounded-full transition-all duration-150 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon}
    </button>
  )
}

/**
 * QtySteppers — cart quantity control  (– 1 +)
 * Props: value, onIncrease, onDecrease, min (default 0), max
 */
export function QtyStepper({ value, onIncrease, onDecrease, min = 0, max }) {
  return (
    <div className="qty-stepper inline-flex items-center border border-border rounded-full overflow-hidden bg-bg-card">
      <button
        onClick={onDecrease}
        disabled={value <= min}
        className="qty-btn w-8 h-8 flex items-center justify-center text-lg font-bold text-brand-500 hover:bg-brand-50 disabled:opacity-40 transition-colors"
      >−</button>
      <span className="qty-value px-3 text-sm font-semibold text-text-primary min-w-[28px] text-center">{value}</span>
      <button
        onClick={onIncrease}
        disabled={max !== undefined && value >= max}
        className="qty-btn w-8 h-8 flex items-center justify-center text-lg font-bold text-brand-500 hover:bg-brand-50 disabled:opacity-40 transition-colors"
      >+</button>
    </div>
  )
}

/**
 * AmountPill — tip / donation amount selector
 * Props: amount (string e.g. '£10'), active, onClick
 */
export function AmountPill({ amount, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`amount-pill px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 whitespace-nowrap
        ${active
          ? 'bg-brand-500 border-brand-500 text-white'
          : 'bg-bg-card border-border text-text-secondary hover:border-brand-500 hover:text-brand-500'
        }`}
    >
      {amount}
    </button>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — FORM & INPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input — labelled text input with optional icon and error state
 * Props: label, name, type, placeholder, value, onChange, error, disabled,
 *        iconLeft, iconRight, required, hint, className
 */
export const Input = React.forwardRef(function Input({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  iconLeft,
  iconRight,
  required = false,
  hint,
  className = '',
}, ref) {
  return (
    <div className="input-group flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="input-label text-sm font-semibold text-text-primary">
          {label}{required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`tastr-input w-full py-3 px-4 text-sm text-text-primary bg-bg-input border rounded-[10px]
            transition-all duration-200
            placeholder:text-text-muted
            focus:border-brand-500 focus:shadow-focus focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-section
            ${error ? 'border-error-600' : 'border-border'}
            ${iconLeft  ? 'pl-10' : ''}
            ${iconRight ? 'pr-10' : ''}
            ${className}`}
        />
        {iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer">
            {iconRight}
          </span>
        )}
      </div>
      {error && <span className="input-error-msg text-xs text-error-600">{error}</span>}
      {hint && !error && <span className="text-xs text-text-muted">{hint}</span>}
    </div>
  )
})

/**
 * PasswordInput — input with show/hide toggle
 */
export const PasswordInput = React.forwardRef(function PasswordInput(
  { label, name, value, onChange, error, placeholder, required, className = '' }, ref
) {
  const [show, setShow] = useState(false)
  return (
    <Input
      ref={ref}
      label={label}
      name={name}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      error={error}
      placeholder={placeholder || 'Enter password'}
      required={required}
      className={className}
      iconRight={
        <button type="button" onClick={() => setShow(s => !s)} className="text-text-muted hover:text-text-primary transition-colors">
          {show ? '🙈' : '👁'}
        </button>
      }
    />
  )
})

/**
 * SearchInput — full-width search bar with mic icon (matches Figma home screen)
 * Props: placeholder, value, onChange, onSearch, loading, className
 */
export function SearchInput({ placeholder = 'Search food, restaurants...', value, onChange, onSearch, loading, className = '' }) {
  return (
    <div className={`search-input-wrap flex items-center bg-bg-card border border-border rounded-full px-4 py-2.5 gap-2.5 shadow-card ${className}`}>
      <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={e => e.key === 'Enter' && onSearch?.()}
        placeholder={placeholder}
        className="flex-1 border-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      {loading ? (
        <span className="spinner spinner-sm flex-shrink-0" />
      ) : (
        <button onClick={onSearch} className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z"/>
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H10.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z"/>
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * OtpInput — 6-box OTP row with auto-advance
 * Props: length, value (array), onChange, error, autoSubmit (callback)
 */
export function OtpInput({ length = 6, value = [], onChange, error, autoSubmit }) {
  const refs = useRef([])

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[i] = val
    onChange(next)
    if (val && i < length - 1) refs.current[i + 1]?.focus()
    if (val && i === length - 1 && next.every(v => v) && autoSubmit) autoSubmit(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const next = pasted.split('')
    onChange(next)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
    if (pasted.length === length && autoSubmit) autoSubmit(pasted)
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="otp-input-row flex gap-2.5 justify-center">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`otp-box w-12 h-14 text-center text-2xl font-bold border rounded-lg transition-all duration-200
              focus:outline-none focus:border-brand-500 focus:shadow-focus
              ${value[i] ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-input'}
              ${error ? 'border-error-600' : ''}`}
          />
        ))}
      </div>
      {error && <span className="text-xs text-error-600">{error}</span>}
    </div>
  )
}

/**
 * Textarea
 */
export function Textarea({ label, name, value, onChange, error, placeholder, rows = 4, maxLength, className = '' }) {
  return (
    <div className="input-group flex flex-col gap-1.5">
      {label && <label htmlFor={name} className="text-sm font-semibold text-text-primary">{label}</label>}
      <div className="relative">
        <textarea
          id={name} name={name} value={value} onChange={onChange}
          placeholder={placeholder} rows={rows} maxLength={maxLength}
          className={`tastr-input w-full py-3 px-4 text-sm text-text-primary bg-bg-input border rounded-xl resize-none
            placeholder:text-text-muted focus:border-brand-500 focus:shadow-focus focus:outline-none
            transition-all duration-200
            ${error ? 'border-error-600' : 'border-border'} ${className}`}
        />
        {maxLength && (
          <span className="absolute bottom-2 right-3 text-xs text-text-muted">
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-error-600 mt-0.5">{error}</span>}
    </div>
  )
}

/**
 * Toggle — on/off switch
 */
export function Toggle({ checked, onChange, label, size = 'md', disabled = false }) {
  const sizes = { sm: 'w-9 h-5', md: 'w-11 h-6', lg: 'w-14 h-7' }
  const knobSizes = { sm: 'w-3.5 h-3.5', md: 'w-4.5 h-4.5', lg: 'w-6 h-6' }
  const knobTranslate = { sm: 'translate-x-4', md: 'translate-x-5', lg: 'translate-x-7' }

  return (
    <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-block ${sizes[size]} rounded-full transition-colors duration-200
          ${checked ? 'bg-brand-500' : 'bg-border-strong'}`}
      >
        <span className={`absolute left-0.5 top-0.5 bg-white rounded-full shadow transition-transform duration-200
          ${knobSizes[size]} ${checked ? knobTranslate[size] : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
    </label>
  )
}

/**
 * PromoCodeInput — "Enter promo code" + Choose button (cart screen)
 */
export function PromoCodeInput({ value, onChange, onApply, onChoose, success, successMessage, loading }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="promo-input-wrap flex items-center border border-border rounded-xl overflow-hidden bg-bg-input">
        <span className="pl-3 text-text-muted flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Enter promo code"
          className="flex-1 px-3 py-3 text-sm text-text-primary bg-transparent border-none focus:outline-none"
        />
        <button
          onClick={onChoose || onApply}
          className="promo-btn px-4 py-3 text-sm font-semibold text-brand-500 border-l border-border bg-transparent hover:bg-brand-50 transition-colors whitespace-nowrap"
        >
          {onChoose ? 'Choose' : loading ? <span className="spinner spinner-sm" /> : 'Apply'}
        </button>
      </div>
      {success && (
        <span className="text-xs text-success-600 font-medium">
          ✓ {successMessage || 'Promo code successfully applied.'}
        </span>
      )}
    </div>
  )
}

/**
 * Select dropdown
 */
export function Select({ label, name, value, onChange, options = [], error, placeholder, className = '' }) {
  return (
    <div className="input-group flex flex-col gap-1.5">
      {label && <label htmlFor={name} className="text-sm font-semibold text-text-primary">{label}</label>}
      <div className="relative">
        <select
          id={name} name={name} value={value} onChange={onChange}
          className={`tastr-input w-full py-3 pl-4 pr-10 text-sm appearance-none bg-bg-input border rounded-[10px]
            focus:border-brand-500 focus:shadow-focus focus:outline-none transition-all duration-200
            ${value ? 'text-text-primary' : 'text-text-muted'}
            ${error ? 'border-error-600' : 'border-border'} ${className}`}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {error && <span className="text-xs text-error-600">{error}</span>}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — CARDS & SURFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Card — base white card
 * Props: children, padding ('sm'|'md'|'lg'), hoverable, onClick, className
 */
export function Card({ children, padding = 'md', hoverable = false, onClick, className = '' }) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-5' }
  return (
    <div
      onClick={onClick}
      className={`tastr-card bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden
        ${paddings[padding]}
        ${hoverable ? 'cursor-pointer transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * MetricCard — admin dashboard KPI tile
 * Props: title, value, change, trend ('up'|'down'), icon, subtitle, loading
 */
export function MetricCard({ title, value, change, trend, icon, subtitle, loading = false }) {
  return (
    <div className="metric-card bg-bg-card border border-border rounded-2xl p-5 shadow-card">
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton-base skeleton-text w-24 h-3" />
          <div className="skeleton-base skeleton-text-lg w-20 h-6" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <div>
              {icon && <span className="inline-flex mb-1.5 text-brand-500">{icon}</span>}
              <p className="text-sm text-text-muted font-medium">{title}</p>
            </div>
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {change && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-semibold ${trend === 'up' ? 'text-success-600' : 'text-error-600'}`}>
              <span>{trend === 'up' ? '↑' : '↓'} {change}</span>
              <span className="font-normal text-text-muted ml-1">This week</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  )
}

/**
 * RestaurantCard — home feed grid card
 * Props: image, name, cuisine, rating, reviewCount, deliveryTime, deliveryFee,
 *        discount, isFeatured, onClick
 */
export function RestaurantCard({ image, name, cuisine, rating, reviewCount, deliveryTime, deliveryFee, discount, isFeatured = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className="restaurant-card bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative">
        <div className="w-full aspect-video bg-brand-50 overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-brand-100" />
          )}
        </div>
        {discount && (
          <div className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {discount}% off
          </div>
        )}
        {isFeatured && (
          <span className="absolute top-2 left-2 text-brand-500 text-sm">★</span>
        )}
      </div>
      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-bold text-text-primary mb-0.5 truncate">{name}</p>
        <p className="text-xs text-text-muted truncate mb-2">{cuisine}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-warning-500 text-xs">★</span>
            <span className="text-xs font-semibold text-text-primary">{rating}</span>
            {reviewCount && <span className="text-xs text-text-muted">({reviewCount})</span>}
          </div>
          <span className="text-xs text-text-muted">{deliveryTime} min</span>
        </div>
        <button className="mt-2 w-full text-xs font-semibold text-text-primary border border-brand-200 bg-brand-50 rounded-full py-1.5 hover:bg-brand-100 transition-colors">
          View More
        </button>
      </div>
    </div>
  )
}

/**
 * MenuItemCard — item within a restaurant menu section
 * Props: image, name, description, price, rating, onAdd, quantity, onIncrease, onDecrease
 */
export function MenuItemCard({ image, name, description, price, rating, onAdd, quantity = 0, onIncrease, onDecrease, discount }) {
  return (
    <div className="menu-item-card flex gap-3 p-3 bg-bg-card border border-border-light rounded-xl cursor-pointer hover:bg-brand-50 transition-colors">
      <div className="relative flex-shrink-0">
        <div className="w-18 h-18 rounded-lg overflow-hidden bg-brand-50">
          {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-100" />}
        </div>
        {discount && (
          <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
            {discount}%
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{name}</p>
            {description && <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{description}</p>}
            {rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-warning-500 text-xs">★</span>
                <span className="text-xs font-semibold text-text-primary">{rating}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-brand-500">£{price}</span>
          {quantity > 0 ? (
            <QtyStepper value={quantity} onIncrease={onIncrease} onDecrease={onDecrease} min={0} />
          ) : (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 text-xs font-semibold text-brand-500 border border-brand-300 rounded-full px-3 py-1.5 hover:bg-brand-50 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * CartItem — item in cart / checkout summary
 */
export function CartItem({ image, name, description, price, quantity, onIncrease, onDecrease, onRemove, rating }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-light last:border-0">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0">
        {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-100" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-text-primary">{name}</p>
            {description && <p className="text-xs text-text-muted line-clamp-2">{description}</p>}
            {rating && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-warning-500 text-xs">★</span>
                <span className="text-xs font-semibold">{rating}</span>
              </div>
            )}
          </div>
          <span className="text-base font-bold text-brand-500 whitespace-nowrap">£{price}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <QtyStepper value={quantity} onIncrease={onIncrease} onDecrease={onDecrease} min={0} />
          {onRemove && (
            <button onClick={onRemove} className="text-xs text-error-500 hover:text-error-700 font-medium transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * OrderCard — order summary row (order history)
 */
export function OrderCard({ orderId, restaurant, date, items, total, status, onPress }) {
  return (
    <div
      onClick={onPress}
      className="tastr-card bg-bg-card border border-border rounded-2xl p-4 shadow-card cursor-pointer hover:shadow-lift transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-text-muted font-medium">{orderId}</p>
          <p className="text-sm font-bold text-text-primary mt-0.5">{restaurant}</p>
        </div>
        <Badge status={status} />
      </div>
      {items && <p className="text-xs text-text-muted mb-2 line-clamp-1">{items}</p>}
      <div className="flex items-center justify-between border-t border-border-light pt-2 mt-2">
        <span className="text-xs text-text-muted">{date}</span>
        <span className="text-base font-bold text-brand-500">£{total}</span>
      </div>
    </div>
  )
}

/**
 * DeliveryCard — active delivery (driver app) with golden header
 */
export function DeliveryCard({ orderId, amount, restaurantName, destination, distance, duration, status, progress, onNavigate, onCall, children }) {
  return (
    <div className="delivery-card bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      {/* Golden header */}
      <div className="bg-brand-500 px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-bold text-white">{orderId}</span>
        <Badge status={status} />
      </div>
      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">{restaurantName}</p>
            <p className="text-xs text-text-muted mt-0.5">{destination}</p>
          </div>
          {amount && <span className="text-sm font-bold text-brand-500">{amount}</span>}
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
          {distance && <span className="flex items-center gap-1">📍 {distance}</span>}
          {duration && <span className="flex items-center gap-1">🕐 {duration}</span>}
        </div>
        {children}
        {(onNavigate || onCall) && (
          <div className="flex gap-2 mt-3">
            {onNavigate && (
              <button onClick={onNavigate} className="flex-1 py-2 rounded-full border border-border text-sm font-semibold text-text-primary hover:bg-brand-50 transition-colors">
                🧭 Navigate
              </button>
            )}
            {onCall && (
              <button onClick={onCall} className="flex-1 py-2 rounded-full bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
                📞 Call
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * GiftCard — gift card tile with title, value, code
 */
export function GiftCard({ title, value, code, status = 'active', onRedeem, onCopyCode }) {
  return (
    <div className="gift-card bg-bg-card border border-brand-200 rounded-2xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-brand-600">{title}</p>
          <p className="text-xs text-text-muted mt-0.5">Value: {value}</p>
          <p className="text-xs text-text-muted">Code: {code}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-300"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onRedeem} className="flex-1 py-2 rounded-full bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          Redeem
        </button>
        <button onClick={onCopyCode} className="flex-1 py-2 rounded-full border border-border bg-bg-input text-sm font-medium text-text-secondary hover:bg-brand-50 transition-colors flex items-center justify-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy code
        </button>
      </div>
    </div>
  )
}

/**
 * AddressCard — saved address (checkout screen)
 * Props: selected, label ('Home'|'Work'), name, phone, address, landmark, onSelect, onEdit, onDelete
 */
export function AddressCard({ selected, label, name, phone, address, landmark, onSelect, onEdit, onDelete }) {
  return (
    <div
      className={`relative rounded-2xl p-4 border transition-all duration-200 cursor-pointer
        ${selected ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card'}`}
      onClick={onSelect}
    >
      {/* Radio + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-brand-500' : 'border-border-strong'}`}>
            {selected && <div className="w-2 h-2 rounded-full bg-brand-500" />}
          </div>
          <span className="text-sm font-semibold text-text-primary">Saved address:</span>
        </div>
        <div className="flex items-center gap-2">
          {label && <span className="badge-base badge-brand text-xs px-2 py-0.5 rounded-full">{label}</span>}
          {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(); }} className="text-xs text-brand-500 font-medium flex items-center gap-0.5">✏ Edit</button>}
          {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-error-500 ml-1">🗑</button>}
        </div>
      </div>
      {/* Details */}
      <div className="space-y-1 text-sm text-text-secondary">
        {name    && <div><span className="label-micro">Name: </span><span className="font-medium text-text-primary">{name}</span></div>}
        {phone   && <div><span className="label-micro">Phone Number: </span>{phone}</div>}
        {address && <div><span className="label-micro">Delivery Address: </span>{address}</div>}
        {landmark && <div><span className="label-micro">Landmark: </span>{landmark}</div>}
      </div>
    </div>
  )
}

/**
 * PriceBreakdown — order summary (cart / checkout)
 */
export function PriceBreakdown({ items = [], total, currency = '£' }) {
  return (
    <div className="tastr-card bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="p-4 border-b border-border-light">
        <p className="text-base font-bold text-text-primary">Summary</p>
      </div>
      <div className="p-4 space-y-3">
        {items.map((row, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-text-muted">{row.label}</span>
            <span className={`font-medium ${row.negative ? 'text-error-600' : 'text-text-primary'}`}>
              {row.negative && '−'}{currency}{Math.abs(row.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-border flex justify-between">
        <span className="text-base font-bold text-text-primary">Total amount</span>
        <span className="text-base font-bold text-text-primary">{currency}{total}</span>
      </div>
    </div>
  )
}

/**
 * SubscriptionPlanCard — Tastr+ plan comparison tile
 */
export function SubscriptionPlanCard({ name, price, period, features = [], isActive, isHighlighted, onSelect }) {
  return (
    <div
      className={`rounded-2xl border p-5 cursor-pointer transition-all duration-200
        ${isHighlighted ? 'bg-brand-500 border-brand-500 text-white shadow-btn' : 'bg-bg-card border-border shadow-card hover:shadow-lift'}`}
      onClick={onSelect}
    >
      <p className={`text-lg font-bold mb-1 ${isHighlighted ? 'text-white' : 'text-text-primary'}`}>{name}</p>
      <div className="mb-3">
        <span className={`text-3xl font-extrabold ${isHighlighted ? 'text-white' : 'text-brand-500'}`}>£{price}</span>
        <span className={`text-sm ml-1 ${isHighlighted ? 'text-white/80' : 'text-text-muted'}`}>/{period}</span>
      </div>
      <ul className="space-y-2 mb-4">
        {features.map((f, i) => (
          <li key={i} className={`text-sm flex items-center gap-2 ${isHighlighted ? 'text-white/90' : 'text-text-secondary'}`}>
            <span className={isHighlighted ? 'text-white' : 'text-brand-500'}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button className={`w-full py-2.5 rounded-full text-sm font-bold transition-colors
        ${isHighlighted
          ? 'bg-white text-brand-600 hover:bg-brand-50'
          : 'bg-brand-500 text-white hover:bg-brand-600'
        }`}>
        {isActive ? 'Current Plan' : 'Subscribe'}
      </button>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — DISPLAY & STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Badge — status badge pill
 * Props: status ('pending'|'active'|'delivered'|'cancelled'|'onway'|'preparing'|'blocked'|'student'|'hot')
 *        OR: label + color (manual)
 */
export function Badge({ status, label, className = '' }) {
  const map = {
    pending:   { label: 'Pending',   cls: 'badge-pending'   },
    active:    { label: 'Active',    cls: 'badge-active'    },
    delivered: { label: 'Delivered', cls: 'badge-delivered' },
    paid:      { label: 'Paid',      cls: 'badge-paid'      },
    cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
    preparing: { label: 'Preparing', cls: 'badge-preparing' },
    onway:     { label: 'On the way',cls: 'badge-onway'     },
    blocked:   { label: 'Blocked',   cls: 'badge-cancelled' },
    student:   { label: 'Student',   cls: 'badge-student'   },
    hot:       { label: '🔥 Hot',    cls: 'badge-hot'       },
    brand:     { label: label,       cls: 'badge-brand'     },
  }
  const config = map[status] || { label: label || status, cls: 'badge-brand' }
  return (
    <span className={`badge-base ${config.cls} ${className}`}>
      {config.label}
    </span>
  )
}

/**
 * Avatar — user / restaurant avatar with fallback initials
 * Props: src, name, size ('xs'|'sm'|'md'|'lg'|'xl'), badge, shape ('circle'|'square')
 */
export function Avatar({ src, name, size = 'md', badge, shape = 'circle', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg', xl: 'w-16 h-16 text-xl' }
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  const radius = shape === 'square' ? 'rounded-xl' : 'rounded-full'

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${sizes[size]} ${radius} overflow-hidden bg-brand-100 flex items-center justify-center font-bold text-brand-600`}>
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <span>{initials}</span>}
      </div>
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success-500 border-2 border-white rounded-full" />
      )}
    </div>
  )
}

/**
 * Rating — read-only star display
 */
export function Rating({ value = 0, max = 5, count, size = 'sm', className = '' }) {
  const sizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-lg' }
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`text-warning-500 ${sizes[size]}`}>★</span>
      <span className={`font-semibold text-text-primary ${sizes[size]}`}>{value}</span>
      {count !== undefined && <span className={`text-text-muted ${sizes[size]}`}>({count})</span>}
    </div>
  )
}

/**
 * CategoryChip — horizontal filter pill
 * Props: label, icon, active, onClick
 */
export function CategoryChip({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`category-chip inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap flex-shrink-0 transition-all duration-150
        ${active
          ? 'bg-brand-500 border-brand-500 text-white font-semibold'
          : 'bg-bg-card border-border text-text-secondary hover:border-brand-500 hover:text-brand-500'
        }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}

/**
 * OrderStatusBar — horizontal step milestone tracker
 */
export function OrderStatusBar({ steps = [], current }) {
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 flex-1">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors
            ${i <= idx ? 'border-brand-500 bg-brand-500 text-white' : 'border-border-strong bg-bg-card text-text-muted'}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 transition-colors ${i < idx ? 'bg-brand-500' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * ProgressBar
 */
export function ProgressBar({ value, max = 100, color = 'brand', showLabel = false, className = '' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const colors = { brand: 'bg-brand-500', success: 'bg-success-500', warning: 'bg-warning-500', error: 'bg-error-500' }
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-text-muted mt-1">{pct}%</span>}
    </div>
  )
}

/**
 * EmptyState — no data illustration block
 */
export function EmptyState({ icon, title, description, action, actionLabel, size = 'md' }) {
  const sizes = { sm: 'py-8', md: 'py-16', lg: 'py-24' }
  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizes[size]} px-6`}>
      {icon && <div className="text-4xl mb-4 text-brand-200">{icon}</div>}
      <p className="text-base font-bold text-text-primary mb-1">{title}</p>
      {description && <p className="text-sm text-text-muted max-w-xs mb-4">{description}</p>}
      {action && actionLabel && (
        <Button onClick={action} variant="primary" size="sm">{actionLabel}</Button>
      )}
    </div>
  )
}

/**
 * Skeleton card row
 */
export function SkeletonCard({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-base skeleton-card rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}

/**
 * Spinner
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-[2.5px]', lg: 'w-9 h-9 border-[3px]' }
  return (
    <span className={`inline-block rounded-full border-border border-t-brand-500 animate-spin ${sizes[size]} ${className}`} />
  )
}

/**
 * SectionHeader — title + "See all •" row
 */
export function SectionHeader({ title, onSeeAll, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      {onSeeAll && (
        <button onClick={onSeeAll} className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
          See all
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — OVERLAYS & FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modal — centred dialog (web)
 * Props: isOpen, onClose, title, size ('sm'|'md'|'lg'|'xl'), children, footer
 */
export function Modal({ isOpen, onClose, title, size = 'md', children, footer, className = '' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const widths = { sm: 'max-w-modal-sm', md: 'max-w-modal-md', lg: 'max-w-modal-lg', xl: 'max-w-modal-xl' }

  return (
    <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-modal p-4 animate-fade-in">
      <div
        className={`modal-box bg-bg-card rounded-3xl shadow-modal w-full ${widths[size]} max-h-[90vh] overflow-y-auto p-7 animate-scale-in relative ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex items-center justify-between mb-5">
          {title && <h2 className="text-xl font-bold text-text-primary">{title}</h2>}
          <button onClick={onClose} className="modal-close w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-50 text-text-muted hover:text-text-primary transition-colors ml-auto">
            ✕
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer flex items-center justify-end gap-3 mt-6 pt-5 border-t border-border-light">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * BottomSheet — mobile slide-up panel
 */
export function BottomSheet({ isOpen, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-modal animate-fade-in" onClick={onClose} />
      <div className={`bottom-sheet fixed bottom-0 left-0 right-0 bg-bg-card rounded-t-[20px] shadow-modal z-modal animate-slide-up pb-safe ${className}`}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mt-3 mb-5" />
        {title && <p className="text-base font-bold text-text-primary px-5 mb-4">{title}</p>}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </>
  )
}

/**
 * ConfirmModal — confirm/cancel dialog
 */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <p className="text-lg font-bold text-text-primary mb-2">{title}</p>
        {message && <p className="text-sm text-text-muted">{message}</p>}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="md" onClick={onConfirm} loading={loading} className="flex-1">{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}

// Toast context
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const show = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container */}
      <div className="toast-wrap fixed bottom-20 left-1/2 -translate-x-1/2 z-toast flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`toast flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold text-white shadow-modal pointer-events-auto animate-fade-up whitespace-nowrap max-w-xs
            ${t.type === 'success' ? 'bg-success-600' : t.type === 'error' ? 'bg-error-600' : t.type === 'warning' ? 'bg-warning-600' : 'bg-brand-500'}`}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '×' : t.type === 'warning' ? '!' : 'i'}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6 — NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BottomTabBar — mobile app bottom navigation
 * Props: tabs [{key, label, icon, activeIcon}], active, onChange
 */
export function BottomTabBar({ tabs = [], active, onChange }) {
  return (
    <nav className="mobile-bottomnav fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border-light shadow-nav flex items-start pt-2 pb-safe z-40">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`bottom-tab-item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors duration-150
            ${active === tab.key ? 'text-brand-500' : 'text-text-muted'}`}
        >
          <span className="text-xl">{active === tab.key ? (tab.activeIcon || tab.icon) : tab.icon}</span>
          <span className={`text-[10px] font-${active === tab.key ? 'bold' : 'medium'}`}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

/**
 * MobileTopNav — mobile screen header (back + title + action)
 */
export function MobileTopNav({ title, onBack, action, className = '' }) {
  return (
    <header className={`mobile-topnav fixed top-0 left-0 right-0 h-15 flex items-center justify-between px-4 bg-bg-app z-40 ${className}`}>
      {onBack ? (
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      ) : <div className="w-9" />}

      {title && <h1 className="text-base font-bold text-text-primary">{title}</h1>}

      {action ? action : <div className="w-9" />}
    </header>
  )
}

/**
 * TabBar — horizontal tab switcher (Orders / Kitchen / All)
 * Props: tabs [{key, label}], active, onChange, variant ('underline'|'pill')
 */
export function TabBar({ tabs = [], active, onChange, variant = 'underline' }) {
  if (variant === 'pill') {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150
              ${active === tab.key ? 'bg-brand-500 text-white font-semibold' : 'bg-bg-card border border-border text-text-muted hover:text-brand-500 hover:border-brand-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="tab-bar flex border-b border-border-light bg-bg-card">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`tab-item flex-1 py-3 text-sm font-medium text-center border-b-2 transition-all duration-150
            ${active === tab.key ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent text-text-muted hover:text-brand-500'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Breadcrumb — admin page breadcrumb trail
 */
export function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted">/</span>}
          {item.href ? (
            <a href={item.href} className="text-text-muted hover:text-brand-500 transition-colors">{item.label}</a>
          ) : (
            <span className="text-text-primary font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/**
 * Pagination
 */
export function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)

  return (
    <div className="table-pagination flex items-center justify-between px-4 py-3.5 border-t border-border-light">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-prev flex items-center gap-1 text-sm font-medium text-text-secondary disabled:opacity-40 hover:text-brand-500 transition-colors"
      >
        ← Previous
      </button>

      <div className="pagination-pages flex items-center gap-1">
        {visible.map((p, i, arr) => (
          <>
            {i > 0 && arr[i - 1] !== p - 1 && <span key={`ellipsis-${i}`} className="px-1 text-text-muted text-sm">…</span>}
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`pagination-page w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150
                ${p === currentPage ? 'bg-brand-500 text-white font-bold' : 'text-text-secondary hover:bg-brand-50 hover:text-brand-500'}`}
            >
              {p}
            </button>
          </>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-next flex items-center gap-1 text-sm font-medium text-text-secondary disabled:opacity-40 hover:text-brand-500 transition-colors"
      >
        Next →
      </button>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7 — ADMIN TABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DataTable — admin data table with golden header, hover rows, pagination
 * Props:
 *   columns: [{ key, label, render?, width? }]
 *   data: []
 *   loading: bool
 *   pagination: { current, total, onChange }
 *   onRowClick: fn
 *   selectable: bool
 *   selected: []
 *   onSelect: fn
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  pagination,
  onRowClick,
  selectable = false,
  selected = [],
  onSelect,
  emptyMessage = 'No data found',
  className = '',
}) {
  const allSelected = data.length > 0 && selected.length === data.length
  const toggleAll = () => onSelect?.(allSelected ? [] : data.map((_, i) => i))
  const toggleRow = (i) => onSelect?.(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i])

  return (
    <div className={`tastr-table-wrap bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="tastr-table w-full border-collapse">
          <thead>
            <tr>
              {selectable && (
                <th className="bg-brand-500 text-white px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="tastr-checkbox accent-white" />
                </th>
              )}
              <th className="bg-brand-500 text-white text-xs font-semibold px-4 py-3 text-left w-10">#</th>
              {columns.map(col => (
                <th key={col.key} className="bg-brand-500 text-white text-xs font-semibold px-4 py-3 text-left whitespace-nowrap" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-light">
                  {selectable && <td className="px-4 py-3"><div className="skeleton-base w-4 h-4" /></td>}
                  <td className="px-4 py-3"><div className="skeleton-base h-3 w-4" /></td>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3"><div className="skeleton-base h-3 w-24" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 2 : 1)} className="py-12 text-center text-text-muted text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border-light last:border-0 transition-colors duration-100
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${selected.includes(i) ? 'bg-brand-50' : 'hover:bg-brand-50'}`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleRow(i) }}>
                      <input type="checkbox" checked={selected.includes(i)} readOnly className="tastr-checkbox" />
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-text-muted">{i + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-text-primary">
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 1 && (
        <Pagination
          currentPage={pagination.current}
          totalPages={pagination.total}
          onPageChange={pagination.onChange}
        />
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 8 — LAYOUT SHELLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AdminSidebar — full web admin sidebar with sections, items, and sub-items
 * Props: items: [{label, icon, key, children:[{label, key}]}], active, onNavigate, logo
 */
export function AdminSidebar({ items = [], active, onNavigate, logo = 'Tastr' }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <aside className="sidebar fixed top-0 left-0 h-screen w-sidebar bg-bg-card border-r border-border-light shadow-sidebar flex flex-col overflow-y-auto z-40">
      {/* Logo */}
      <div className="sidebar-logo px-5 py-5 border-b border-border-light">
        <span className="text-2xl font-extrabold text-brand-500 tracking-tight">{logo}</span>
      </div>

      <nav className="flex-1 py-4">
        {items.map(item => (
          <div key={item.key}>
            {item.section ? (
              <p className="sidebar-section-label px-5 pt-4 pb-1 text-[10px] font-bold tracking-widest uppercase text-text-muted">
                {item.label}
              </p>
            ) : (
              <>
                <button
                  onClick={() => item.children ? toggle(item.key) : onNavigate(item.key)}
                  className={`sidebar-item w-full flex items-center justify-between px-3.5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${active === item.key || active?.startsWith?.(item.key)
                      ? 'bg-brand-100 text-brand-600 font-semibold'
                      : 'text-text-secondary hover:bg-brand-50 hover:text-brand-500'
                    }`}
                  style={{ width: 'calc(100% - 16px)' }}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    {item.label}
                  </span>
                  {item.children && (
                    <svg className={`w-3.5 h-3.5 transition-transform ${expanded[item.key] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {item.children && expanded[item.key] && (
                  <div className="ml-2">
                    {item.children.map(sub => (
                      <button
                        key={sub.key}
                        onClick={() => onNavigate(sub.key)}
                        className={`sidebar-subitem w-full text-left pl-10 pr-4 py-2 text-sm rounded-lg mx-1 transition-all duration-150
                          ${active === sub.key ? 'text-brand-500 font-semibold' : 'text-text-muted hover:text-brand-500 hover:bg-brand-50'}`}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

/**
 * PageHeader — consistent admin/restaurant page heading
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && <div className="mb-2"><Breadcrumb items={breadcrumbs} /></div>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT EXPORT — convenience barrel
// ─────────────────────────────────────────────────────────────────────────────
export default {
  // Buttons
  Button, IconButton, QtyStepper, AmountPill,
  // Forms
  Input, PasswordInput, SearchInput, OtpInput, Textarea, Toggle, PromoCodeInput, Select,
  // Cards
  Card, MetricCard, RestaurantCard, MenuItemCard, CartItem, OrderCard,
  DeliveryCard, GiftCard, AddressCard, PriceBreakdown, SubscriptionPlanCard,
  // Display
  Badge, Avatar, Rating, CategoryChip, OrderStatusBar, ProgressBar, EmptyState, SkeletonCard, Spinner, SectionHeader,
  // Overlays
  Modal, BottomSheet, ConfirmModal, ToastProvider, useToast,
  // Navigation
  BottomTabBar, MobileTopNav, TabBar, Breadcrumb, Pagination,
  // Admin
  DataTable,
  // Layout
  AdminSidebar, PageHeader,
}
