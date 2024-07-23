# Changelog

## v1.8.3
[2024-07-23]
* Added support for queryHelpers.

## v1.8.2

[2024-05-29]

* MongoDB < 3.4: Fix for countDocument

## v1.8.1

[2024-05-17]

* Fix #186
* Fix - Use default values for page and limit when passing undefined

## v1.8.0

[2024-01-05]

* Support for Mongoose v8

## v1.7.4

* Set dynamic type for docs items

## v1.7.3

[2023-07-26]

* Fix - set limit when limit is 0

## v1.7.2

* Fix #194

## v1.7.1

* Added support for custom find method.

## v1.7.0

[2022-07-04]

* Added support for sub-document pagination.

[2022-02-28]

* Added support for Mongoose 6

## v1.6.3

[2022-02-28]

* Added support for Mongoose 6

## v1.6.2

[2022-02-11]

* Removed 2D test cases to support Mongoose 6.

## v1.6.1

[2022-02-05]

* Fix: update paginate options typings #154, #156

## v1.6.0

[2022-02-03]

* Added Typescript version.

## v1.5.0

[2022-01-09]

* Added feature: PaginationParameters helper class

## v1.4.3

[2022-01-06]

* Fix hasPrevPage behaviour with limit > offset > 0

## v1.4.2

[2021-08-15]

* Removed 'cursor' text across the project.

## v1.4.1

[2021-07-08]

* Removed test case for allowDiskUse, which cause build to fail on lower MongoDB versions.

## v1.4.0

[2021-07-08]

* Added allowDiskUse option as a workaround for QueryExceededMemoryLimitNoDiskUseAllowed error with large data sets.

## v1.3.18

[2021-05-17]

* Fixed issue #85

## v1.3.17

[2021-03-26]

* Fix for page value is less than 1

## v1.3.16

[2021-02-24]

* Collation fix for MongoDB v3.4 and less.

## v1.3.15

[2021-02-21]

* Fixed issues where no results or incorrect count are returned when using collations.

## v1.3.14

[2021-01-27]

* Fixed issue hasPrevPage and prevPage returned values are not correct at page=1 (#119)

## v1.3.13

[2020-12-22]

### Fixed

* Sorting issue after population.

## v1.3.12

[2020-12-04]

### Added

* New option for custom count function.

## v1.3.11

[2020-11-06]

### Fixed

* estimateDocumentCount implementation.
* Package version updates to support Node v12.

## v1.3.10

[2020-11-01]

### Added

* support for estimatedCountDocuments for larger datasets. Set useEstimatedCount=true

## v1.3.9

[2020-04-02]

### Fixed

* [#54](https://github.com/aravindnc/mongoose-paginate-v2/issues/54)

* [#65](https://github.com/aravindnc/mongoose-paginate-v2/issues/65)

### Added

* Get all docs if pagination is not enabled.
* Support to determines the MongoDB nodes from which to read.
* New option forceCountFn to support $near and $nearSphere (Ref: https://github.com/aravindnc/mongoose-paginate-v2#note)
