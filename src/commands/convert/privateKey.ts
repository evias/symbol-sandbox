
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

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key to convert',
    })
    privateKey: string;
}

@command({
    description: 'Get public key from private key',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let privateKey;
        try {
            privateKey = OptionsResolver(options,
                'privateKey',
                () => { return ''; },
                'Enter a privateKey in hexadecimal format: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        let account_mijinTest  = Account.createFromPrivateKey(privateKey, NetworkType.MIJIN_TEST);
        let account_mijin      = Account.createFromPrivateKey(privateKey, NetworkType.MIJIN);
        let account_publicTest = Account.createFromPrivateKey(privateKey, NetworkType.TEST_NET);
        let account_public     = Account.createFromPrivateKey(privateKey, NetworkType.MAIN_NET);

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(privateKey) + '\n'
        text += '-'.repeat(20) + '\n\n'
        text += chalk.yellow('MIJIN_TEST\n')
        text += 'Public Key:\t' + account_mijinTest.publicKey + '\n'
        text += 'Address:\t' + account_mijinTest.address.plain() + '\n'
        text += '\n'
        text += chalk.yellow('MIJIN\n')
        text += 'Public Key:\t' + account_mijin.publicKey + '\n'
        text += 'Address:\t' + account_mijin.address.plain() + '\n'
        text += '\n'
        text += chalk.yellow('TEST_NET\n')
        text += 'Public Key:\t' + account_publicTest.publicKey + '\n'
        text += 'Address:\t' + account_publicTest.address.plain() + '\n'
        text += '\n'
        text += chalk.yellow('MAIN_NET\n')
        text += 'Public Key:\t' + account_public.publicKey + '\n'
        text += 'Address:\t' + account_public.address.plain() + '\n'
        text += '\n'

        console.log(text);
    }

}
