
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
    UInt64
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
        flag: 'i',
        description: 'Number(s) to convert',
    })
    input: string;
}

@command({
    description: 'Convert from UInt64 and to UInt64',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let input;
        try {
            input = OptionsResolver(options,
                'input',
                () => { return ''; },
                'Enter a number or array of number in JSON format: ');

            if (typeof input === "string") {
                const parsed = JSON.parse(input);
                input = parsed;
            }
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        let uint64;
        if (typeof input === "object") {
            uint64 = new UInt64(input);
        }
        else if (typeof input === "number") {
            uint64 = UInt64.fromUint(input);
        }

        let text;
        text += chalk.green('Input:\t') + chalk.bold(input) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'UInt64:\t\t' + JSON.stringify(uint64.toDTO()) + '\n';
        text += 'Number:\t\t' + uint64.compact() + '\n';
        text += 'Hexadecimal:\t' + uint64_t.toHex(uint64.toDTO()) + '\n';
        console.log(text);
    }

}
