import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  return (
    <Link to="/" className={`inline-block ${className}`}>
      <img 
        src="/fastcheckin-logo.png" 
        alt="FastCheckin" 
        className={`${sizes[size]} w-auto object-contain`}
      />
    </Link>
  );
}
