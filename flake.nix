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
        settings.global.excludes = [ "LICENSE" "*.ico" ];
      };

      tsc = pkgs.runCommandNoCCLocal "tsc" { } ''
        cp -L ${./freeze.ts} ./freeze.ts
        cp -L ${./freeze.test.ts} ./freeze.test.ts
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${./fixtures} ./fixtures
        cp -Lr ${nodeModules} ./node_modules
        ${pkgs.typescript}/bin/tsc
        touch $out
      '';

      biome = pkgs.runCommandNoCCLocal "biome" { } ''
        cp -L ${./biome.jsonc} ./biome.jsonc
        cp -L ${./freeze.ts} ./freeze.ts
        cp -L ${./freeze.test.ts} ./freeze.test.ts
        cp -L ${./package.json} ./package.json
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${./fixtures} ./fixtures
        cp -Lr ${nodeModules} ./node_modules
        ${pkgs.biome}/bin/biome check --error-on-warnings
        touch $out
      '';

      snapshot-min-js = pkgs.runCommandNoCCLocal "snapshot-min-js" { } ''
        mkdir -p "$out/fixtures"
        ${pkgs.esbuild}/bin/esbuild ${./freeze.ts} \
          --target=es6 \
          --format=esm \
          --bundle \
          --minify \
          --outfile="$out/fixtures/freeze.js"
      '';

      tests = pkgs.runCommandNoCCLocal "tests"
        {
          buildInputs = [
            pkgs.nodejs
            pkgs.httplz
          ];
        } ''
        export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers-chromium}
        export DISABLE_TEST_CHROMIUM_BFCACHE=1
        export DISABLE_TEST_FIREFOX_NOBFCACHE=1
        cp -L ${./freeze.test.ts} ./freeze.test.ts
        cp -L ${./package.json} ./package.json
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${nodeModules} ./node_modules

        cp -Lr ${./fixtures} ./fixtures
        chmod -R 700 ./fixtures
        cp -L ${snapshot-min-js}/fixtures/* ./fixtures

        node_modules/playwright/cli.js test
        touch $out
      '';

      packages = {
        formatting = treefmtEval.config.build.check self;
        tsc = tsc;
        biome = biome;
        nodeModules = nodeModules;
        tests = tests;
        snapshot-min-js = snapshot-min-js;
      };

      gcroot = packages // {
        gcroot-all = pkgs.linkFarm "gcroot-all" packages;
      };
    in

    {

      checks.x86_64-linux = gcroot;

      packages.x86_64-linux = gcroot;

      formatter.x86_64-linux = treefmtEval.config.build.wrapper;

      devShells.x86_64-linux.default = pkgs.mkShellNoCC {
        shellHook = ''
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers-chromium}
        '';
        buildInputs = [
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
          pkgs.httplz
          pkgs.esbuild
        ];
      };

    };
}
