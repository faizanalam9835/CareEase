/** The CareEase "CE" mark. One file (public/favicon.svg) serves the tab icon and every in-app logo. */
const Logo = ({ className = 'h-9 w-9' }: { className?: string }) => (
  <img src="/favicon.svg" alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
);

export default Logo;
