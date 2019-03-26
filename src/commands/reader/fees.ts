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
    UInt64,
    Account,
    Address,
    NetworkType,
    TransactionHttp
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
        flag: 'h',
        description: 'Transaction id or hash',
    })
    hash: string;
}

@command({
    description: 'Read effective transaction fee',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        let hashOrId;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');

            hashOrId = OptionsResolver(options,
                'hash',
                () => { return ''; },
                'Enter a transaction id or hash: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        const transactionHttp = new TransactionHttp(this.endpointUrl);

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += '-'.repeat(20) + '\n\n';

        try {
            const effectiveFee = await transactionHttp.getTransactionEffectiveFee(hashOrId).toPromise();

            text += 'Transaction:\t' + chalk.bold(hashOrId) + '\n';
            text += 'Effective Fee:\t' + chalk.bold('' + effectiveFee) + '\n';

            console.log(text);
        }
        catch(e) {
            console.error("Error awaiting promise: ", e);
        }
    }

}
