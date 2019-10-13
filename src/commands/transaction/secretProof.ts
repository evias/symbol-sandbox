
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
    Deadline,
    TransactionHttp,
    SecretProofTransaction,
    HashType,
    Convert as convert,
    UInt64,
} from 'nem2-sdk';

import { sha3_256 } from 'js-sha3';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 's',
        description: 'Enter a secret',
    })

    secret: string;
}

@command({
    description: 'Send a SecretProofTransaction for given secret',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();
        let secret;
        let duration;
        let amount;

        try {
            secret = OptionsResolver(options,
                'secret',
                () => { return ''; },
                'Enter a secret: ');
        } catch (err) { throw new ExpectedError('Enter a valid secret'); }

        // add a block monitor
        this.monitorBlocks();

        // monitor for lock/proof
        const address = this.getAddress("tester2");
        this.monitorAddress(address.plain());

        // create proof and secret

        /**
         * ```
         * proof = secret.toHex()
         * secret = sha3_256(secret)
         * ```
         */
        const proof = convert.utf8ToHex(secret);
        const hashd = sha3_256(secret);

        // Send secret proof transaction
        return await this.sendSecretProof(hashd, proof);
    }

    public async sendSecretProof(
        secret: string,
        proof: string,
    ): Promise<Object>
    {
        // Proof is sent by tester2
        const prover = this.getAccount("tester2");
        const initiator = this.getAddress("tester1");

        const secretProofTx = SecretProofTransaction.create(
            Deadline.create(),
            HashType.Op_Sha3_256,
            secret,
            initiator,
            proof,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        // Proof is sent by tester2
        const signedTransaction = prover.sign(secretProofTx, this.generationHash);
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Announced secret proof transaction');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey, '\n');
        }, (err) => {
            let text = '';
            text += 'sendSecretProof() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
