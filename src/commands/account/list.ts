
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
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    uint64 as uint64_t,
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'a',
        description: 'Account address',
    })
    address: string;
}

@command({
    description: 'Get list of known accounts',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let address;
        try {
            address = OptionsResolver(options,
                'address',
                () => { return ''; },
                'Enter a raw address: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid address');
        }

        let text = '';
        text += chalk.green('Known Accounts:\t') + '\n';
        text += '-'.repeat(20) + '\n\n';

        Object.keys(this.accounts).map((accountName) => {
            const account = Account.createFromPrivateKey(this.accounts[accountName].privateKey, NetworkType.MIJIN_TEST);

            if (address.length && account.address.plain() !== address) {
                return ; // filter by address is active
            }

            text += 'Name:\t\t' + accountName + '\n';
            text += 'Address:\t' + account.address.plain() + '\n';
            text += 'Public Key:\t' + account.publicKey + '\n';
            text += 'Private Key:\t' + account.privateKey + '\n';
            text += '-'.repeat(20) + '\n';
        });

        console.log(text);
    }

}
