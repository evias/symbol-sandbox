
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
import * as base32 from 'base32';
import {Convert} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'b',
        description: 'Base32 value to decode',
    })
    base32Value: string;
}

@command({
    description: 'Convert from base32 to binary (hexadecimal format)',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let base32Value;
        try {
            base32Value = OptionsResolver(options,
                'base32Value',
                () => { return ''; },
                'Enter a base32 value: ');
        } catch (err) {
            throw new ExpectedError('Enter a valid input');
        }

        const decoded = base32.decode(base32Value);
        const decodedHex = Convert.utf8ToHex(decoded);

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(base32Value) + '\r\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'Hexary:\t\t' + decodedHex + '\r\n';
        text += 'Binary:\r\n' + '---------' + '\r\n';
        text += decoded + '\r\n';
        text += '---------' + '\r\n'

        console.log(text);
    }

}
