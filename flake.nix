{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    build-node-modules.url = "github:aabccd021/build-node-modules";
  };

  outputs = { self, nixpkgs, treefmt-nix, build-node-modules }:

    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;

      nodeModules = build-node-modules.lib.buildNodeModules pkgs ./package.json ./package-lock.json;

      treefmtEval = treefmt-nix.lib.evalModule pkgs {
        projectRootFile = "flake.nix";
        programs.prettier.enable = true;
        programs.nixpkgs-fmt.enable = true;
        programs.biome.enable = true;
        programs.shfmt.enable = true;
        settings.formatter.prettier.priority = 1;
        settings.formatter.biome.priority = 2;
        settings.global.excludes = [ "LICENSE" ];
      };

      tsc = pkgs.runCommandNoCCLocal "tsc" { } ''
        cp -L ${./freeze-page.ts} ./freeze-page.ts
        cp -L ${./freeze-page.test.ts} ./freeze-page.test.ts
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${./stories} ./stories
        cp -Lr ${nodeModules} ./node_modules
        ${pkgs.typescript}/bin/tsc
        touch $out
      '';

      biome = pkgs.runCommandNoCCLocal "biome" { } ''
        cp -L ${./biome.jsonc} ./biome.jsonc
        cp -L ${./freeze-page.ts} ./freeze-page.ts
        cp -L ${./freeze-page.test.ts} ./freeze-page.test.ts
        cp -L ${./package.json} ./package.json
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${./stories} ./stories
        cp -Lr ${nodeModules} ./node_modules
        ${pkgs.biome}/bin/biome check --error-on-warnings
        touch $out
      '';

      exportHookJs = pkgs.fetchurl {
        url = "https://unpkg.com/export-hook-js@latest/dist/export-hook.esnext.js";
        hash = "sha256-1duEckbWp4kmIm4LtYwzig0Wb1/Vp1gXmWswBtcuYVA=";
      };

      invokeHookJs = pkgs.fetchurl {
        url = "https://unpkg.com/export-hook-js@latest/dist/invoke-hook.esnext.js";
        hash = "sha256-QZ99/CdkZ8DtTWbYB8gjXkrJU7OmutioJerJO3ne+vA=";
      };

      serve = pkgs.writeShellApplication {
        name = "serve";
        text = ''
          root="$(pwd)"
          if command -v git &> /dev/null; then
            root=$(git rev-parse --show-toplevel)
          fi
          cp -L ${exportHookJs} ./stories/export-hook.js
          cp -L ${invokeHookJs} ./stories/invoke-hook.js
          chmod 600 ./stories/*.js
          ${pkgs.esbuild}/bin/esbuild  "$root/freeze-page.ts" \
            --bundle \
            --target=esnext \
            --format=esm \
            --outdir="$root/stories" \
            --servedir="$root/stories" \
            --watch
        '';
      };

      tests = pkgs.runCommandNoCCLocal "tests"
        {
          buildInputs = [ pkgs.nodejs serve ];
        } ''
        export XDG_CONFIG_HOME="$(pwd)"
        export XDG_CACHE_HOME="$(pwd)"
        export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
        cp -L ${./freeze-page.ts} ./freeze-page.ts
        cp -L ${./freeze-page.test.ts} ./freeze-page.test.ts
        cp -L ${./package.json} ./package.json
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -Lr ${nodeModules} ./node_modules
        cp -Lr ${./stories} ./stories
        chmod -R 700 ./stories
        node_modules/playwright/cli.js test
        touch $out
      '';

      dist = pkgs.runCommandNoCCLocal "dist" { } ''
        mkdir  $out
        ${pkgs.esbuild}/bin/esbuild ${./freeze-page.ts} \
          --bundle \
          --format=esm \
          --target=esnext \
          --sourcemap \
          --outfile="$out/freeze-page.esnext.js"
        ${pkgs.esbuild}/bin/esbuild ${./freeze-page.ts} \
          --bundle \
          --format=esm \
          --target=esnext \
          --minify \
          --sourcemap \
          --outfile="$out/freeze-page.esnext.min.js"
        ${pkgs.esbuild}/bin/esbuild ${./freeze-page.ts} \
          --bundle \
          --format=esm \
          --target=es6 \
          --minify \
          --sourcemap \
          --outfile="$out/freeze-page.min.js"
      '';

      publish = pkgs.writeShellApplication {
        name = "publish";
        text = ''
          published_version=$(npm view . version)
          current_version=$(${pkgs.jq}/bin/jq -r .version package.json)
          if [ "$published_version" = "$current_version" ]; then
            echo "Version $current_version is already published"
            exit 0
          fi
          echo "Publishing version $current_version"

          nix flake check
          NPM_TOKEN=''${NPM_TOKEN:-}
          if [ -n "$NPM_TOKEN" ]; then
            npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
          fi
          dist_result=$(nix build --no-link --print-out-paths .#dist)
          rm -rf dist
          mkdir dist
          cp -Lr "$dist_result"/* dist
          chmod 400 dist/*
          npm publish 
        '';
      };

      packages = {
        formatting = treefmtEval.config.build.check self;
        tsc = tsc;
        dist = dist;
        biome = biome;
        nodeModules = nodeModules;
        tests = tests;
        publish = publish;
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
        buildInputs = [
          serve
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
        ];
      };

      apps.x86_64-linux.publish = {
        type = "app";
        program = "${publish}/bin/publish";
      };

    };
}
