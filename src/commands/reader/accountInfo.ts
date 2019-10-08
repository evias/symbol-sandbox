
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
    NetworkType,
    NamespaceHttp,
    NamespaceId
} from 'nem2-sdk';

import {from as observableFrom, Observable, merge} from 'rxjs';
import {combineLatest, catchError} from 'rxjs/operators';

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
        description: 'Address or public key or namespace',
    })
    account: string;
}

@command({
    description: 'Read account information',
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
                'Enter an address or public key or namespace: (Ex.: evias)');

            if (!account.length) {
                throw new Error("Account is obligatory is obligatory");
            }
        } catch (err) {
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        const namespaceHttp = new NamespaceHttp(this.endpointUrl);
        const accountHttp = new AccountHttp(this.endpointUrl);

        let address: Address;
        if (account.length === 64) {
            address = Address.createFromPublicKey(account, NetworkType.MIJIN_TEST);
        }
        else if (account.length === 40) {
            address = Address.createFromRawAddress(account);
        }
        else {
            address = await namespaceHttp.getLinkedAddress(new NamespaceId(account)).toPromise();
        }

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += chalk.green('Address:\t') + chalk.bold(address.plain()) + '\n';
        text += '-'.repeat(20) + '\n\n';

        return await accountHttp.getAccountInfo(address).subscribe(
            (accountInfo) => {

                text += 'JSON: ' + JSON.stringify(accountInfo) + '\n\n';

                text += chalk.yellow('Address Height:         ') + accountInfo.addressHeight.compact() + '\n';
                text += chalk.yellow('Public Key:             ') + accountInfo.publicKey + '\n';
                text += chalk.yellow('Public Key Height:      ') + accountInfo.publicKeyHeight.compact() + '\n';
                text += chalk.yellow('Importance:             ') + accountInfo.importance.compact() + '\n';
                text += chalk.yellow('Importance Height:      ') + accountInfo.importanceHeight.compact() + '\n';
                text += '\n' + chalk.yellow('Mosaics:   ') + '\n';

                accountInfo.mosaics.map((mosaic) => {
                    text += '\t' + chalk.yellow(''+mosaic.amount.compact()) 
                         + ' ' + chalk.green(mosaic.id.id.toHex());
                });

                console.log(text);
            },
            (err) => {
                let msg = "Caught error with type " + (typeof err);
                msg += " and content: " + JSON.stringify(err);
                console.error(msg);
            }
        );

    }

}
