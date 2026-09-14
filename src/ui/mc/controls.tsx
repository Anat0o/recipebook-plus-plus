/**
 * Элементы управления в стиле iOS.
 *
 * Всё здесь живёт в слое управления: стекло, системный шрифт, зоны нажатия
 * не меньше 44×44 pt. Контент рисуется отдельно, ванильным GUI Minecraft.
 */
import { useId } from 'react'

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}): React.ReactElement {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  return (
    <div
      className="segmented"
      role="tablist"
      aria-label={label}
      style={{ '--segments': options.length, '--selected': index } as React.CSSProperties}
    >
      <span className="segmented__indicator" aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`segmented__item${option.value === value ? ' is-selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}): React.ReactElement {
  const id = useId()
  return (
    <div className="toggle-row">
      <label htmlFor={id} className="toggle-row__label">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__knob" aria-hidden />
      </button>
    </div>
  )
}

export function LevelSlider({
  value,
  max,
  onChange,
  label,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
}): React.ReactElement {
  const id = useId()
  return (
    <div className="slider-row">
      <label htmlFor={id} className="slider-row__label">
        {label}
        <span className="slider-row__value">{value > 0 ? romanize(value) : '—'}</span>
      </label>
      <input
        id={id}
        className="slider"
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export function romanize(level: number): string {
  return ROMAN[level] ?? String(level)
}

export function SearchField({
  value,
  onChange,
  placeholder,
  clearLabel,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  clearLabel: string
  autoFocus?: boolean
}): React.ReactElement {
  return (
    <div className="search-field">
      <svg className="search-field__icon" viewBox="0 0 20 20" aria-hidden focusable="false">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M8.5 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm4 9.5L17 17"
        />
      </svg>
      <input
        className="search-field__input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' ? (
        <button type="button" className="search-field__clear" onClick={() => onChange('')} aria-label={clearLabel}>
          ✕
        </button>
      ) : null}
    </div>
  )
}
