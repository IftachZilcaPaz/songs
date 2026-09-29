"use client";

import { useId } from "react";
import type { Tone } from "./theme";

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
  /** Emoji shown in a colored badge. */
  readonly icon?: string;
  /** Pastel tone from theme.ts, used for the badge and the selected state. */
  readonly tone?: Tone;
}

interface ChipFieldsetProps<T extends string> {
  readonly legend: string;
  readonly options: readonly ChipOption<T>[];
  readonly type: "radio" | "checkbox";
  readonly isChecked: (value: T) => boolean;
  readonly isDisabled?: (value: T) => boolean;
  readonly onToggle: (value: T) => void;
}

/** Toggle chips backed by native radio buttons or checkboxes (keyboard and screen-reader friendly). */
function ChipFieldset<T extends string>({ legend, options, type, isChecked, isDisabled, onToggle }: ChipFieldsetProps<T>) {
  const name = useId();
  return (
    <fieldset className="chips">
      <legend>{legend}</legend>
      <div className="chips__list">
        {options.map((option) => {
          const checked = isChecked(option.value);
          return (
            <label key={option.value} className="chip" data-checked={checked} data-tone={option.tone} data-rich={Boolean(option.icon)}>
              <input
                type={type}
                name={name}
                value={option.value}
                checked={checked}
                disabled={isDisabled?.(option.value)}
                onChange={() => onToggle(option.value)}
              />
              {option.icon && (
                <span className="chip__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="chip__text">
                <span className="chip__label">{option.label}</span>
                {option.hint && <span className="chip__hint">{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface ChipGroupProps<T extends string> {
  readonly legend: string;
  readonly options: readonly ChipOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function ChipGroup<T extends string>({ value, onChange, ...rest }: ChipGroupProps<T>) {
  return <ChipFieldset {...rest} type="radio" isChecked={(option) => option === value} onToggle={onChange} />;
}

interface MultiChipGroupProps<T extends string> {
  readonly legend: string;
  readonly options: readonly ChipOption<T>[];
  readonly value: readonly T[];
  readonly onChange: (value: readonly T[]) => void;
  readonly max?: number;
}

export function MultiChipGroup<T extends string>({ value, onChange, max, options, legend }: MultiChipGroupProps<T>) {
  const selected = new Set(value);
  const atMax = max !== undefined && selected.size >= max;

  const toggle = (option: T) => {
    const next = new Set(selected);
    if (!next.delete(option)) next.add(option);
    // Keep catalog order regardless of click order.
    onChange(options.map((candidate) => candidate.value).filter((candidate) => next.has(candidate)));
  };

  return (
    <ChipFieldset
      legend={legend}
      options={options}
      type="checkbox"
      isChecked={(option) => selected.has(option)}
      isDisabled={(option) => atMax && !selected.has(option)}
      onToggle={toggle}
    />
  );
}
