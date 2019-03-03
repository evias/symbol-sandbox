
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
    MosaicNonce,
    Address,
    Deadline,
    Mosaic,
    NamespaceId,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    NetworkCurrencyMosaic,
    PublicAccount,
    Transaction,
    TransactionType,
    Listener,
    EmptyMessage,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicProperties,
    MosaicSupplyChangeTransaction,
    MosaicSupplyType,
    MosaicAliasTransaction,
    AliasActionType,
    AliasType,
    RegisterNamespaceTransaction,
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
    @option({
        flag: 'd',
        description: 'Divisibility [0, 6]',
    })
    @option({
        flag: 's',
        description: 'Mutable supply Mosaic [0, 1]',
    })
    @option({
        flag: 't',
        description: 'Transferable Mosaic [0, 1]',
    })
    @option({
        flag: 'i',
        description: 'Initial supply',
    })
    name: string;
    divisibility: number;
    supplyMutable: boolean;
    transferable: boolean;
    initialSupply: string;
}

@command({
    description: 'Complete Mosaic configuration through aggregate transaction with RegisterNamespace, MosaicDefinition and MosaicSupplyChange',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) 
    {
        let name;
        let divisibility;
        let supplyMutable;
        let transferable;
        let initialSupply;

        // read parameters

        try {
            name = OptionsResolver(options, 'name', () => { return ''; }, 'Enter a namespace name (mosaic name): ');
        } catch (err) { throw new ExpectedError('Please enter a valid mosaic name'); }

        try {
            divisibility = OptionsResolver(options, 'divisibility', () => { return ''; }, 'Enter a mosaic divisibility: ');
        } catch (err) { throw new ExpectedError('Please enter a valid mosaic divisibility (0-6)'); }

        try {
            supplyMutable = OptionsResolver(options, 'supplyMutable', () => { return ''; }, 'Should the supply be mutable ? [1, 0] ');
        } catch (err) { throw new ExpectedError('Please enter 1 for mutable supply and 0 for immutable supply'); }

        try {
            transferable = OptionsResolver(options, 'transferable', () => { return ''; }, 'Should the mosaic be transferable ? [1, 0] ');
        } catch (err) { throw new ExpectedError('Please enter 1 for transferable and 0 for non-transferable'); }

        try {
            initialSupply = OptionsResolver(options, 'initialSupply', () => { return ''; }, 'Enter an initial supply: ');

            if (initialSupply.indexOf('[') === 0) {
                initialSupply = JSON.parse(initialSupply);
                initialSupply = new UInt64(initialSupply);
            }
            else {
                initialSupply = UInt64.fromUint(initialSupply);
            }

        } catch (err) { throw new ExpectedError('Please enter a valid initial supply'); }

        // add a block monitor
        this.monitorBlocks();

        this.monitorAddress(this.getAddress("tester1").plain());

        // shortcuts
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // read account information
        const accountHttp = new AccountHttp(this.endpointUrl);
        const accountInfo = await accountHttp.getAccountInfo(this.getAddress("tester1")).toPromise();

        // build transactions

        // STEP 1: register namespace(s)
        const namespaceTxes = await this.getCreateNamespaceTransactions(
            account.publicAccount,
            name
        );

        // STEP 2.1: create MosaicDefinition transaction
        const mosaicDefinitionTx = this.getCreateMosaicTransaction(
            account.publicAccount,
            divisibility,
            supplyMutable,
            transferable
        );

        // STEP 2.2: create MosaicSupplyChange transaction
        const mosaicSupplyTx = this.getMosaicSupplyChangeTransaction(
            mosaicDefinitionTx.mosaicId,
            initialSupply
        );

        // prepare mosaic definition for aggregate
        const mosaicDefinitionTxes = [
            mosaicDefinitionTx.toAggregate(account.publicAccount),
            mosaicSupplyTx.toAggregate(account.publicAccount)
        ];

        // STEP 3: create MosaicAlias transaction to link lower level namespace to mosaic
        const aliasTxes = this.getCreateAliasTransactions(
            account.publicAccount,
            name,
            mosaicDefinitionTx.mosaicId
        );

        // STEP 4: merge transactions and broadcast
        const allTxes = [].concat(namespaceTxes, mosaicDefinitionTxes, aliasTxes);
        return await this.broadcastAggregateMosaicConfiguration(account, allTxes);
    }

    public async broadcastAggregateMosaicConfiguration(
        account: Account,
        configTransactions: Transaction[]
    ): Promise<Object> 
    {
        const aggregateTx = AggregateTransaction.createComplete(
            Deadline.create(),
            configTransactions,
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
            text += 'broadcastAggregateMosaicConfiguration() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public async getCreateNamespaceTransactions(
        publicAccount: PublicAccount,
        namespaceName: string
    ): Promise<Object>
    {
        const isSub = /\.{1,}/.test(namespaceName);
        const namespaceId = new NamespaceId(namespaceName);
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        // namespace doesn't exist
        const parts = namespaceName.split('.');
        if (parts.length > 3) {
            throw new Error('Invalid namespace name "' + namespaceName + '", maximum 3 levels allowed.');
        }

        return new Promise(async (resolve, reject) => {
            let registerTxes = [];
            for (let i = 0; i < parts.length; i++) {
                const fullName = i === 0 ? parts[0] : parts.slice(0, i+1).join('.');
                const registerTx = this.getCreateNamespaceTransaction(fullName);
                registerTxes.push(registerTx.toAggregate(publicAccount));

                try {
                    const namespaceId = new NamespaceId(fullName);
                    const namespaceInfo = await namespaceHttp.getNamespace(namespaceId).toPromise();

                    // namespace exists
                    registerTxes.pop();
                }
                catch(e) {} // Do nothing, namespace "Error: Not Found"
            }

            console.log("Step 1) Creating " + registerTxes.length + " RegisterNamespaceTransaction");
            return resolve(registerTxes);
        });
    }

    public getCreateNamespaceTransaction(
        namespaceName: string
    ): RegisterNamespaceTransaction
    {
        const isSub = /\.{1,}/.test(namespaceName);
        const parts = namespaceName.split('.');
        const parent = parts.slice(0, parts.length-1).join('.');
        const current = parts.pop();

        let registerTx;
        if (isSub === true) {
            // sub namespace level[i]
            registerTx = RegisterNamespaceTransaction.createSubNamespace(
                Deadline.create(),
                current,
                parent,
                NetworkType.MIJIN_TEST
            );
            
        }
        else {
            // root namespace
            registerTx = RegisterNamespaceTransaction.createRootNamespace(
                Deadline.create(),
                namespaceName,
                UInt64.fromUint(100000), // 100'000 blocks
                NetworkType.MIJIN_TEST
            );
        }

        return registerTx;
    }

    public getCreateMosaicTransaction(
        publicAccount: PublicAccount,
        divisibility: number,
        supplyMutable: boolean,
        transferable: boolean
    ): MosaicDefinitionTransaction
    {
        // create nonce and mosaicId
        const nonce = MosaicNonce.createRandom();
        const mosId = MosaicId.createFromNonce(nonce, publicAccount);

        console.log('Step 2.1) Creating MosaicDefinitionTransaction with mosaicId: ' + JSON.stringify(mosId.id));
        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            mosId,
            MosaicProperties.create({
                supplyMutable: supplyMutable,
                transferable: transferable,
                levyMutable: false,
                divisibility: divisibility,
                duration: UInt64.fromUint(1000000), // 1'000'000 blocks
            }),
            NetworkType.MIJIN_TEST
        );

        return createTx;
    }

    public getMosaicSupplyChangeTransaction(
        mosaicId: MosaicId,
        initialSupply: UInt64
    ): MosaicSupplyChangeTransaction
    {
        console.log('Step 2.1) Creating MosaicSupplyChangeTransaction with mosaicId: ' + JSON.stringify(mosaicId.id));
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            MosaicSupplyType.Increase,
            initialSupply,
            NetworkType.MIJIN_TEST
        );

        return supplyTx;
    }

    public getCreateAliasTransactions(
        publicAccount: PublicAccount,
        namespaceName: string,
        mosaicId: MosaicId
    ): Transaction[]
    {
        const namespaceId = new NamespaceId(namespaceName);
        const actionType  = AliasActionType.Link;

        console.log('Step 3) Creating MosaicAliasTransaction with for namespace: ' + namespaceName);
        const aliasTx = MosaicAliasTransaction.create(
            Deadline.create(),
            actionType,
            namespaceId,
            mosaicId,
            NetworkType.MIJIN_TEST
        );

        return [
            aliasTx.toAggregate(publicAccount),
        ];
    }
}
