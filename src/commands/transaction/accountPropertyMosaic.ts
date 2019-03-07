
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

import {
    convert,
    mosaicId,
    nacl_catapult,
    uint64 as uint64_t
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'i',
        description: 'Mosaic Id',
    })
    mosaicId: string;
}

@command({
    description: 'Send AccountPropertyTransaction (Mosaic modification)',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let mosaicId;
        try {
            mosaicId = OptionsResolver(options, 'mosaicId', () => { return ''; }, 'Enter a mosaicId: ');
            mosaicId = JSON.parse(mosaicId);
        } catch (err) {
            throw new ExpectedError('Enter a valid mosaicId (Array JSON ex: "[664046103, 198505464]")');
        }

        // add monitors
        this.monitorBlocks();
        this.monitorAddress(this.getAddress("multisig1").plain());

        return await this.createMosaicPropertyModification(mosaicId);
    }

    public async createMosaicPropertyModification(mosaicId: number[]): Promise<Object>
    {
        const account = this.getAccount("multisig1");

        // Add `mosaicId` MosaicId to the AccountPropertyMosaic filter
        const mosaicPropertyFilter = AccountPropertyTransaction.createMosaicFilter(
            PropertyModificationType.Add,
            new MosaicId(mosaicId),
        );

        // Add `mosaicId` property filter and *allow* mosaic for tester1
        const addressModification = AccountPropertyTransaction.createMosaicPropertyModificationTransaction(
            Deadline.create(), 
            PropertyType.AllowMosaic, 
            [mosaicPropertyFilter],
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(addressModification);

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
