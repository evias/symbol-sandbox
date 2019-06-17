
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
    NetworkCurrencyMosaic,
    PublicAccount,
    TransactionType,
    Listener,
    EmptyMessage,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicProperties,
    MosaicSupplyChangeTransaction,
    MosaicSupplyType,
    NamespaceId,
    PropertyType,
    AccountPropertyTransaction,
    PropertyModificationType
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'a',
        description: 'Address',
    })
    address: string;
}

@command({
    description: 'Send AccountPropertyTransaction (Address modification)',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1");
        this.monitorAddress(address.plain());

        // tester1 blocks incoming transactions from tester4
        const recipient = this.getAddress("tester4");

        return await this.createAddressPropertyModification(recipient);
    }

    public async createAddressPropertyModification(recipient: Address): Promise<Object>
    {
        const account   = this.getAccount("tester1");
        const addressPropertyFilter = AccountPropertyTransaction.createAddressFilter(
            PropertyModificationType.Add,
            recipient,
        );

        // tester1 blocks incoming transactions from tester4
        const addressModification = AccountPropertyTransaction.createAddressPropertyModificationTransaction(
            Deadline.create(), 
            PropertyType.BlockAddress, 
            [addressPropertyFilter],
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(addressModification, this.generationHash);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer);
        }, (err) => {
            let text = '';
            text += 'testTransferAction() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
