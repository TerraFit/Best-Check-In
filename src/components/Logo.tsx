import { Link } from 'react-router-dom';

interface LogoProps {
  showSlogan?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ showSlogan = true, size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: {
      logo: 'text-xl',
      slogan: 'text-xs'
    },
    md: {
      logo: 'text-2xl',
      slogan: 'text-sm'
    },
    lg: {
      logo: 'text-3xl',
      slogan: 'text-base'
    }
  };

  return (
    <Link to="/" className={`flex flex-col ${className}`}>
      <div className="flex items-center">
        <span className={`font-bold text-orange-500 ${sizes[size].logo}`}>
          FastCheckin
        </span>
      </div>
      {showSlogan && (
        <span className={`text-gray-500 ${sizes[size].slogan}`}>
          Seamless Check-in, Smarter Stay
        </span>
      )}
    </Link>
  );
}
