import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-40'
  };

  return (
    <Link to="/" className={`inline-block ${className}`}>
      <img 
        src="/fastcheckin-logo.png" 
        alt="FastCheckin" 
        className={`${sizes[size]} h-auto`}
      />
    </Link>
  );
}
