
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
        description: 'Number to convert. Ex. : "[1234,0]", 1234, 0x1234',
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
        let parsed;
        let uint64;
        try {
            input = OptionsResolver(options,
                'input',
                () => { return ''; },
                'Enter a number or array of number in JSON format: ');

            if (typeof input === "string" && 0 === input.indexOf('[')) {
                parsed = JSON.parse(input);
                input = parsed;
            }
            else if (typeof input === "string" && 0 === input.indexOf('0x')) {
                parsed = input.replace(/^0x/, '');
            }
            else if (typeof input === "string") {
                parsed = parseInt(input, 10);
            }

            if (typeof parsed === "object") {
                uint64 = new UInt64(parsed);
            }
            else if (typeof parsed === "number") {
                uint64 = UInt64.fromUint(parsed);
            }
            else if (typeof parsed === "string") {
                uint64 = new UInt64(uint64_t.fromHex(parsed));
            }
        } catch (err) {
            console.log(err, options);
            throw new ExpectedError('Enter a valid input');
        }

        let binary = [];
        let uint8 = convert.hexToUint8(uint64_t.toHex(uint64.toDTO()));

        uint8.forEach((byte) => {
            const bits = byte.toString(2).split('');

            // left-pad 0s
            const pads = ('0'.repeat(8 - bits.length)).split('');
            pads.forEach((zero) => {bits.unshift('0')});

            // build 1000'0100 format
            binary.push(bits.slice(0, 4).join('') + '\'' + bits.slice(4, 8).join(''));
        });

        let text;
        text += chalk.green('Input:\t') + chalk.bold(input) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'UInt64:\t\t\t' + JSON.stringify(uint64.toDTO()) + '\n';
        text += 'UInt64 (base16):\t[' + 
            '0x' + uint64.lower.toString(16).toUpperCase() + ', ' +
            '0x' + uint64.higher.toString(16).toUpperCase() + ']\n';
        text += 'Number:\t\t\t' + uint64.compact() + '\n';
        text += 'Hexadecimal:\t\t0x' + uint64_t.toHex(uint64.toDTO()) + '\n';
        text += 'UInt8:\t\t\t' + convert.hexToUint8(uint64_t.toHex(uint64.toDTO())).join(', ') + '\n';
        text += 'Binary:\n' + '\n';

        binary.forEach((byte, i) => {
            text += '\t\t\tUInt8[' + i + ']: ' + byte + '\n';
        });

        console.log(text);
    }

}
