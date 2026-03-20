import { Link } from 'react-router-dom';

interface LogoProps {
  showSlogan?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  imageOnly?: boolean;
}

export default function Logo({ 
  showSlogan = true, 
  size = 'md', 
  className = '',
  showText = true,
  imageOnly = false
}: LogoProps) {
  const sizes = {
    sm: {
      logo: 'text-xl',
      slogan: 'text-xs',
      image: 'h-8'
    },
    md: {
      logo: 'text-2xl',
      slogan: 'text-sm',
      image: 'h-10'
    },
    lg: {
      logo: 'text-3xl',
      slogan: 'text-base',
      image: 'h-12'
    }
  };

  return (
    <Link to="/" className={`flex flex-col items-center ${className}`}>
      {/* Logo Image */}
      <img 
        src="/fastcheckin-logo.png" 
        alt="FastCheckin" 
        className={`${sizes[size].image} w-auto object-contain mb-1`}
      />
      
      {/* Optional text */}
      {!imageOnly && showText && (
        <>
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
        </>
      )}
    </Link>
  );
}
