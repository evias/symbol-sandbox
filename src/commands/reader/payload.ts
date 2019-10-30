
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
    TransactionMapping,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

const ucFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const swap16 = (val: string) => {
    const chars = val.split('')
    let pairs: string[] = []
    let pair: string = ''
    for (let i = 1, m = chars.length; i <= m; i++) {
        pair += chars[i-1]

        if (i % 2 === 0) {
            pairs.push(pair)
            // reset
            pair = ''
        }
    }

    return pairs.reverse().join('')
}

export interface DynamicSize {
    sizeIdx: number
}

export interface TransactionBufferSpec {
    type: string,
    sizes: Array<number|DynamicSize>,
    keys: string[]
}

export class TransactionBuffers {

    //XXX read buffers from catbuffer .cats files
    public static readonly buffers: TransactionBufferSpec[] = [
        {type: '4C41', sizes: [64, 2], keys: ['Remote public key', 'Link action']},
        {type: '4D41', sizes: [8, 16, 2, 2, 16], keys: ['Nonce', 'Mosaic Id', 'Flags', 'Divisibility', 'Duration']},
        {type: '4D42', sizes: [16, 2, 16], keys: ['Mosaic Id', 'Change Action', 'Delta']},
        {type: '4E41', sizes: [2, 16, 16, 2, -1], keys: ['Reg. Type', 'Parent Id/Duration', 'Namespace Id', 'Name Size', 'Name']},
        {type: '4E42', sizes: [2, 16, 50], keys: ['Alias Action', 'Namespace Id', 'Address']},
        {type: '4E43', sizes: [2, 16, 16], keys: ['Alias Action', 'Namespace Id', 'Mosaic Id']},
        {type: '4441', sizes: [64, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Value Size Delta', 'Value Size', 'Value']},
        {type: '4442', sizes: [64, 16, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Target Mosaic Id', 'Value Size Delta', 'Value Size', 'Value']},
        {type: '4443', sizes: [64, 16, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Target Namespace Id', 'Value Size Delta', 'Value Size', 'Value']},
        {type: '5541', sizes: [4, 4, 2, -1], keys: ['Min Removal Delta', 'Min Approval Delta', 'Modifications Count', 'Modifications']},
        {type: '4841', sizes: [16, 16, 64], keys: ['Mosaic', 'Duration', 'Aggregate Hash']},
        {type: '5241', sizes: [16, 16, 2, 64, 50], keys: ['Mosaic', 'Duration', 'Hash Algorithm', 'Secret', 'Lock Recipient']},
        {type: '5242', sizes: [2, 64, 50, 4, -1], keys: ['Hash Algorithm', 'Secret', 'Lock Recipient', 'Proof Size', 'Proof']},
        {type: '5041', sizes: [2, 2, -1], keys: ['Restriction Type', 'Modifications Count', 'Modifications']},
        {type: '5042', sizes: [2, 2, -1], keys: ['Restriction Type', 'Modifications Count', 'Modifications']},
        {type: '5043', sizes: [2, 2, -1], keys: ['Restriction Type', 'Modifications Count', 'Modifications']},
        {type: '5141', sizes: [16, 16, 16, 16, 2, 16, 2], keys: ['Mosaic Id', 'Reference Mosaic Id', 'Restriction Key', 'Previous Value', 'Previous Type', 'New Value', 'New Type']},
        {type: '5142', sizes: [16, 16, 50, 16, 16], keys: ['Mosaic Id', 'Restriction Key', 'Target Address', 'Previous Value', 'New Value']},
        {type: '5441', sizes: [50, 4, 2, {sizeIdx: 1}, -1], keys: ['Recipient', 'Message Size', 'Mosaics Count', 'Message', 'Mosaics']},
    ]
}

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

        const transaction = TransactionMapping.createFromPayload(bytes)
        const headerText = this.readTransactionHeader(bytes)
        const rawType = bytes.substr(8 + 128 + 64 + 4, 4)
        const bodyText = this.readTransactionBody(rawType, bytes.substr(8 + 128 + 64 + 4 + 4 + 16 + 16))

        let text: string = ''
        text += 'Transaction Header:\n'
        text += headerText

        text += 'Transaction Details:\n';
        text += bodyText;
        console.log(text);
    }

    private readTransactionHeader(bytes: string): string {
        // Transaction byte size data
        const sizeLength        = 8,
              signatureLength   = 128,
              publicKeyLength   = 64,
              versionLength     = 4,
              typeLength        = 4,
              feeLength         = 16,
              deadlineLength    = 16;

        // Transaction byte data positions
        const signatureOffset = sizeLength,
              publicKeyOffset = signatureOffset + signatureLength,
              versionOffset = publicKeyOffset + publicKeyLength,
              typeOffset = versionOffset + versionLength,
              feeOffset = typeOffset + typeLength,
              deadlineOffset = feeOffset + feeLength,
              transactionOffset = deadlineOffset + deadlineLength;

        // Transaction byte data
        const sizeBytes         = bytes.substring(0, sizeLength),
              signatureBytes    = bytes.substring(signatureOffset, publicKeyOffset),
              publicKeyBytes    = bytes.substring(publicKeyOffset, versionOffset),
              versionBytes      = bytes.substring(versionOffset, typeOffset),
              typeBytes         = bytes.substring(typeOffset, feeOffset),
              feeBytes          = bytes.substring(feeOffset, deadlineOffset),
              deadlineBytes     = bytes.substring(deadlineOffset, transactionOffset),
              transactionBytes  = bytes.substring(transactionOffset);

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

        return text
    }

    private readTransactionBody(rawTransactionType: string, bytes: string): string
    {
        // Transaction byte size data
        console.log("TYPE", rawTransactionType)
        const transactionBuffer: TransactionBufferSpec = TransactionBuffers.buffers.find(
            (buffer: TransactionBufferSpec) => {
                return buffer.type === rawTransactionType
            })

        // read buffer config
        const sizes = transactionBuffer.sizes
        const keys = transactionBuffer.keys

        if (sizes.length !== keys.length) {
            throw new Error('Invalid transaction buffer configuration for transaction type ' + rawTransactionType)
        }

        let text: string = ''
        let cursors: number[] = []
        for (let i = 0, m = sizes.length, cursor = 0; i < m; i++) {
            const isUntilEnd = sizes[i] === -1
            const isDynamic = (sizes[i] as DynamicSize).sizeIdx !== undefined

            let fieldBytes: string = ''
            let byteSize: number = 0
            if (isUntilEnd === true) {
                fieldBytes = bytes.substr(cursor)
                byteSize = fieldBytes.length
            }
            else if (isDynamic === true) {
                // field length is defined in bytes dynamically
                const dynamicIdx = (sizes[i] as DynamicSize).sizeIdx
                const dynamicLen = sizes[dynamicIdx] as number
                const parsedSize = UInt64.fromHex('000000000000' + swap16(bytes.substr(cursors[dynamicIdx], dynamicLen)))

                byteSize = 2 * parsedSize.compact()
                fieldBytes = bytes.substr(cursor, byteSize)
            }
            else {
                fieldBytes = bytes.substr(cursor, sizes[i] as number)
                byteSize = sizes[i] as number
            }

            const numTabs = keys[i].length < 7 ? 3 : keys[i].length < 14 ? 2 : 1

            // add text
            text += keys[i] + ':' + ('\t'.repeat(numTabs)) + fieldBytes + '\n'

            // move cursor in payload
            cursors.push(cursor)
            cursor += byteSize
        }

        return text
    }

}
