interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 40, className = "" }: LogoProps) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Kalkulačka Realitního Rentiéra logo"
  >
    {/* Navy rounded square background */}
    <rect width="64" height="64" rx="14" fill="#1b3055" />
    {/* House roof accent */}
    <path
      d="M20 25 L32 15 L44 25"
      stroke="#d4a43c"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* RR text */}
    <text
      x="32"
      y="48"
      textAnchor="middle"
      fill="#d4a43c"
      fontWeight="700"
      fontSize="24"
      fontFamily="Georgia,'Times New Roman',serif"
      letterSpacing="1"
    >
      RR
    </text>
    {/* Small chart line */}
    <path
      d="M22 53 L28 50 L35 52 L42 47"
      stroke="#d4a43c"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.6"
    />
  </svg>
);

export default Logo;
