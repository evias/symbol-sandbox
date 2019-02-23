
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
    uint64 as uint64_t
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'r',
        description: 'Raw address to convert',
    })
    @option({
        flag: 'p',
        description: 'Public Key to convert',
    })
    raw: string;
    publicKey: string;
}

@command({
    description: 'Convert from raw address or public key to formatted Address',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let raw;
        let pub;
        let addr;
        try {
            raw = OptionsResolver(options,
                'raw',
                () => { return ''; },
                'Enter a raw address: ');

            pub = OptionsResolver(options,
                'publicKey',
                () => { return ''; },
                'Enter a public key: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        let networks = '';
        if (!raw.length && !pub.length) {
            throw new ExpectedError('Please enter one of raw address or public key');
        }
        else if (raw.length) {
            addr = Address.createFromRawAddress(raw);
        }
        else if (pub.length) {
            addr = Address.createFromPublicKey(pub, NetworkType.MIJIN_TEST);
            networks += 'Mijin:\t\t' + Address.createFromPublicKey(pub, NetworkType.MIJIN).plain() + '\n';
            networks += 'Mijin Test:\t' + Address.createFromPublicKey(pub, NetworkType.MIJIN_TEST).plain() + '\n';
            networks += 'Mainnet:\t' + Address.createFromPublicKey(pub, NetworkType.MAIN_NET).plain() + '\n';
            networks += 'Testnet:\t' + Address.createFromPublicKey(pub, NetworkType.TEST_NET).plain() + '\n';
        }

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(raw || pub) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'Address:\t' + addr.plain() + '\n';
        text += 'Pretty:\t\t' + addr.pretty() + '\n';

        if (networks.length) {
            text += 'Other networks' + '\n\n';
            text += networks;
        }

        console.log(text);
    }

}
