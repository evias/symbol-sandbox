
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
    NamespaceHttp,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    NamespaceId,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'r',
        description: 'Recipient address',
    })
    address: string;
    @option({
        flag: 'a',
        description: 'Absolute amount of nem.xem (divisibility 6)',
    })
    amount: number;
    @option({
        flag: 'g',
        description: 'Absolute amount of greg.token (divisibility 0)',
    })
    amountG: number;
}

@command({
    description: 'Send TransferTransaction with multiple mosaics unordered',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let recipientAddress
        let recipient: Address
        let amount: number
        let amountG: number

        try {
            recipientAddress = OptionsResolver(options,
                'address',
                () => { return ''; },
                'Enter a recipient address: ')
            recipient = Address.createFromRawAddress(recipientAddress)
        } catch (err) {
            recipient = this.getAddress("tester2")
        }

        try {
            amount = parseInt(OptionsResolver(options,
                'amount',
                () => { return ''; },
                'Enter an absolute amount of nem.xem: '))
            if (isNaN(amount) || amount < 0) {
                amount = 100000000 // 100 nem.xem
            }
        } catch (err) {
            amount = 100000000 // 100 nem.xem
        }

        try {
            amountG = parseInt(OptionsResolver(options,
                'amountG',
                () => { return ''; },
                'Enter an amount of greg.token: '))
            if (isNaN(amountG) || amountG < 0) {
                amountG = 1 // 1 greg.token
            }
        } catch (err) {
            amountG = 1 // 1 greg.token
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.sendTransferTo(recipient, amount, amountG);
    }

    public async sendTransferTo(
        recipient: Address,
        amount: number,
        amountG: number
    ): Promise<Object>
    {
        // TEST 2: send transfer with alias `cat.currency`
        let mosaics: Mosaic[] = [];
        let relative = amount ? amount / Math.pow(10, 6) : amount;

        // read mosaic Id from namespace name
        const namespaceHttp = new NamespaceHttp(this.endpointUrl)
        const namespaceId = new NamespaceId(this.networkConfig.currencyMosaic)
        const sndNamespaceId = new NamespaceId('greg.token')
        const mosaicId = await namespaceHttp.getLinkedMosaicId(namespaceId).toPromise()
        const mosaicIdG = await namespaceHttp.getLinkedMosaicId(sndNamespaceId).toPromise()

        // attach mosaicId !
        mosaics.push(new Mosaic(mosaicIdG, UInt64.fromUint(amountG))); // intentionally push "6805AD01F67E0097"
        mosaics.push(new Mosaic(mosaicId, UInt64.fromUint(amount))); // before "308F144790CD7BC4"

        const account   = this.getAccount("tester1");
        const message   = PlainMessage.create("Simple transfer of " + amount + " nem.xem and " + amountG + " greg.token");
        const deadline  = Deadline.create();

        // prepare SDK transaction and sign it
        const transferTransaction = TransferTransaction.create(
            deadline,
            recipient,
            mosaics,
            message,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedTransaction = account.sign(transferTransaction, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

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
