#!/usr/bin/env bash

set -e

echo "starting bootstrap"

if command -v pnpm >/dev/null 2>&1; then
    echo "pnpm installed"
else
    echo "pnpm not found, installing..."
    case "$(uname -s)" in
        Darwin)
            echo "mac os detected, installing with brew"
            if command -v brew >/dev/null 2>&1; then
                brew install pnpm
            else
                echo "brew not found, please install brew."
                exit 1
            fi
        ;;
        Linux)
            echo "linux detected, installing with corepack"
            if command -v corepack >/dev/null 2>&1; then
                corepack enable
                corepack prepare pnpm@latest --activate
            else
                echo "corepack not found, please install corepack"
                exit 1
            fi
        ;;
        *)
            echo "your operating system is not currently support by this bootstrap script"
            exit 1
        ;;
    esac
fi

echo "pnpm installed"

if ! command -v node >/dev/null 2>&1; then
    echo "please install node first"
    exit 1
fi

echo "installing dependencies"
pnpm install

echo "verifying install"
echo "-----------------"
echo "pnpm: $(pnpm -v)"
echo "node: $(node -v)"

echo "bootstrap completed"