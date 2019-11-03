
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
    Id,
    NetworkType,
    MosaicId,
    Deadline,
    TransactionHttp,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
    RawUInt64,
    AggregateTransaction,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'i',
        description: 'Mosaic Id',
    })
    mosaicId: string;
    @option({
        flag: 'a',
        description: 'Change Action',
    })
    changeAction1: number;
    @option({
        flag: 's',
        description: 'Supply Modification',
    })
    supply1: number;
    @option({
        flag: 'b',
        description: 'Change Action',
    })
    changeAction2: number;
    @option({
        flag: 'm',
        description: 'Supply Modification',
    })
    supply2: number;
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
        await this.setupConfig();

        let mosaicId,
            changeAction1,
            supplyMod1,
            changeAction2,
            supplyMod2;
        try {
            mosaicId = OptionsResolver(options,
                'mosaicId',
                () => { return ''; },
                'Enter a mosaicId (array notation or hexadecimal): ');

            if (mosaicId.indexOf('[') === 0) {
                // from array notation
                mosaicId = new MosaicId(JSON.parse(mosaicId))
            }
            else {
                // from hex
                mosaicId = new MosaicId(RawUInt64.fromHex(mosaicId))
            }

            changeAction1 = OptionsResolver(options, 'changeAction1', () => { return ''; }, 'Enter 0 for supply increase or 1 for supply decrease: ');
            changeAction1 = changeAction1 == '0' ? 0 : 1

            supplyMod1 = OptionsResolver(options, 'supply1', () => { return ''; }, 'Enter the supply to add/remove (absolute): ');

            changeAction2 = OptionsResolver(options, 'changeAction2', () => { return ''; }, 'Enter 0 for supply increase or 1 for supply decrease: ');
            changeAction2 = changeAction1 == '0' ? 0 : 1

            supplyMod2 = OptionsResolver(options, 'supply2', () => { return ''; }, 'Enter the supply to add/remove (absolute): ');

        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid mosaicId (Array JSON ex: "[664046103, 198505464]" or hexadecimal ex: "308F144790CD7BC4")');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.addSupplyForMosaic(mosaicId, changeAction1, supplyMod1, changeAction2, supplyMod2);
    }

    public async addSupplyForMosaic(
        mosaicId: MosaicId,
        changeAction1: number,
        supplyMod1: number,
        changeAction2: number,
        supplyMod2: number
    ): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic supply change transaction
        const supplyTx1 = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            changeAction1 === 0 ? MosaicSupplyChangeAction.Increase : MosaicSupplyChangeAction.Decrease,
            UInt64.fromUint(supplyMod1),
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const supplyTx2 = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            changeAction2 === 0 ? MosaicSupplyChangeAction.Increase : MosaicSupplyChangeAction.Decrease,
            UInt64.fromUint(supplyMod2),
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const aggregateTx = AggregateTransaction.createComplete(
            Deadline.create(),
            [supplyTx1.toAggregate(account.publicAccount), supplyTx2.toAggregate(account.publicAccount)],
            this.networkType,
            [],
            UInt64.fromUint(3000000)
        )

        const signedAggregateTx = account.sign(aggregateTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedAggregateTx.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedAggregateTx).subscribe(() => {
            console.log('MosaicSupplyChange announced correctly');
            console.log('Hash:   ', signedAggregateTx.hash);
            console.log('Signer: ', signedAggregateTx.signerPublicKey);

        }, (err) => {
            let text = '';
            text += 'MosaicSupplyChange - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
