{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    project-utils = {
      url = "github:aabccd021/project-utils";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, treefmt-nix, project-utils }:

    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      utilLib = project-utils.lib;
      nodeModules = utilLib.buildNodeModules.fromLockJson ./package.json ./package-lock.json;

      treefmtEval = treefmt-nix.lib.evalModule pkgs {
        projectRootFile = "flake.nix";
        programs.prettier.enable = true;
        programs.nixpkgs-fmt.enable = true;
        programs.biome.enable = true;
        programs.shfmt.enable = true;
        settings.formatter.prettier.priority = 1;
        settings.formatter.biome.priority = 2;
      };

      tsc = pkgs.runCommandLocal "tsc" { } ''
        cp -Lr ${nodeModules} ./node_modules
        cp -Lr ${./freeze.ts} ./freeze.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        ${pkgs.typescript}/bin/tsc
        touch $out
      '';

      biome = pkgs.runCommandLocal "biome" { } ''
        cp -Lr ${nodeModules} ./node_modules
        cp -L ${./biome.jsonc} ./biome.jsonc
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -L ${./package.json} ./package.json
        cp -Lr ${./freeze.ts} ./freeze.ts
        ${pkgs.biome}/bin/biome check --error-on-warnings
        touch $out
      '';

      packages = {
        formatting = treefmtEval.config.build.check self;
        tsc = tsc;
        biome = biome;
        nodeModules = nodeModules;
      };

    in

    {

      checks.x86_64-linux = packages;

      packages.x86_64-linux = packages;

      formatter.x86_64-linux = treefmtEval.config.build.wrapper;

      devShells.x86_64-linux.default = pkgs.mkShellNoCC {
        shellHook = ''
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers-chromium}
        '';
        buildInputs = [
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
        ];
      };

    };
}
