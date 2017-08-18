# Release

## Create a new prepare-{version} branch

* Upgrade the version number (i.e: 1.7.0):
  * Update `package.json` version number
  * Update `src/manifest.json` version number
  * Update `src/background.js` version number
  * Update `CHANGELOG.md`

```
export version=1.7.0
git checkout -b "prepare-${version}"
git commit -am "Preparing ${version} release"
git push origin "prepare-${version}" -u
```

* Create a pull-request and have it reviewed.

## Update master

```
git checkout master
git merge --no-ff prepare-${version}
git tag ${version}
```

## Update production

Merge master in the production branch.

```
git checkout production
git merge master
git push origin production
```

## Upgrade master for the next version

* Upgrade to next version in dev (i.e 1.8.0dev):
  * Update `package.json` next version number
  * Update `src/manifest.json` next version number
  * Update `src/background.js` next version number
  * Prepare `CHANGELOG.md` for the next release

```
git commit -am "Back to development"
git push
git push --tags
```
