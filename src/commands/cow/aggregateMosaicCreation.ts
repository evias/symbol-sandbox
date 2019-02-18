
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
        description: 'Mosaic name',
    })
    name: string;
}

@command({
    description: 'Check for cow compatibility of AggregateTransaction with MosaicDefinition + MosaicSupplyChange',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        this.monitorAddress(this.getAddress("tester1").plain());
        return await this.createMosaicWithSupplyAggregate();
    }

    public async createMosaicWithSupplyAggregate(): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(XEM.MOSAIC_ID, UInt64.fromUint(10)));

        // TEST 3: send mosaic creation transaction

        // STEP 1: MosaicDefinition
        const bytes = nacl_catapult.randomBytes(8);
        const nonce = uint64_t.fromBytes(bytes);
        const mosId = mosaicId(nonce, convert.hexToUint8(account.publicKey));

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            new UInt64(nonce),
            UInt64.fromUint(mosId),
            MosaicProperties.create({
                supplyMutable: true,
                transferable: false,
                levyMutable: false,
                divisibility: 3,
                duration: UInt64.fromUint(1000),
            }),
            NetworkType.MIJIN_TEST
        );

        // STEP 2: MosaicSupplyChange
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            createTx.mosaicId,
            MosaicSupplyType.Increase,
            UInt64.fromUint(1000000),
            NetworkType.MIJIN_TEST
        );

        // STEP 3: create aggregate

        const accountHttp = new AccountHttp(this.endpointUrl);
        return accountHttp.getAccountInfo(address).subscribe((accountInfo) => {

            const aggregateTx = AggregateTransaction.createComplete(
                Deadline.create(),
                [
                    createTx.toAggregate(accountInfo.publicAccount),
                    supplyTx.toAggregate(accountInfo.publicAccount)
                ],
                NetworkType.MIJIN_TEST,
                []
            );

            const signedTransaction = account.sign(aggregateTx);

            // announce/broadcast transaction
            const transactionHttp = new TransactionHttp(this.endpointUrl);

            return transactionHttp.announce(signedTransaction).subscribe(() => {
                console.log('Transaction announced correctly');
                console.log('Hash:   ', signedTransaction.hash);
                console.log('Signer: ', signedTransaction.signer);
            }, (err) => {
                let text = '';
                text += 'testMosaicCreationAction() - Error';
                console.log(text, err.response !== undefined ? err.response.text : err);
            });
        }, (err) => {
            console.log("getAccountInfo error: ", err);
        });
    }

}
