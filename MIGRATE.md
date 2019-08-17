<p align="center"><img src="https://nem.io/wp-content/themes/nem/img/logo-nem.svg" width="400"></p>

This package aims to provide with a command line interface to **migrate NIS1 data over to Catapult network(s)**. As the migration discussions progress, it is imperative to have migration tools available for end-users so that porting over data is as easy as possible. 

Currently, the app is only available for command line usage but will serve as a showcase for the feasibility of migrating datasets over to Catapult network(s).

**This package is currently still in development, please do not use in production.**

*The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

Package licensed under [Apache v2.0](LICENSE) License.

## Instructions

### Deployment

```bash
$ npm install
$ npm run build
```

### Usage

Several migration commands are available. Those will provide with a **signed transaction payload** that can be executed on respective Catapult networks to re-create the dataset with the same configuration as previously available on NIS1.

This app depends on [nem2-sdk](https://www.npmjs.com/package/nem2-sdk) for Catapult compatibility and [nem-sdk](https://www.npmjs.com/package/nem-sdk) for NIS compatibility.

Available migration commands:

| Command | Description |
| --- | --- |
| `nem2-sandbox migrate namespace` | Migration Tool for Namespaces |
| `nem2-sandbox migrate mosaic` | Migration Tool for Mosaic definitions |
| `nem2-sandbox migrate multisig` | Migration Tool for Multi-Signature Accounts |

#### Example of migration of registered namespaces

```bash
$ ./nem2-sandbox migrate namespace -c http://localhost:3000 -n http://hugealice.nem.ninja:7890 -p dd19f3f3178c0867771eed180310a484e1b76527f7a271e3c8b5264e4a5aa414
```

## License

This software is released under the [Apache v2.0](LICENSE) License.

© 2019 Grégory Saive <greg@evias.be> for NEM, All rights reserved.
