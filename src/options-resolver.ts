/**
 * Copyright 2019 Grégory Saive, Pascal Severin for eVias Services (evias.be)
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
import * as readlineSync from 'readline-sync';
import {
    Mosaic,
    MosaicId,
    NamespaceId,
    UInt64,
    RawUInt64 as uint64_t,
} from 'nem2-sdk';

/**
 * Generic command line argument reader.
 * 
 * @param options 
 * @param key 
 * @param secondSource 
 * @param promptText 
 * @param readlineDependency
 * @return {any}
 */
export const OptionsResolver = (
    options: any,
    key: string,
    secondSource: () => string | undefined,
    promptText: string,
    readlineDependency?: any
): any => {
    const readline = readlineDependency || readlineSync;
    return options[key] !== undefined ? options[key] : (secondSource() 
        || readline.question(promptText));
};

/**
 * Read a `uint64` command line argument.
 * 
 * @param options 
 * @param key 
 * @param secondSource 
 * @param promptText 
 * @param readlineDependency 
 * @return {UInt64 | null}
 */
export const UInt64OptionsResolver = (
    options: any,
    key: string,
    secondSource: () => string | undefined,
    promptText: string,
    readlineDependency?: any
): UInt64 | null => {
    const readline = readlineDependency || readlineSync;
    const result = options[key] !== undefined ? options[key] : (secondSource() 
                || readline.question(promptText));

    if (result.indexOf('[') === 0) {
        let asArray: Array<number> = JSON.parse(result);
        return new UInt64(asArray);
    }

    // check for numbers-only
    if (! /[0-9]+/.test(result)) {

        // not numbers-only, maybe hexadecimal?
        if (/[0-9A-Fa-f]+/.test(result)) {
            return new UInt64(uint64_t.fromHex(result));
        }

        // parsing error
        return null;
    }

    const asInt = parseInt(result);
    return UInt64.fromUint(asInt);
};

/**
 * Read a `mosaic` command line argument.
 * 
 * @param options 
 * @param key 
 * @param secondSource 
 * @param promptText 
 * @param readlineDependency 
 * @return {MosaicId|NamespaceId}
 */
export const MosaicOptionsResolver = (
    options: any,
    key: string,
    secondSource: () => string | undefined,
    promptText: string,
    readlineDependency?: any
): MosaicId | NamespaceId | Mosaic => {
    const readline = readlineDependency || readlineSync;
    const result = options[key] !== undefined ? options[key] : (secondSource() 
                || readline.question(promptText));

    // amount + mosaic name provided
    if (/[0-9]+ [0-9a-zA-Z\.\-_]+/.test(result)) {
        const [amount, mosaic] = result.split(' ');
        let uint64_amt = UInt64OptionsResolver(options, 'amount', () => { return amount; }, '');

        if (uint64_amt === null) {
            // invalid amount, could not be parsed.
            uint64_amt = UInt64.fromUint(0);
        }

        return new Mosaic(new NamespaceId(mosaic), uint64_amt);
    }

    // check for numbers-only
    if (! /[0-9]+/.test(result)) {

        // not numbers-only, maybe hexadecimal?
        if (/[0-9A-Fa-f]+/.test(result)) {
            return new MosaicId(uint64_t.fromHex(result));
        }

        // namespace name provided
        return new NamespaceId(result);
    }

    const asInt = parseInt(result);
    return new MosaicId(uint64_t.fromUint(asInt));
};
