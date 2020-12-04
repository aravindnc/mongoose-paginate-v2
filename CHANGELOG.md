# Changelog

## v1.3.12

[2020-12-04]

### Added

- New option for custom count function.

## v1.3.11

[2020-11-06]

### Fixed

- estimateDocumentCount implementation.
- Package version updates to support Node v12.

## v1.3.10

[2020-11-01]

### Added

- support for estimatedCountDocuments for larger datasets. Set useEstimatedCount=true

## v1.3.9

[2020-04-02]

### Fixed

- [#54](https://github.com/aravindnc/mongoose-paginate-v2/issues/54)

- [#65](https://github.com/aravindnc/mongoose-paginate-v2/issues/65)

### Added

- Get all docs if pagination is not enabled.
- Support to determines the MongoDB nodes from which to read.
- New option forceCountFn to support $near and $nearSphere (Ref: https://github.com/aravindnc/mongoose-paginate-v2#note)
