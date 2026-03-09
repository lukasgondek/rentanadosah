interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 40, className = "" }: LogoProps) => {
  // Use optimized version based on requested size
  const src = size > 200 ? "/logo-400.png" : "/logo-200.png";

  return (
    <img
      src={src}
      alt="Kalkulačka Realitního Rentiéra"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
};

export default Logo;
