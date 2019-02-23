
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
    Account,
    NetworkType,
    MosaicId,
    MosaicService,
    AccountHttp,
    MosaicHttp,
    NamespaceHttp,
    MosaicView,
    MosaicInfo,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    XEM,
    PublicAccount,
    TransactionType,
    Listener,
    EmptyMessage,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicProperties,
    MosaicSupplyChangeTransaction,
    MosaicSupplyType,
    RegisterNamespaceTransaction,
    SecretLockTransaction,
    SecretProofTransaction,
    HashType
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    nacl_catapult,
    uint64 as uint64_t
} from "nem2-library";

import { sha3_256 } from 'js-sha3';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 's',
        description: 'Enter a secret',
    })
    secret: string;

    @option({
        flag: 'a',
        description: 'Enter a recipient address',
    })
    address: string;
}

@command({
    description: 'Check for cow compatibility of SecretLockTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let secret;
        try {
            secret = OptionsResolver(options,
                'secret',
                () => { return ''; },
                'Enter a secret: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid secret');
        }

        // add a block monitor
        this.monitorBlocks();

        // monitor for lock
        const address = this.getAddress("tester1");
        this.monitorAddress(address.plain());

        // monitor for proof
        const recipient = this.getAddress("tester2");
        // this.monitorAddress(recipient.plain());

        // create proof and secret

        /**
         * ```
         * proof = sha3_256(secret.toHex())
         * secret = sha3_256("M4G1C " || proof || " M4G1C")
         * ```
         */
        const proof = sha3_256(convert.utf8ToHex(secret)).toUpperCase();
        secret = sha3_256("M4G1C " + secret + " M4G1C").toUpperCase();

        // Step 1: Send secret lock transaction
        await this.sendSecretLock(secret, proof, recipient);
    }

    public async sendSecretLock(secret: string, proof: string, recipient: Address): Promise<Object>
    {
        // Secret is sent by tester1
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send register namespace transaction
        const secretLockTx = SecretLockTransaction.create(
            Deadline.create(),
            XEM.createRelative(5),
            UInt64.fromUint(10),
            HashType.Op_Sha3_256,
            secret,
            recipient,
            NetworkType.MIJIN_TEST);

        const signedTransaction = account.sign(secretLockTx);
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(async () => {
            console.log('Announced secret lock transaction');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer, '\n');

            // Step 2: Send secret proof transaction
            return await this.sendSecretProof(secret, proof, recipient);

        }, (err) => {
            let text = '';
            text += 'sendSecretLock() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public async sendSecretProof(secret: string, proof: string, recipient: Address): Promise<Object>
    {
        // Proof is sent by tester2
        const address = this.getAddress("tester2");
        const account = this.getAccount("tester2");

        // TEST: send register namespace transaction
        const secretProofTx = SecretProofTransaction.create(
            Deadline.create(),
            HashType.Op_Sha3_256,
            secret,
            proof,
            NetworkType.MIJIN_TEST);

        const signedTransaction = account.sign(secretProofTx);
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Announced secret proof transaction');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer, '\n');
        }, (err) => {
            let text = '';
            text += 'sendSecretProof() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
