
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
    MosaicAliasTransaction,
    AliasActionType
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    @option({
        flag: 'm',
        description: 'Mosaic ID (JSON Uint64)',
    })
    mosaicId: string;
    namespaceId: string;
}

@command({
    description: 'Check for cow compatibility of MosaicAliasTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let namespaceName;
        try {
            namespaceName = OptionsResolver(options,
                'namespaceName',
                () => { return ''; },
                'Enter a namespaceName: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespaceName (Ex: "cat.currency")');
        }

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

        return await this.createMosaicAlias(namespaceName, mosaicId);
    }

    public async createMosaicAlias(namespace: string, mosIdJSON: string): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic alias transaction

        const actionType  = AliasActionType.Link;
        const namespaceId = new NamespaceId(namespace);
        const mosaicId    = JSON.parse(mosIdJSON); 

        const aliasTx = MosaicAliasTransaction.create(
            Deadline.create(),
            actionType,
            namespaceId,
            new MosaicId(mosaicId),
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(aliasTx, this.generationHash);

        console.log(aliasTx);
        console.log("Signed Transaction: ", signedTransaction);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('MosaicAlias announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'createMosaicAlias() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
