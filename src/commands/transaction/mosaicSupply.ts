
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
    MosaicSupplyType
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
    description: 'Check for cow compatibility of MosaicDefinition',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let mosaicId;
        try {
            mosaicId = OptionsResolver(options,
                'mosaicId',
                () => { return ''; },
                'Enter a mosaicId: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid mosaicId (Array JSON ex: "[664046103, 198505464]")');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.addSupplyForMosaic(mosaicId);
    }

    public async addSupplyForMosaic(mosIdJSON: string): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic supply change transaction
        const mosaicId    = JSON.parse(mosIdJSON); 
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            new MosaicId(mosaicId),
            MosaicSupplyType.Increase,
            UInt64.fromUint(290888000), // div=3
            NetworkType.MIJIN_TEST
        );

        const signedSupplyTransaction = account.sign(supplyTx);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedSupplyTransaction).subscribe(() => {
            console.log('MosaicSupplyChange announced correctly');
            console.log('Hash:   ', signedSupplyTransaction.hash);
            console.log('Signer: ', signedSupplyTransaction.signer);

        }, (err) => {
            let text = '';
            text += 'MosaicSupplyChange - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}