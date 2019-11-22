
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
    NetworkType,
    Address,
    Deadline,
    TransactionHttp,
    SecretLockTransaction,
    HashType,
    Convert as convert,
    Mosaic,
    NamespaceId,
} from 'nem2-sdk';

import { sha3_256 } from 'js-sha3';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 's',
        description: 'Enter a secret',
    })

    @option({
        flag: 'd',
        description: 'Enter a duration for the lock',
    })

    @option({
        flag: 'a',
        description: 'Enter an amount',
    })

    secret: string;
    duration: string;
    amount: string;
}

@command({
    description: 'Send a SecretLockTransaction for said secret, duration and amount',
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

        try {
            duration = OptionsResolver(options, 'duration', () => { return ''; }, 'Enter a duration: ');
            duration = this.readUIntArgument(duration);
        } catch (err) { throw new ExpectedError('Please enter a valid duration'); }

        try {
            amount = OptionsResolver(options, 'amount', () => { return ''; }, 'Enter an absolute amount (smallest unit): ');
            amount = this.readUIntArgument(amount);
        } catch (err) { throw new ExpectedError('Please enter a valid amount'); }

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
         * proof = secret.toHex()
         * secret = sha3_256(secret)
         * ```
         */
        const proof = convert.utf8ToHex(secret);
        const hashd = sha3_256(secret);

        // Send secret lock transaction
        return await this.sendSecretLock(recipient, duration, amount, hashd);
    }

    public async sendSecretLock(
        recipient: Address,
        duration: UInt64,
        amount: UInt64,
        secret: string
    ): Promise<Object>
    {
        // Secret is sent by tester1
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        const secretLockTx = SecretLockTransaction.create(
            Deadline.create(),
            new Mosaic(new NamespaceId(this.networkConfig.currencyMosaic), amount),
            duration,
            HashType.Op_Sha3_256,
            secret,
            recipient,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        // Secret is sent by tester1
        const signedTransaction = account.sign(secretLockTx, this.generationHash);
        console.log(chalk.yellow('Recipient Public Key: ' + this.getAccount("tester2").publicKey))
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(async () => {
            console.log('Announced secret lock transaction');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey, '\n');
        }, (err) => {
            let text = '';
            text += 'sendSecretLock() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
