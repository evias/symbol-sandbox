<p align="center"><img src="https://nem.io/wp-content/themes/nem/img/logo-nem.svg" width="400"></p>

<p align="center">
<a href="https://travis-ci.org/evias/symbol-sandbox"><img src="https://travis-ci.org/evias/symbol-sandbox.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/evias/symbol-sandbox"><img src="https://poser.pugx.org/evias/symbol-sandbox/d/total.svg" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/evias/symbol-sandbox"><img src="https://poser.pugx.org/evias/symbol-sandbox/v/stable.svg" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/evias/symbol-sandbox"><img src="https://poser.pugx.org/evias/symbol-sandbox/v/unstable" alt="Latest Unstable Version"></a>
<a href="https://packagist.org/packages/evias/symbol-sandbox"><img src="https://poser.pugx.org/evias/symbol-sandbox/license.svg" alt="License"></a>
</p>

This package aims to provide with a command line interface helping developers to communicate with the NEM2 (Catapult) blockchain.

**This package is currently still in development, please do not use in production.**

*The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

Package licensed under [Apache v2.0](LICENSE) License.

## Protocol Compatibility

- [catapult-server@0.9.0.1](https://github.com/nemtech/catapult-server/releases/tag/v0.9.0.1)
- [Fushicho2 Client Diff](https://github.com/evias/symbol-sandbox/compare/v0.8.4..v0.9.2)

## Donations / Pot de vin

Donations can be made with cryptocurrencies and will be used for running the project!

    NEM:       NB72EM6TTSX72O47T3GQFL345AB5WYKIDODKPPYW
    Bitcoin:   3EVqgUqYFRYbf9RjhyjBgKXcEwAQxhaf6o

| Username | Role |
| --- | --- |
| [eVias](https://github.com/evias) | Project Lead |

# Installation

1. Clone the Project

```
git clone https://github.com/evias/symbol-sandbox.git`
```

2. Install the required dependencies.

```
cd symbol-sandbox
npm i
```

3. Configure `conf/accounts.json` and `conf/network.json`

```
In `conf/accounts.json`

nemesis - using for transfer transaction or batch transaction to the recipient
testers - testers[0] : using as default account, perform  most of the type of transaction
        - testers[1] : using for convert multisig, secretlock, secretProofs, transferAlias,                transferMosaicUnsorted, cosign trasnfer multisig and transferWithFee
        - testers[2] : using for cosig converMultisig, cosig Multisig, account restriction allow operation
        - testers[3] : using cosig converMultisig, cosig Multisig, account restriction allow operation, account restriction block address
multisig - using for multisig account

In `conf/network.json`

endpointUrl - network API endpoint
generationHash - network generationHash, get from here `endpointUrl/block/1`
currencyMosaic - mosaic namespace such as "nem.xem"
harvestMosaic - harvest mosaic such as "nem.xem"
```

4. Build

```
npm run build
```

# Examples

Convert UInt64 array notation:

```bash
$ ./symbol-sandbox convert uint64 -i "[1, 1]"
```

Convert Public Key to address notation:

```bash
$ ./symbol-sandbox convert address
Enter a public key: 33F0E2685732AE9E202F92B2B93A525BF77C4C14BBA22D088926BA8A7FD0BE13
```

Transaction broadcaster examples:

```bash
$ ./symbol-sandbox transaction transfer
$ ./symbol-sandbox transaction hashlock
$ ./symbol-sandbox transaction aggregate
$ ./symbol-sandbox transaction mosaicDefinition
$ ./symbol-sandbox transaction mosaicSupply
$ ./symbol-sandbox transaction registerNamespace -n namespace
$ ./symbol-sandbox transaction mosaicAlias
$ ./symbol-sandbox transaction addressAlias
```

## Aggregate Transaction Scenarios

1) Create a new **named mosaic** on catapult network

- Create a root namespace and necessary subnamespaces (RegisterNamespace)
- Create a Mosaic with parameters from command line (MosaicDefinition)
- Add supply to the created mosaic (MosaicSupplyChange)
- Create a namespace alias for the created mosaic (MosaicAlias)

```bash
$ ./symbol-sandbox aggregate mosaicConfiguration -n evias.test.name -d 0 -s 1 -t 1 -i 1000
```

2) Send **batch transfers** from CSV input

- Read a CSV file with columns: `address, amount, mosaic`
- Each row in the CSV will be added as one TransferTransaction
- Wrap all transfers into one aggregate transaction

```bash
$ export CSV_FILE=`pwd`/files/test.csv
$ ./symbol-sandbox aggregate batchTransfer -f ${CSV_FILE}
```

3) Create *multiple levels* of **namespaces**

```bash
$ ./symbol-sandbox aggregate multiLevelNamespace evias.levels.tests
$ ./symbol-sandbox aggregate multiLevelNamespace gregory.saive.handshakes
```

## License

This software is released under the [Apache v2.0](LICENSE) License.

© 2019-2020 Grégory Saive <greg@evias.be> for NEM, All rights reserved.
