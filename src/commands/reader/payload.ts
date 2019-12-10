
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
    Convert,
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
    sizeIdx: number,
    multiplier?: number
}

export interface TransactionBufferSpec {
    type: string,
    sizes: Array<number|DynamicSize>,
    keys: string[]
}

export class TransactionBuffers {

    //XXX read buffers from catbuffer .cats files
    public static readonly buffers: TransactionBufferSpec[] = [
        /* account_link */ {type: '4C41', sizes: [64, 2], keys: ['Remote public key', 'Link action']},
        /* mosaic_definition */ {type: '4D41', sizes: [16, 16, 8, 2, 2], keys: ['Mosaic Id', 'Duration', 'Nonce', 'Flags', 'Divisibility']},
        /* mosaic_supply_change */ {type: '4D42', sizes: [16, 16, 2], keys: ['Mosaic Id', 'Delta', 'Change Action']},
        /* namespace_registration */ {type: '4E41', sizes: [16, 16, 2, 2, -1], keys: ['Parent Id/Duration', 'Namespace Id', 'Reg. Type', 'Name Size', 'Name']},
        /* address_alias */ {type: '4E42', sizes: [16, 50, 2], keys: ['Namespace Id', 'Address', 'Alias Action']},
        /* mosaic_alias */ {type: '4E43', sizes: [16, 16, 2], keys: ['Namespace Id', 'Mosaic Id', 'Alias Action']},
        /* account_metadata */ {type: '4441', sizes: [64, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Value Size Delta', 'Value Size', 'Value']},
        /* mosaic_metadata */ {type: '4442', sizes: [64, 16, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Target Mosaic Id', 'Value Size Delta', 'Value Size', 'Value']},
        /* namespace_metadata */ {type: '4443', sizes: [64, 16, 16, 4, 4, -1], keys: ['Target public key', 'Metadata Key', 'Target Namespace Id', 'Value Size Delta', 'Value Size', 'Value']},
        /* multisig_account_modification */ {type: '5541', sizes: [4, 4, 2, 2, 8, {sizeIdx: 2, multiplier: 32}, {sizeIdx: 3, multiplier: 32}], keys: ['Min Removal Delta', 'Min Approval Delta', 'Additions #', 'Deletions #', 'Body Reserved', 'Additions', 'Deletions']},
        /* lock_hash */ {type: '4841', sizes: [32, 16, 64], keys: ['Mosaic', 'Duration', 'Aggregate Hash']},
        /* secret_lock */ {type: '5241', sizes: [64, 32, 16, 2, 50], keys: ['Secret', 'Mosaic', 'Duration', 'Hash Algorithm', 'Lock Recipient']},
        /* secret_proof */ {type: '5242', sizes: [64, 4, 2, 50, -1], keys: ['Secret', 'Proof Size', 'Hash Algorithm', 'Lock Recipient', 'Proof']},
        /* account_address_restriction */ {type: '5041', sizes: [4, 2, 2, 8, {sizeIdx: 1, multiplier: 50}, -1], keys: ['Restriction Flags', 'Additions #', 'Deletions #', 'Body Reserved', 'Additions', 'Deletions']},
        /* account_mosaic_restriction */ {type: '5042', sizes: [4, 2, 2, 8, {sizeIdx: 1, multiplier: 16}, -1], keys: ['Restriction Flags', 'Additions #', 'Deletions #', 'Body Reserved', 'Additions', 'Deletions']},
        /* account_operation_restriction */ {type: '5043', sizes: [4, 2, 2, 8, {sizeIdx: 1, multiplier: 4}, -1], keys: ['Restriction Flags', 'Additions #', 'Deletions #', 'Body Reserved', 'Additions', 'Deletions']},
        /* mosaic_global_restriction */ {type: '5141', sizes: [16, 16, 16, 16, 16, 2, 2], keys: ['Mosaic Id', 'Reference Mosaic Id', 'Restriction Key', 'Previous Value', 'New Value', 'Previous Type', 'New Type']},
        /* mosaic_address_restriction */ {type: '5142', sizes: [16, 16, 16, 16, 50], keys: ['Mosaic Id', 'Restriction Key', 'Previous Value', 'New Value', 'Target Address']},
        /* transfer */ {type: '5441', sizes: [50, 2, 4, 8, {sizeIdx: 1, multiplier: 32}, {sizeIdx: 2}], keys: ['Recipient', 'Mosaics Count', 'Message Size', 'Transfer Reserved', 'Mosaics', 'Message']},
        /** aggregate complete */ {type: '4141', sizes: [64, 8, 8, {sizeIdx: 1}, -1], keys: ['Merkle Root Hash', 'Payload Size', 'Body Reserved', 'Transactions', 'Cosignatures']},
        /** aggregate bonded */ {type: '4142', sizes: [64, 8, 8, {sizeIdx: 1}, -1], keys: ['Merkle Root Hash', 'Payload Size', 'Body Reserved', 'Transactions', 'Cosignatures']},
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
        let bytes
        try {
            bytes = OptionsResolver(options,
                'bytes',
                () => { return ''; },
                'Enter a hexadecimal bytes list: ')
        } catch (err) {
            console.log(options)
            throw new ExpectedError('Enter a valid input')
        }

        const transaction = TransactionMapping.createFromPayload(bytes)
        const headerText = this.readTransactionHeader(bytes)
        const typeOffset = 8 + 8 + 128 + 64 + 8 + 2 + 2
        const headerLength = 8 + 8 + 128 + 64 + 8 + 2 + 2 + 4 + 16 + 16
        const rawType = bytes.substr(typeOffset, 4)
        const bodyText = this.readTransactionBody(rawType, bytes.substr(headerLength))

        let text: string = ''
        text += 'Transaction Header:\n'
        text += headerText

        text += 'Transaction Details:\n'
        text += bodyText

        // in case of aggregates, run down of embedded transactions
        if (rawType === '4141' || rawType === '4142') {
            text += '\nEmbedded Transactions:\n'
            text += this.readEmbeddedTransactions(rawType, bytes.substr(headerLength))
        }

        console.log(text);
    }

    private readTransactionHeader(
        bytes: string
    ): string {

        // Transaction byte size header data
        const sizeLength        = 8,
              headerReserved1   = 8,
              signatureLength   = 128,
              publicKeyLength   = 64,
              bodyReserved1     = 8,
              versionLength     = 2,
              networkLength     = 2,
              typeLength        = 4,
              feeLength         = 16,
              deadlineLength    = 16;

        // Transaction byte data positions
        const 
              signatureOffset = sizeLength + headerReserved1, // header_reserved
              publicKeyOffset = signatureOffset + signatureLength,
              versionOffset = publicKeyOffset + publicKeyLength + bodyReserved1, // body_reserved
              networkOffset = versionOffset + versionLength,
              typeOffset = networkOffset + networkLength,
              feeOffset = typeOffset + typeLength,
              deadlineOffset = feeOffset + feeLength,
              transactionOffset = deadlineOffset + deadlineLength;

        // Transaction byte data
        const sizeBytes         = bytes.substr(0, sizeLength),
              headerReservedBytes = bytes.substr(sizeLength, headerReserved1),
              signatureBytes    = bytes.substr(signatureOffset, signatureLength),
              publicKeyBytes    = bytes.substr(publicKeyOffset, publicKeyLength),
              bodyReservedBytes = bytes.substr(publicKeyOffset+publicKeyLength, bodyReserved1),
              versionBytes      = bytes.substr(versionOffset, versionLength),
              networkBytes      = bytes.substr(networkOffset, networkLength),
              typeBytes         = bytes.substr(typeOffset, typeLength),
              feeBytes          = bytes.substr(feeOffset, feeLength),
              deadlineBytes     = bytes.substr(deadlineOffset, deadlineLength),
              transactionBytes  = bytes.substr(transactionOffset);

        let text = '';
        text += chalk.green('Input:\t') + chalk.bold(bytes) + '\n';
        text += '-'.repeat(20) + '\n\n';
        text += 'Size:\t\t\t' + sizeBytes + '\n';
        text += 'Header Reserved:\t' + headerReservedBytes + '\n';
        text += 'Signature:\t\t' + signatureBytes + '\n';
        text += 'Public Key:\t\t' + publicKeyBytes + '\n';
        text += 'Body Reserved:\t\t' + bodyReservedBytes + '\n';
        text += 'Version:\t\t' + versionBytes + '\n';
        text += 'Network Type:\t\t' + networkBytes + '\n';
        text += 'Type:\t\t\t' + typeBytes + '\n';
        text += 'Fee:\t\t\t' + feeBytes + '\n';
        text += 'Deadline:\t\t' + deadlineBytes + '\n';
        text += 'Transaction Data:\t' + transactionBytes + '\n\n';

        return text
    }

    private readTransactionBody(rawTransactionType: string, bytes: string): string
    {
        // Transaction byte size data
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
            const hasMultiplier = (sizes[i] as DynamicSize).multiplier !== undefined && (sizes[i] as DynamicSize).multiplier > 1

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
                const dynamicSize = bytes.substr(cursors[dynamicIdx], dynamicLen);

                // LE is used in catapult payload, BE needed for JS
                const swapEndianness = dynamicLen > 2 ? swap16(dynamicSize) : dynamicSize;
                const dynamicSwapped = parseInt(swapEndianness, 16);

                const multipliedSize = hasMultiplier ? dynamicSwapped * (sizes[i] as DynamicSize).multiplier : dynamicSwapped;
                const uint64Prepend = '0'.repeat(16 - multipliedSize.toString(16).length)
                const parsedSize = UInt64.fromHex(uint64Prepend + multipliedSize.toString(16))

                byteSize = hasMultiplier ? parsedSize.compact() : 2 * parsedSize.compact()
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

    private readEmbeddedTransactions(rawTransactionType: string, bytes: string): string {
        // Transaction byte size data
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

        // read aggregate "header"
        const merkleRootHash = bytes.substr(0, sizes[0] as number)
        const payloadSize = bytes.substr(sizes[0] as number, sizes[1] as number)
        const embeddedByteSize = parseInt(swap16(payloadSize), 16)

        // read embedded bytes
        const embeddedOffset = (sizes[0] as number) + (sizes[1] as number) + (sizes[2] as number)
        const embeddedBytes = bytes.substr(embeddedOffset, 2 * embeddedByteSize)

        // iterate through embedded transactions
        let transactions: string = ''
        let cursor: number = 0
        let counter: number = 0
        while (cursor < 2 * embeddedByteSize) {
            // read little endian embedded size
            const transactionSize = embeddedBytes.substr(cursor, 8) // size on 4 bytes

            // parse actual transaction size (+ swap endianness)
            const cursorLength = parseInt(swap16(transactionSize), 16)
            const paddingLength = cursorLength % 8 === 0 ? 0 : 8 - (cursorLength % 8)

            // read embedded payload (SIZE included ; PADDING ignored)
            const transactionBytes = embeddedBytes.substr(cursor, 2 * cursorLength)

            // read transaction type
            const embeddedTypeOffset = 8 + 8 + 64 + 8 + 2 + 2
            const rawEmbeddedType = transactionBytes.substr(embeddedTypeOffset, 4) // type on 2 bytes
            const transactionData = transactionBytes.substr(embeddedTypeOffset + 4)

            transactions += 'Embedded Transaction ' + (counter+1) + '): \n'
            transactions += this.readTransactionBody(rawEmbeddedType, transactionData)
            transactions += '\n\n'

            cursor += 2 * cursorLength + 2 * paddingLength
            ++counter
        }

        return transactions
    }

}
