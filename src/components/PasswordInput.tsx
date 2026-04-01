"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}

export default function PasswordInput({
  id,
  name,
  label,
  required = true,
  minLength,
  placeholder,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="w-full rounded border border-gray-300 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
