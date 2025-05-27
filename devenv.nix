{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.nodejs_22
    pkgs.nodePackages.pnpm
  ];
  
  enterShell = ''
  '';
}
