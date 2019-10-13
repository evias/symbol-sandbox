
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

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'b',
        description: 'Bytes of transaction data to read',
    })
    bytes: string;
}

@command({
    description: 'Convert from Serialized Bytes to Transaction Data',
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

        // Transaction byte size data
        const sizeLength        = 8;
        const signatureLength   = 128;
        const publicKeyLength   = 64;
        const versionLength     = 4;
        const typeLength        = 4;
        const feeLength         = 16;
        const deadlineLength    = 16;

        // Transaction byte data positions
        const signatureOffset = sizeLength;
        const publicKeyOffset = signatureOffset + signatureLength;
        const versionOffset = publicKeyOffset + publicKeyLength;
        const typeOffset = versionOffset + versionLength;
        const feeOffset = typeOffset + typeLength;
        const deadlineOffset = feeOffset + feeLength;
        const transactionOffset = deadlineOffset + deadlineLength;

        // Transaction byte data
        const sizeBytes         = bytes.substring(0, sizeLength);
        const signatureBytes    = bytes.substring(signatureOffset, publicKeyOffset);
        const publicKeyBytes    = bytes.substring(publicKeyOffset, versionOffset);
        const versionBytes      = bytes.substring(versionOffset, typeOffset);
        const typeBytes         = bytes.substring(typeOffset, feeOffset);
        const feeBytes          = bytes.substring(feeOffset, deadlineOffset);
        const deadlineBytes     = bytes.substring(deadlineOffset, transactionOffset);
        const transactionBytes  = bytes.substring(transactionOffset);
        const transactionText   = this.readTransactionBytes(typeBytes, transactionBytes);

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(bytes) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'Size:\t\t\t' + sizeBytes + '\n';
        text += 'Signature:\t\t' + signatureBytes + '\n';
        text += 'Public Key:\t\t' + publicKeyBytes + '\n';
        text += 'Version:\t\t' + versionBytes + '\n';
        text += 'Type:\t\t\t' + typeBytes + '\n';
        text += 'Fee:\t\t\t' + feeBytes + '\n';
        text += 'Deadline:\t\t' + deadlineBytes + '\n';
        text += 'Transaction Data:\t' + transactionBytes + '\n\n';
        text += 'Transaction Details:\n';
        text += transactionText;
        console.log(text);
    }

    private readTransactionBytes(typeBytes: string, transactionBytes: string): string
    {
        // Transaction byte size data

        let text = '';
        switch (typeBytes) {
        case '4D41': // Mosaic Definition
            const mosaicNonceLength = 8;
            const mosaicIdLength    = 16;
            const propsNumLength    = 2;
            const propsFlagsLength  = 2;
            const divisibilityLength= 2;
            const durationIndLength = 2;
            const durationLength    = 16;

            const mosaicIdOffset     = mosaicNonceLength;
            const propsOffset        = mosaicIdOffset + mosaicIdLength;
            const flagsOffset        = propsOffset + propsNumLength;
            const divisibilityOffset = flagsOffset + propsFlagsLength;
            const durationIndOffset  = divisibilityOffset + divisibilityLength;
            const durationOffset     = durationIndOffset + durationIndLength;

            // read bytes
            const mosaicNonceBytes = transactionBytes.substring(0, mosaicNonceLength);
            const mosaicIdBytes    = transactionBytes.substring(mosaicIdOffset, propsOffset);
            const propsBytes       = transactionBytes.substring(propsOffset, flagsOffset);
            const flagsBytes       = transactionBytes.substring(flagsOffset, divisibilityOffset);
            const divisibilityBytes= transactionBytes.substring(divisibilityOffset, durationIndOffset);
            const durationIndBytes = transactionBytes.substring(durationIndOffset, durationOffset);
            const durationBytes    = transactionBytes.substring(durationOffset);

            text += 'Mosaic Nonce:\t\t' + mosaicNonceBytes + '\n';
            text += 'Mosaic ID:\t\t' + mosaicIdBytes + '\n';
            text += 'Num Properties:\t\t' + propsBytes + '\n';
            text += 'Properties Flags:\t' + flagsBytes + '\n';
            text += 'Divisibility:\t\t' + divisibilityBytes + '\n';
            text += 'Duration Indicator:\t' + durationIndBytes + '\n';
            text += 'Duration:\t\t' + durationBytes + '\n';
            break;

        default:
            return 'Transaction type not implemented yet.';
        }

        return text;
    }

}
