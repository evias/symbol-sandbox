<p align="center"><img src="https://nem.io/wp-content/themes/nem/img/logo-nem.svg" width="400"></p>

<p align="center">
<a href="https://travis-ci.org/evias/nem2-sandbox"><img src="https://travis-ci.org/evias/nem2-sandbox.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/evias/nem2-sandbox"><img src="https://poser.pugx.org/evias/nem2-sandbox/d/total.svg" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/evias/nem2-sandbox"><img src="https://poser.pugx.org/evias/nem2-sandbox/v/stable.svg" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/evias/nem2-sandbox"><img src="https://poser.pugx.org/evias/nem2-sandbox/v/unstable" alt="Latest Unstable Version"></a>
<a href="https://packagist.org/packages/evias/nem2-sandbox"><img src="https://poser.pugx.org/evias/nem2-sandbox/license.svg" alt="License"></a>
</p>

This package aims to provide with a command line interface helping developers to communicate with the NEM2 (Catapult) blockchain.

**This package is currently still in development, please do not use in production.**

*The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

Package licensed under [Apache v2.0](LICENSE) License.

## Donations / Pot de vin

If you like the initiative, and for the sake of good mood, I recommend you take a few minutes to Donate a beer or Three [because belgians like that] by sending some XEM (or whatever Mosaic you think pays me a few beers someday!) to my Wallet:

    NB72EM6TTSX72O47T3GQFL345AB5WYKIDODKPPYW

| Username | Role |
| --- | --- |
| [eVias](https://github.com/evias) | Project Lead |

# Examples

Convert UInt64 array notation:

```bash
$ ./nem2-sandbox convert uint64 -i "[1, 1]"
```

Convert Public Key to address notation:

```bash
$ ./nem2-sandbox convert address
Enter a public key: 33F0E2685732AE9E202F92B2B93A525BF77C4C14BBA22D088926BA8A7FD0BE13
```

Cow network upgrade tester (transaction type tester)

```bash
$ ./nem2-sandbox transaction transfer
$ ./nem2-sandbox transaction hashlock
$ ./nem2-sandbox transaction aggregate
$ ./nem2-sandbox transaction mosaicDefinition
$ ./nem2-sandbox transaction registerNamespace -n namespace
$ ./nem2-sandbox transaction mosaicAlias
$ ./nem2-sandbox transaction addressAlias
```

## Changelog

Important versions listed below. Refer to the [Changelog](CHANGELOG.md) for a full history of the project.

- [0.0.5](CHANGELOG.md#v005) - 2019-02-27
- [0.0.4](CHANGELOG.md#v004) - 2019-02-23
- [0.0.3](CHANGELOG.md#v003) - 2019-02-18
- [0.0.2](CHANGELOG.md#v002) - 2019-02-18
- [0.0.1](CHANGELOG.md#v001) - 2019-02-16

## License

This software is released under the [Apache v2.0](LICENSE) License.

© 2019 Grégory Saive <greg@evias.be> for NEM, All rights reserved.
