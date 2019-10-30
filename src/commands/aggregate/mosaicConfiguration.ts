
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
import * as readlineSync from 'readline-sync';
import {
    UInt64,
    Account,
    Address,
    MosaicId,
    AccountHttp,
    NamespaceHttp,
    MosaicNonce,
    Deadline,
    NamespaceId,
    TransactionHttp,
    PublicAccount,
    Transaction,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicFlags,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
    MosaicAliasTransaction,
    AliasAction,
    NamespaceRegistrationTransaction,
    TransferTransaction,
    Mosaic,
    PlainMessage,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Mosaic name',
    })
    name: string;
    @option({
        flag: 'd',
        description: 'Divisibility [0, 6]',
    })
    divisibility: number;
    @option({
        flag: 'i',
        description: 'Initial supply',
    })
    initialSupply: string;
    @option({
        flag: 'a',
        description: 'Distribution addresses',
    })
    addresses: string;
    @option({
        flag: 's',
        description: 'Distribution amount',
    })
    amount: number;
}

@command({
    description: 'Complete Mosaic configuration through aggregate transaction with RegisterNamespace, MosaicDefinition and MosaicSupplyChange, MosaicAlias and TransferTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) 
    {
        await this.setupConfig()
        let name
        let divisibility
        let initialSupply
        let addresses: Address[] = []
        let distributionAmount: number = 0

        // read parameters

        try {
            name = OptionsResolver(options, 'name', () => { return ''; }, 'Enter a namespace name (mosaic name): ');
        } catch (err) { throw new ExpectedError('Please enter a valid mosaic name'); }

        try {
            divisibility = OptionsResolver(options, 'divisibility', () => { return ''; }, 'Enter a mosaic divisibility: ');
            divisibility = divisibility < 0 ? 0 : divisibility > 6 ? 6 : divisibility
        } catch (err) { throw new ExpectedError('Please enter a valid mosaic divisibility (0-6)'); }

        try {
            initialSupply = OptionsResolver(options, 'initialSupply', () => { return ''; }, 'Enter an initial supply: ');
            initialSupply = UInt64.fromUint(initialSupply);
        } catch (err) { throw new ExpectedError('Please enter a valid initial supply'); }

        console.log('');
        const supplyMutable = readlineSync.keyInYN(
            'Should the mosaic supply be mutable? ');

        console.log('');
        const transferable = readlineSync.keyInYN(
            'Should the mosaic be transferable? ');

        console.log('');
        const restrictable = readlineSync.keyInYN(
            'Should the mosaic be restrictable? ');

        console.log('');
        const distribution = readlineSync.keyInYN(
            'Would you like to configure distribution of the mosaic? ');
        console.log('');

        if (distribution === true) {
            try {
                let distributeTo = OptionsResolver(options, 'addresses', () => { return ''; }, 'Enter a comma-separated list of addresses: ');
                distributeTo.split(',').map((stakeholder: string) => {
                    const clean = stakeholder.replace(/^\s*/, '').replace(/\s$/, '').toUpperCase()
                    const addr = Address.createFromRawAddress(clean)
                    addresses.push(addr)
                })
            } catch (err) {
                throw new ExpectedError('Please enter a valid comma-separated list of addresses'); 
            }

            try {
                distributionAmount = OptionsResolver(options, 'amount', () => { return ''; }, 'Enter an amount to distribute: ');

                const total = distributionAmount * addresses.length
                if (total > initialSupply) {
                    throw new Error("Total distribution amount must not exceed initial supply")
                }
            } catch (err) { throw err }
        }

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
            transferable,
            restrictable
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

        let distributionTxes = []
        if (distribution === true && addresses.length) {
            // STEP 4: create Transfer transaction to distribute mosaic
            distributionTxes = this.getTransferTransactions(
                account.publicAccount,
                mosaicDefinitionTx.mosaicId,
                addresses,
                distributionAmount
            );
        }

        // STEP 5: merge transactions and broadcast
        const allTxes = [].concat(namespaceTxes, mosaicDefinitionTxes, aliasTxes, distributionTxes);
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
            this.networkType,
            [],
            UInt64.fromUint(1000000)
        );

        const signedTransaction = account.sign(aggregateTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
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

            console.log(chalk.yellow("Step 1) Creating " + registerTxes.length + " NamespaceRegistrationTransaction"));
            return resolve(registerTxes);
        });
    }

    public getCreateNamespaceTransaction(
        namespaceName: string
    ): NamespaceRegistrationTransaction
    {
        const isSub = /\.{1,}/.test(namespaceName);
        const parts = namespaceName.split('.');
        const parent = parts.slice(0, parts.length-1).join('.');
        const current = parts.pop();

        let registerTx;
        if (isSub === true) {
            // sub namespace level[i]
            registerTx = NamespaceRegistrationTransaction.createSubNamespace(
                Deadline.create(),
                current,
                parent,
                this.networkType,
                UInt64.fromUint(1000000)
            );
            
        }
        else {
            // root namespace
            registerTx = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(),
                namespaceName,
                UInt64.fromUint(100000), // 100'000 blocks
                this.networkType,
                UInt64.fromUint(1000000)
            );
        }

        return registerTx;
    }

    public getCreateMosaicTransaction(
        publicAccount: PublicAccount,
        divisibility: number,
        supplyMutable: boolean,
        transferable: boolean,
        restrictable: boolean
    ): MosaicDefinitionTransaction
    {
        // create nonce and mosaicId
        const nonce = MosaicNonce.createRandom();
        const mosId = MosaicId.createFromNonce(nonce, publicAccount);
        const props = {
            supplyMutable: supplyMutable,
            transferable: transferable,
            levyMutable: false,
            divisibility: divisibility,
            duration: UInt64.fromUint(1000000), // 1'000'000 blocks
        };

        console.log(chalk.yellow('Step 2.1) Creating MosaicDefinitionTransaction with mosaicId: ' + JSON.stringify(mosId.id)));
        console.log(chalk.yellow('Step 2.2) Creating MosaicDefinitionTransaction with properties: ' + JSON.stringify(props)));

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            mosId,
            MosaicFlags.create(supplyMutable, transferable, restrictable),
            divisibility,
            UInt64.fromUint(100000), // 100'000 blocks
            this.networkType,
            UInt64.fromUint(1000000)
        );

        return createTx;
    }

    public getMosaicSupplyChangeTransaction(
        mosaicId: MosaicId,
        initialSupply: UInt64
    ): MosaicSupplyChangeTransaction
    {
        console.log(chalk.yellow('Step 2.3) Creating MosaicSupplyChangeTransaction with mosaicId: ' + JSON.stringify(mosaicId.id)));
        const supplyTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            MosaicSupplyChangeAction.Increase,
            initialSupply,
            this.networkType,
            UInt64.fromUint(1000000)
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
        const actionType  = AliasAction.Link;

        console.log(chalk.yellow('Step 3) Creating MosaicAliasTransaction with for namespace: ' + namespaceName));
        const aliasTx = MosaicAliasTransaction.create(
            Deadline.create(),
            actionType,
            namespaceId,
            mosaicId,
            this.networkType,
            UInt64.fromUint(1000000)
        );

        return [
            aliasTx.toAggregate(publicAccount),
        ];
    }

    public getTransferTransactions(
        publicAccount: PublicAccount,
        mosaicId: MosaicId,
        addresses: Address[],
        amount: number
    ): Transaction[]
    {
        console.log(chalk.yellow('Step 4) Sending ' + amount.toString() + ' to ' + addresses.length + ' addresses.'));

        let transferTxes: Transaction[] = []
        addresses.map((address: Address) => {
            const transferTx = TransferTransaction.create(
                Deadline.create(),
                address,
                [new Mosaic(mosaicId, UInt64.fromUint(amount))],
                PlainMessage.create('nem2-sandbox initial coin distribution'),
                this.networkType,
                UInt64.fromUint(1000000), // 1 XEM fee
            )

            transferTxes.push(transferTx.toAggregate(publicAccount))
        })

        return transferTxes
    }
}
