import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function ModernSelect({
  ariaLabel,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  variant = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const generatedId = useId();
  const listId = `${id || generatedId}-listbox`;
  const selected =
    options.find((option) => String(option.value) === String(value)) ||
    options.find((option) => option.value === "") ||
    options[0];

  useEffect(() => {
    if (!open) return;

    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(option) {
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(event) {
    if (disabled) return;

    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();

      if (!open) {
        const index = options.findIndex(
          (option) => String(option.value) === String(value),
        );
        setActive(index >= 0 ? index : 0);
        setOpen(true);
        return;
      }

      if (event.key === "ArrowDown")
        setActive((index) => Math.min(options.length - 1, index + 1));
      else if (event.key === "ArrowUp")
        setActive((index) => Math.max(0, index - 1));
      else choose(options[active]);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`modern-select${variant ? ` ${variant}` : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="modern-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (!open) {
            const index = options.findIndex(
              (option) => String(option.value) === String(value),
            );
            setActive(index >= 0 ? index : 0);
          }
          setOpen((current) => !current);
        }}
        onKeyDown={onKeyDown}
      >
        <span className="modern-select-value">{selected?.label ?? ""}</span>
        <ChevronDown size={15} className="modern-select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="modern-select-panel" role="listbox" id={listId} aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);

            return (
              <button
                type="button"
                key={String(option.value)}
                role="option"
                data-value={option.value}
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`modern-select-option${index === active ? " active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
