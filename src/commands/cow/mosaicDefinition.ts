
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
        flag: 'n',
        description: 'Mosaic Name',
    })
    name: string;
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

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.createMosaic();
    }

    public async createMosaic(): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(XEM.MOSAIC_ID, UInt64.fromUint(10)));

        // TEST: send mosaic creation transaction

        // STEP 1: MosaicDefinition
        const bytes = nacl_catapult.randomBytes(4);
        const nonce = new Uint8Array(bytes);
        const mosId = mosaicId(nonce, convert.hexToUint8(account.publicKey));

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            new UInt64(mosId),
            MosaicProperties.create({
                supplyMutable: true,
                transferable: true,
                levyMutable: false,
                divisibility: 3,
                duration: UInt64.fromUint(1000),
            }),
            NetworkType.MIJIN_TEST
        );

        console.log("MosaicDefinitionTransaction: ", createTx);
        //console.log("Mosaic ID: ", mosId);
        //console.log("Mosaic ID.toDTO()", (new UInt64(mosId)).compact());

        // STEP 2: MosaicSupplyChange
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            createTx.mosaicId,
            MosaicSupplyType.Increase,
            UInt64.fromUint(1000000),
            NetworkType.MIJIN_TEST
        );

        const signedCreateTransaction = account.sign(createTx);
        const signedSupplyTransaction = account.sign(supplyTx);

        //console.log("Signed Transaction: ", signedCreateTransaction);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedCreateTransaction).subscribe(() => {
            console.log('MosaicDefinition announced correctly');
            console.log('Hash:   ', signedCreateTransaction.hash);
            console.log('Signer: ', signedCreateTransaction.signer);
            console.log("");

            transactionHttp.announce(signedSupplyTransaction).subscribe(() => {
                console.log('MosaicSupplyChange announced correctly');
                console.log('Hash:   ', signedSupplyTransaction.hash);
                console.log('Signer: ', signedSupplyTransaction.signer);
                console.log("");

            }, (err) => {
                let text = '';
                text += 'testMosaicCreationAction() MosaicSupplyChange - Error';
                console.log(text, err.response !== undefined ? err.response.text : err);
            });

        }, (err) => {
            let text = '';
            text += 'testMosaicCreationAction() MosaicDefinition - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
