import * as React from "react";
import { Input } from "./input";

interface FormattedNumberInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  /** Raw digit string (no formatting) */
  value: string;
  /** Called with raw digit string (no dots) */
  onValueChange: (raw: string) => void;
}

/**
 * Number input that displays thousands separators (dots) while typing.
 * Stores and emits raw digit strings — no dots in state.
 */
const FormattedNumberInput = React.forwardRef<
  HTMLInputElement,
  FormattedNumberInputProps
>(({ value, onValueChange, ...props }, outerRef) => {
  const innerRef = React.useRef<HTMLInputElement>(null);
  const cursorRef = React.useRef<number>(0);

  // Merge refs
  const ref = (outerRef as React.RefObject<HTMLInputElement>) || innerRef;
  const inputEl = ref as React.RefObject<HTMLInputElement>;

  const formatDigits = (digits: string): string => {
    if (!digits) return "";
    const n = Number(digits);
    if (isNaN(n)) return digits;
    return n.toLocaleString("de-DE");
  };

  const displayValue = formatDigits(value || "");

  // Restore cursor after re-render
  React.useEffect(() => {
    const el = inputEl.current;
    if (el && document.activeElement === el) {
      el.setSelectionRange(cursorRef.current, cursorRef.current);
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const pos = el.selectionStart || 0;
    const old = el.value;

    // Count how many digits are before the cursor in the current (pre-React-update) value
    const digitsBefore = old
      .slice(0, pos)
      .replace(/[^\d]/g, "").length;

    // Extract only digits
    const digits = old.replace(/[^\d]/g, "");

    // Remove leading zeros (but keep "0" itself)
    const cleaned = digits.replace(/^0+(\d)/, "$1");

    // Format to find new cursor position
    const formatted = formatDigits(cleaned);
    let newPos = 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (count >= digitsBefore) break;
      if (/\d/.test(formatted[i])) count++;
      newPos = i + 1;
    }

    cursorRef.current = newPos;
    onValueChange(cleaned);
  };

  return (
    <Input
      ref={inputEl}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
});

FormattedNumberInput.displayName = "FormattedNumberInput";

export { FormattedNumberInput };
