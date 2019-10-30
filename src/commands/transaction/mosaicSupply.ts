
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
    changeAction: number;
    @option({
        flag: 's',
        description: 'Supply Modification',
    })
    supply: number;
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
            changeAction,
            supplyMod;
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

            changeAction = OptionsResolver(options, 'changeAction', () => { return ''; }, 'Enter 0 for supply increase or 1 for supply decrease: ');
            changeAction = changeAction == '0' ? 0 : 1

            supplyMod = OptionsResolver(options, 'supply', () => { return ''; }, 'Enter the supply to add/remove (absolute): ');

        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid mosaicId (Array JSON ex: "[664046103, 198505464]" or hexadecimal ex: "308F144790CD7BC4")');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.addSupplyForMosaic(mosaicId, changeAction, supplyMod);
    }

    public async addSupplyForMosaic(
        mosaicId: MosaicId,
        changeAction: number,
        supplyMod: number
    ): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic supply change transaction
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            changeAction === 0 ? MosaicSupplyChangeAction.Increase : MosaicSupplyChangeAction.Decrease,
            UInt64.fromUint(supplyMod),
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedSupplyTransaction = account.sign(supplyTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedSupplyTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedSupplyTransaction).subscribe(() => {
            console.log('MosaicSupplyChange announced correctly');
            console.log('Hash:   ', signedSupplyTransaction.hash);
            console.log('Signer: ', signedSupplyTransaction.signerPublicKey);

        }, (err) => {
            let text = '';
            text += 'MosaicSupplyChange - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
