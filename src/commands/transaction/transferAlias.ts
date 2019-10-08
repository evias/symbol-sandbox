
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
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    NamespaceId,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    name: string;
}

@command({
    description: 'Send TransferTransaction with namespaceId in mosaics',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let name;
        try {
            name = OptionsResolver(options,
                'name',
                () => { return ''; },
                'Enter a namespace name (currency to send): ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespace name');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        const recipient = this.getAddress("tester2");
        return await this.sendTransferTo(name, recipient);
    }

    public async sendTransferTo(namespaceName: string, recipient: Address): Promise<Object>
    {
        // TEST 2: send transfer with alias `cat.currency`
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId(namespaceName), UInt64.fromUint(10)));

        const account   = this.getAccount("tester1");
        const message   = PlainMessage.create("Testing simple transfer with alias: " + namespaceName);

        // prepare SDK transaction and sign it
        const transferTransaction = TransferTransaction.create(
            Deadline.create(), 
            recipient, 
            mosaics, 
            message, 
            NetworkType.MIJIN_TEST,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedTransaction = account.sign(transferTransaction, this.generationHash);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
        }, (err) => {
            let text = '';
            text += 'testTransferAction() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
