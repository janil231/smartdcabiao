import { getInitials } from '../../utils/nameFormat';

export default function ReviewerAvatar({ name, size = 'md' }) {
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
