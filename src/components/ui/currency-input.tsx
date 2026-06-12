import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChangeValue: (value: string) => void;
}

export function CurrencyInput({ value, onChangeValue, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number with dots: 1000000 -> "1.000.000"
  const formatWithDots = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const valStr = val.toString();
    const isNegative = valStr.startsWith('-');
    const numericStr = valStr.replace(/[^0-9]/g, '');
    if (!numericStr) return isNegative ? '-' : '';
    const formatted = numericStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return isNegative ? '-' + formatted : formatted;
  };

  useEffect(() => {
    setDisplayValue(formatWithDots(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    const isNegative = valStr.startsWith('-');
    const numericStr = valStr.replace(/[^0-9]/g, '');
    const rawValue = isNegative ? '-' + numericStr : numericStr;
    
    setDisplayValue(formatWithDots(rawValue));
    onChangeValue(rawValue);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
}
