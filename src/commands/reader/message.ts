
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
    Message,
} from 'symbol-sdk';
import { decode } from 'utf8'

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

const decodeHex = (hex: string): string => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    try {
        return decode(str);
    } catch (e) {
        return str;
    }
}

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'b',
        description: 'Bytes of transaction message',
    })
    bytes: string;
}

@command({
    description: 'Convert from Serialized Bytes to Plain Message',
})
export default class extends BaseCommand {


    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let bytes;
        try {
            bytes = OptionsResolver(options,
                'bytes',
                () => { return ''; },
                'Enter a hexadecimal bytes list: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        const plain = decodeHex(bytes)

        let text: string = ''
        text += 'Plain Message:\n'
        text += chalk.yellow(plain)

        console.log(text);
    }

}
