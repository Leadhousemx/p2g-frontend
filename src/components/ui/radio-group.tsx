import * as React from "react";

export function RadioGroup({ value, onValueChange, children, className = "", ...props }: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={className} {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { checked: child.props.value === value, onChange: () => onValueChange(child.props.value) })
          : child
      )}
    </div>
  );
}

export function RadioGroupItem({ value, checked, onChange, id, ...props }: {
  value: string;
  checked?: boolean;
  onChange?: () => void;
  id?: string;
}) {
  return (
    <input
      type="radio"
      id={id || value}
      name="radio-group"
      value={value}
      checked={checked}
      onChange={onChange}
      className="accent-blue-600 w-4 h-4 mr-1 align-middle"
      aria-checked={checked}
      {...props}
    />
  );
}
