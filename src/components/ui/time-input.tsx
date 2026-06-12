import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChangeValue: (value: string) => void;
}

export function TimeInput({ value, onChangeValue, ...props }: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, ''); // Only allow numbers and colon
    
    // Auto-insert colon
    if (val.length === 2 && displayValue.length === 1) {
      val = val + ':';
    }
    
    // Prevent more than 5 chars
    if (val.length > 5) {
      val = val.slice(0, 5);
    }
    
    // Validate HH and MM
    if (val.length >= 2) {
      const hh = parseInt(val.slice(0, 2), 10);
      if (hh > 23) {
        val = '23' + val.slice(2);
      }
    }
    
    if (val.length === 5) {
      const mm = parseInt(val.slice(3, 5), 10);
      if (mm > 59) {
        val = val.slice(0, 3) + '59';
      }
    }

    setDisplayValue(val);
    onChangeValue(val);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM (ví dụ: 14:30)"
      value={displayValue}
      onChange={handleChange}
      maxLength={5}
      {...props}
    />
  );
}
