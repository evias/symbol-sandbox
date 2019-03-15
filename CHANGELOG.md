# CHANGELOG

## v0.1.1

- Added `nem2-sandbox reader mosaicAmountView`
- Added `nem2-sandbox reader namespaceInfo`
- Added `nem2-sandbox reader mosaicInfo`
- Added `nem2-sandbox transaction transferToAlias`
- Fixed multisignature (aggregate bonded) display

## v0.1.0

- Added `nem2-sandbox transaction accountPropertyAddress`
- Added `nem2-sandbox transaction accountPropertyEntityType`
- Added `nem2-sandbox transaction accountPropertyMosaic`
- Added `nem2-sandbox transaction convertMultisig`
- Added `nem2-sandbox transaction transferMultisig`
- Added `nem2-sandbox transaction cosignMultisig`
- Fixed `nem2-sandbox transaction secretLock`
- Fixed `nem2-sandbox transaction secretProof`

## v0.0.9

- Added `nem2-sandbox aggregate batchTransfer`
- Added `nem2-sandbox aggregate multiLevelNamespace`
- Added `nem2-sandbox aggregate mosaicConfiguration`
- Added `nem2-sandbox aggregate mosaicDefinition`

## v0.0.8

- several bugfixes and re-organization

## v0.0.7

- bugfixes and added reader commands

## v0.0.6

- Added `nem2-sandbox reader mosaicAlias`
- Added `nem2-sandbox reader addressAlias`
- Added `nem2-sandbox transaction transferAlias`
- Added `nem2-sandbox transaction unlinkMosaicAlias`
- Added `nem2-sandbox transaction unlinkAddressAlias`
- Fíxed aggregateMosaicCreation
- Fixed mosaicDefinition

## v0.0.5
- Added use of NetworkCurrencyMosaic
- Fixed send by alias
- Added reader `nem2-sandbox reader lastBlock`
- Added reader `nem2-sandbox reader readMosaicAlias`
- Fixed Private Key reader

## v0.0.4

- Added separate listeners for block/addresses
- Added multiple accounts configuration
- Added `nem2-sandbox convert address`
- Added `nem2-sandbox convert serial`
- Added `nem2-sandbox cow addressAlias`
- Added `nem2-sandbox cow mosaicAlias`
- Fixed mosaicDefinition and aggregate
- Added subnamespace in `cow registerNamespace`

## v0.0.3

- Added better command definitions
- Added `nem2-sandbox cow transfer`
- Added `nem2-sandbox cow hashlock`
- Added `nem2-sandbox cow aggregate`
- Added `nem2-sandbox cow mosaicDefinition`
- Added `nem2-sandbox cow registerNamespace`
- Added `nem2-sandbox cow secretLock`
- Added `nem2-sandbox cow aggregateMosaicCreation`

## v0.0.2

- Base command line interface
- Implement OptionsResolver
- Added command convert for UInt64
- Added command cow tester for cow compatibility

## v0.0.1

- Implement base cow feature tests
- Using local clones of nem2-sdk and nem2-library
