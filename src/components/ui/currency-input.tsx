import { NumericFormat } from "react-number-format";
import type { ComponentProps } from "react";
import { Input } from "./input";

type CurrencyInputProps = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> & {
  value: string | number;
  onValueChange: (value: string) => void;
};

/** Displays BRL while passing only a canonical numeric string to the form. */
export function CurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  return <NumericFormat
    {...props}
    customInput={Input}
    type="text"
    inputMode="decimal"
    value={value}
    valueIsNumericString
    onValueChange={(values) => onValueChange(values.value)}
    prefix="R$ "
    thousandSeparator="."
    decimalSeparator=","
    allowedDecimalSeparators={[","]}
    decimalScale={2}
    fixedDecimalScale
    allowNegative={false}
  />;
}