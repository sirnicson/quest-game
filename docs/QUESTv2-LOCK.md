# QUESTv2 — Locked Release

**Release:** QUEST Game Version 2  
**Version:** 2.0.0  
**Status:** Locked

This project snapshot is the approved, frozen Version 2 of the QUEST Game. Its gameplay, screen flows, visual design, wording, and bundled assets are considered final for this release.

## Change policy

Do not make further changes to the locked Version 2 baseline. Any new features, content changes, visual revisions, or refactors belong in a new version (Version 3 or later), based on a separately preserved copy of this release.

Bug fixes required to make Version 2 run as documented should be recorded explicitly as maintenance exceptions and must not be used to introduce new scope.

## Verification

The Version 2 baseline passes the project test suite (`node --test`) and build check (`node scripts/build-check.mjs`).

This workspace does not currently have Git metadata, so the lock is documented in the project files and package version rather than recorded as a Git tag or protected commit.
