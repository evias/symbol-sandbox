
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
    PropertyModificationType,
    SignedTransaction
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 't',
        description: 'Entity Type',
    })
    mosaicId: string;
}

@command({
    description: 'Send AccountPropertyTransaction (Entity type modification)',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester4").plain();
        this.monitorAddress(address);

        return await this.createEntityTypePropertyModification();
    }

    public async createEntityTypePropertyModification(): Promise<Object>
    {
        const account = this.getAccount("tester4");

        // first time "Transaction Type filter" must allow the 
        // `MODIFY_ACCOUNT_PROPERTY_ENTITY_TYPE` transaction type
        // further filters could add different transaction types to
        // the list, but the first time must always be this type.

        const entityTypePropertyFilter = AccountPropertyTransaction.createEntityTypeFilter(
            PropertyModificationType.Add,
            TransactionType.MODIFY_ACCOUNT_PROPERTY_ENTITY_TYPE
        );

        // allow transaction type `MODIFY_ACCOUNT_PROPERTY_ENTITY_TYPE` for tester3
        const entityTypeModification = AccountPropertyTransaction.createEntityTypePropertyModificationTransaction(
            Deadline.create(), 
            PropertyType.AllowTransaction, 
            [entityTypePropertyFilter],
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(entityTypeModification, this.generationHash);

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
