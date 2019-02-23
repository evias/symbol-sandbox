
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
    Address,
    NetworkType
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    uint64 as uint64_t,
    KeyPair
} from "nem2-library";

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
        let addr;
        try {
            privateKey = OptionsResolver(options,
                'privateKey',
                () => { return ''; },
                'Enter a privateKey in hexadecimal format: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        let keypair = KeyPair.createKeyPairFromPrivateKeyString(privateKey);
        addr = Address.createFromPublicKey(keypair.publicKey, NetworkType.MIJIN_TEST);

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(privateKey) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'Private Key:\t' + keypair.privateKey + '\n';
        text += 'Public Key:\t' + keypair.publicKey + '\n';
        text += 'Mijin:\t\t' + Address.createFromPublicKey(keypair.publicKey, NetworkType.MIJIN).plain() + '\n';
        text += 'Mijin Test:\t' + Address.createFromPublicKey(keypair.publicKey, NetworkType.MIJIN_TEST).plain() + '\n';
        text += 'Mainnet:\t' + Address.createFromPublicKey(keypair.publicKey, NetworkType.MAIN_NET).plain() + '\n';
        text += 'Testnet:\t' + Address.createFromPublicKey(keypair.publicKey, NetworkType.TEST_NET).plain() + '\n';

        console.log(text);
    }

}
