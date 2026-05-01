const Logo = () => (
  <a href="#top" className="flex items-center group">
    <img src="/logo.png" className="h-12 w-auto mr-3 transition-transform group-hover:scale-105" alt="GrammaBG Logo" />
    <span className="font-display text-xl font-bold tracking-tight text-foreground">
      Gramma<span className="text-gradient-emerald">BG</span>
    </span>
  </a>
);

export default Logo;
