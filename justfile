# Publish recipe: automatically bumps patch version, builds, and publishes to npm
publish:
    npm version patch
    npm run build
    npm publish

# Version bump recipes for npm (updates package.json and creates a git tag)
# Usage:
#   just bump         # bump patch version (default)
#   just bump-patch   # bump patch version
#   just bump-minor   # bump minor version
#   just bump-major   # bump major version

bump:
    npm version patch

bump-patch:
    npm version patch

bump-minor:
    npm version minor

bump-major:
    npm version major
