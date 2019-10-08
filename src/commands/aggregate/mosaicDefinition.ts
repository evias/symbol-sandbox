
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
    MosaicId,
    AccountHttp,
    MosaicNonce,
    Deadline,
    TransactionHttp,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicFlags,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
} from 'nem2-sdk';

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
        // add a block monitor
        this.monitorBlocks();

        this.monitorAddress(this.getAddress("tester1").plain());
        return await this.createMosaicWithSupplyAggregate();
    }

    public async createMosaicWithSupplyAggregate(): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic creation transaction with supply change in aggregate

        // STEP 1: MosaicDefinition
        const nonce = MosaicNonce.createRandom();
        const mosId = MosaicId.createFromNonce(nonce, account.publicAccount);

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            mosId,
            MosaicFlags.create(true, true, false),
            3,
            UInt64.fromUint(100000), // 100'000 blocks
            NetworkType.MIJIN_TEST
        );

        // STEP 2: MosaicSupplyChange
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            createTx.mosaicId,
            MosaicSupplyChangeAction.Increase,
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

            const signedTransaction = account.sign(aggregateTx, this.generationHash);

            // announce/broadcast transaction
            const transactionHttp = new TransactionHttp(this.endpointUrl);

            return transactionHttp.announce(signedTransaction).subscribe(() => {
                console.log('Transaction announced correctly');
                console.log('Hash:   ', signedTransaction.hash);
                console.log('Signer: ', signedTransaction.signerPublicKey);
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
