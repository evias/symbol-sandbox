
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
    NamespaceId,
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
    AddressAliasTransaction,
    AliasActionType
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
        description: 'Namespace ID (JSON Uint64)',
    })
    namespaceId: string;
}

@command({
    description: 'Check for cow compatibility of AddressAliasTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let namespaceId;
        try {
            namespaceId = OptionsResolver(options,
                'namespaceId',
                () => { return ''; },
                'Enter a namespaceId: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespaceId (Array JSON ex: "[33347626, 3779697293]")');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1");
        this.monitorAddress(address.plain());

        return await this.removeAddressAlias(namespaceId, address);
    }

    public async removeAddressAlias(nsIdJSON: string, address: Address): Promise<Object>
    {
        const account = this.getAccount("tester1");

        // TEST: send address alias transaction

        const actionType  = AliasActionType.Unlink;
        const namespaceId = JSON.parse(nsIdJSON);

        const aliasTx = AddressAliasTransaction.create(
            Deadline.create(),
            actionType,
            new NamespaceId(namespaceId),
            address,
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(aliasTx);

        console.log(aliasTx);
        console.log("Signed Transaction: ", signedTransaction);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('AddressAlias announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'removeAddressAlias() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
