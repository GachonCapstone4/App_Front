type MailyBrandMarkProps = {
  className?: string;
};

export function MailyBrandMark({ className = "h-10 w-10" }: MailyBrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="64" y="64" width="896" height="896" rx="224" fill="#102033" />
      <rect
        x="168"
        y="382"
        width="688"
        height="184"
        rx="92"
        fill="#2DD4BF"
        transform="rotate(-18 512 474)"
      />
      <circle cx="744" cy="284" r="72" fill="#38BDF8" />
      <path
        d="M330 666V392L512 548L694 392V666"
        stroke="white"
        strokeWidth="76"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
