import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  id,
  icon: LeftIcon,
  autoComplete = 'off',
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="mt-1.5 relative">
      {LeftIcon && (
        <LeftIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      )}
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={{ fontSize: '16px' }}
        className="w-full bg-transparent border-b border-gray-300 pl-6 pr-8 py-2 text-[#0E2036] placeholder-gray-400 focus:outline-none focus:border-[#C9A227] transition-colors"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E2036] cursor-pointer"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default PasswordInput;