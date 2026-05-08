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

echo "checking current env settings"
if [ ! -f ".dev.vars" ]; then
    echo ".dev.vars not found"
    exit 1
fi

set -a
source .dev.vars
set +a

if [ "$NEXTJS_ENV" = "development" ]; then 
    echo "detected dev mode settings"
    if [ ! -f ".env.development.local" ]; then 
        echo ".env.development.local not found, trying to detect zip file to build variables"
        if [ ! -f "checkers-dev-vars.zip" ]; then
            echo "checkers-dev-vars.zip file not found, check with project lead to dump into current directory"
            exit 1
        else 
            echo "unpacking dev variables..."
            unzip -o checkers-dev-vars.zip
            echo "unpacked dev variables"
        fi
    else 
        echo "detected .env.development.local"
    fi
else 
    echo "not in development mode, please set up environment yourself"
fi

echo "environment variables initiated"

echo "bootstrap completed"