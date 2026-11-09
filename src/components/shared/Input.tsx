"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, ...props }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="input-3d w-full px-3 py-2 text-base"
        {...props}
      />
    </div>
  );
}
