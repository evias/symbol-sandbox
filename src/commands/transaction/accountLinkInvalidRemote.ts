
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
    NetworkType,
    NamespaceId,
    Address,
    Deadline,
    TransactionHttp,
    AccountKeyLinkTransaction,
    LinkAction,
    UInt64,
    Account,
    AccountType,
    PublicAccount,
    RawAddress,
    Convert,
    SHA3Hasher as sha3Hasher,
} from 'symbol-sdk';
const { sha3_256 } = require('js-sha3');
import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

const arrayCopy = (dest, src, numElementsToCopy, destOffset = 0, srcOffset = 0) => {
    const length = undefined === numElementsToCopy ? dest.length : numElementsToCopy;
    for (let i = 0; i < length; ++i)
        dest[destOffset + i] = src[srcOffset + i];
}

const uint8View = input => {
    if (ArrayBuffer === input.constructor)
        return new Uint8Array(input); // note that wrapping an ArrayBuffer in an Uint8Array does not make a copy
    if (Uint8Array === input.constructor)
        return input;

    throw Error('unsupported type passed to uint8View');
}

const deepEqual = (lhs, rhs, numElementsToCompare) => {
    let length = numElementsToCompare;
    if (undefined === length) {
        if (lhs.length !== rhs.length)
            return false;

        ({ length } = lhs);
    }

    if (length > lhs.length || length > rhs.length)
        return false;

    for (let i = 0; i < length; ++i) {
        if (lhs[i] !== rhs[i])
            return false;
    }

    return true;
}

const isValidAddressDecoded = (decoded): boolean => {
    const hash = sha3_256.create();
    const checksumBegin = 25 - 4;
    hash.update(decoded.subarray(0, checksumBegin));
    const checksum = new Uint8Array(4);
    arrayCopy(checksum, uint8View(hash.arrayBuffer()), 4);
    return deepEqual(checksum, decoded.subarray(checksumBegin), 4);
}

const prepareUnclampedPublicKey = (privateKey): string => {
    const sk = Convert.hexToUint8(privateKey);
    const d = new Uint8Array(64);
    sha3Hasher.func(d, sk, 64);
    // DO NOT "clamp" clamp(d);
    return Convert.uint8ToHex(d);
}

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key of your account',
    })
    privateKey: string;
}

@command({
    description: 'Check for cow compatibility of AccountKeyLinkTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        const privateKey = OptionsResolver(options,
            'privateKey',
            () => { return ''; },
            'Enter your account private key: ');

        const account: Account = Account.createFromPrivateKey(privateKey, this.networkType)

        // add a block monitor
        this.monitorBlocks();

        const address = account.address
        this.monitorAddress(address.plain());

        return await this.createAccountLink(account);
    }

    public async createAccountLink(account: Account): Promise<Object>
    {
        const signer = account

        // TEST: send account link transaction

        const linkAction  = LinkAction.Link;

        // modify last character to be 0
        let invalidRemotePub: string = Account.generateNewAccount(this.networkType).publicKey.substr(0, 63) + '0'
        console.log(chalk.yellow('Linking account ' + account.address.plain() + ' to *invalid* remote public key: ' + invalidRemotePub))

        const linkTx = AccountKeyLinkTransaction.create(
            Deadline.create(),
            invalidRemotePub,
            linkAction,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedTransaction = signer.sign(linkTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('AddressAlias announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'createAddressAlias() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
