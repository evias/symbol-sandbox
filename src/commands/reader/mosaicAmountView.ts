
/**
 * 
 * Copyright 2019 Grégory Saive for NEM (github.com/nemtech)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from 'chalk';
import {command, ExpectedError, metadata, option} from 'clime';
import {
    AccountHttp,
    Address,
    MosaicHttp,
    MosaicService,
    NetworkType,
    NamespaceHttp,
    NamespaceId
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'u',
        description: 'Endpoint URL (Ex.: "http://localhost:3000")',
    })
    peerUrl: string;
    @option({
        flag: 'a',
        description: 'Address or Namespace Name',
    })
    namespaceName: string;
}

@command({
    description: 'Read address mosaic amounts',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        let account;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');

            account = OptionsResolver(options,
                'account',
                () => { return ''; },
                'Enter an address, a public key or a namespace name: ');

            if (!account.length) {
                throw new Error("Account is obligatory");
            }
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }
        await this.setupConfig();
        const accountHttp = new AccountHttp(this.endpointUrl);
        const mosaicHttp  = new MosaicHttp(this.endpointUrl);
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);
        const mosaicService = new MosaicService(accountHttp, mosaicHttp);

        // read address
        let address;
        if (account.length === 64) {
            address = Address.createFromPublicKey(account, this.networkType);
        } else if (account.length === 40 || account.length === 45) {
            address = Address.createFromRawAddress(account);
        } else {
            address = await namespaceHttp.getLinkedAddress(new NamespaceId(account)).toPromise();
        }

        let text = '';
        text += chalk.green('Peer:\t  ') + chalk.bold(this.endpointUrl) + '\n';
        text += chalk.green('Account: ') + chalk.bold(address.plain()) + '\n';
        text += '-'.repeat(20) + '\n\n';
        console.log(text);

        mosaicService.mosaicsAmountViewFromAddress(address).subscribe(
            (mosaics) => {
                mosaics.map((mosaic) => {
                    console.log(chalk.yellow('Id:\t') + chalk.bold(mosaic.fullName()));
                    console.log(chalk.yellow('Amount:\t') + chalk.bold('' + mosaic.amount.compact())+ '\n');
                });
            },
            (err) => {
                console.error(err);
            }
        );


    }

}
