
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
    mosaicId
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'f',
        description: 'Transaction type that needs to be tested',
    })
    feature: string;
}

@command({
    description: 'Check for cow compatibility of different transaction types',
})
export default class extends BaseCommand {

    public endpointUrl = "http://localhost:3000";
    private privateKey    = "";
    public accountAddress = "SACYZJLLP6OCY3KF3TTJRVE4W3MLNP5BQP75NKJC";
    public signedHash = null;

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        this.monitorAction();

        let feature;
        try {
            feature = OptionsResolver(options,
                'feature',
                () => { return ''; },
                'Enter a type of transaction that needs to be tested: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        switch (feature.toLowerCase()) {
            case 'transfer':
            case '0x4154':
                return await this.testTransferAction();

            case 'mosaicId':
                return await this.testMosaicIdAction();

            case 'hashlock':
            case 'lock':
            case 'lockfunds':
            case '0x4148':
                return await this.testLockFundsAction();

            case 'aggregate':
            case 'aggregate-complete':
            case '0x4141':
                return await this.testAggregateCompleteAction();

            case 'mosaic-definition':
            case 'mosaicdefinition':
            case 'mosaicdef':
            case 'mosaic-creation':
            case 'mosaiccreation':
            case '0x414d':
                return await this.testMosaicCreationAction();
        }

        throw new ExpectedError('Unrecognized feature');
    }

    private getAccount(): Account
    {
        return Account.createFromPrivateKey(this.privateKey, NetworkType.MIJIN_TEST);
    }

    private getAddress(): Address
    {
        return Address.createFromRawAddress(this.accountAddress);
    }

    public testMosaicIdAction(): any
    {
        // TEST 1: check XEM mosaic ID
        const sdkId = XEM.MOSAIC_ID;
        const xemId = new MosaicId([481110499, 231112638]); // XEM
        const xemLocalId = new MosaicId([3646934825, 3576016193]); // XEM

        console.log("SDK XEM.MOSAIC_ID", sdkId.id, null);
        console.log("0x0DC67FBE1CAD29E3", (UInt64.fromUint(0x0DC67FBE1CAD29E3)), 0x0DC67FBE1CAD29E3);
        console.log("0xD525AD41D95FCF29", (UInt64.fromUint(0xD525AD41D95FCF29)), 0xD525AD41D95FCF29);
        console.log("");
        console.log("SDK XEM: ", sdkId.toHex());
        console.log("Core Testnet XEM: ", xemId.toHex());
        console.log("Docker Local XEM: ", xemLocalId.toHex());
        console.log("");
        console.log("--");
        console.log("");
    }

    public testUint64Conversion(input: number[]): number
    {
        return (new UInt64(input)).compact();
    }

    public async testTransferAction(): Promise<Object>
    {
        // TEST 2: send transfer
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(XEM.MOSAIC_ID, UInt64.fromUint(10)));

        const recipient = this.getAddress();
        const account   = this.getAccount();
        const message   = PlainMessage.create("Testing simple transfer");

        // prepare SDK transaction and sign it
        const transferTransaction = TransferTransaction.create(
            Deadline.create(), 
            recipient, 
            mosaics, 
            message, 
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(transferTransaction);
        this.signedHash = signedTransaction.hash;

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer);
        }, (err) => {
            let text = '';
            text += 'testTransferAction() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public async testLockFundsAction(): Promise<Object>
    {
        const address = this.getAddress();
        const account = this.getAccount();

        // TEST 3: send hash lock transaction
        const fundsTx = TransferTransaction.create(
            Deadline.create(),
            address,
            [],
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        const accountHttp = new AccountHttp(this.endpointUrl);
        return accountHttp.getAccountInfo(address).subscribe((accountInfo) => {
            const aggregateTx = AggregateTransaction.createBonded(
                Deadline.create(),
                [fundsTx.toAggregate(accountInfo.publicAccount)],
                NetworkType.MIJIN_TEST, []);

            const signedTransaction = account.sign(aggregateTx);

            // create lock funds of 10 XEM for the aggregate transaction
            const lockFundsTransaction = LockFundsTransaction.create(
                Deadline.create(),
                XEM.createRelative(10),
                UInt64.fromUint(1000),
                signedTransaction,
                NetworkType.MIJIN_TEST,
            );

            const signedLockFundsTransaction = account.sign(lockFundsTransaction);

            const transactionHttp = new TransactionHttp(this.endpointUrl);
            const listener = new Listener(this.endpointUrl);

            listener.open().then(() => {
                transactionHttp.announce(signedLockFundsTransaction).subscribe(() => {
                    console.log('Announced lock funds transaction');
                    console.log('Hash:   ', signedLockFundsTransaction.hash);
                    console.log('Signer: ', signedLockFundsTransaction.signer, '\n');
                }, (err) => {
                    let text = '';
                    text += 'testLockFundsAction() - Error';
                    console.log(text, err.response !== undefined ? err.response.text : err);
                });
            });
        }, (err) => {
            console.log("getAccountInfo error: ", err);
        });
    }

    public async testAggregateCompleteAction(): Promise<Object>
    {
        const address = this.getAddress();
        const account = this.getAccount();

        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(XEM.MOSAIC_ID, UInt64.fromUint(10)));

        // TEST 3: send mosaic creation transaction
        const fundsTx1 = TransferTransaction.create(
            Deadline.create(),
            address,
            mosaics,
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        const fundsTx2 = TransferTransaction.create(
            Deadline.create(),
            address,
            mosaics,
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        const accountHttp = new AccountHttp(this.endpointUrl);
        return accountHttp.getAccountInfo(address).subscribe((accountInfo) => {
            const aggregateTx = AggregateTransaction.createComplete(
                Deadline.create(),
                [fundsTx1.toAggregate(accountInfo.publicAccount),
                 fundsTx2.toAggregate(accountInfo.publicAccount)],
                NetworkType.MIJIN_TEST, []);

            const signedTransaction = account.sign(aggregateTx);

            const transactionHttp = new TransactionHttp(this.endpointUrl);
            const listener = new Listener(this.endpointUrl);

            listener.open().then(() => {
                transactionHttp.announce(signedTransaction).subscribe(() => {
                    console.log('Announced aggregate complete transaction');
                    console.log('Hash:   ', signedTransaction.hash);
                    console.log('Signer: ', signedTransaction.signer, '\n');
                }, (err) => {
                    let text = '';
                    text += 'testAggregateCompleteAction() - Error';
                    console.log(text, err.response !== undefined ? err.response.text : err);
                });
            });
        }, (err) => {
            console.log("getAccountInfo error: ", err);
        });
    }

    public async testMosaicCreationAction(): Promise<Object>
    {
        const address = this.getAddress();
        const account = this.getAccount();

        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(XEM.MOSAIC_ID, UInt64.fromUint(10)));

        // TEST 3: send mosaic creation transaction

        // STEP 1: MosaicDefinition
        const nonce = [0xE7, 0xDE, 0x84, 0xB9];

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            UInt64.fromUint(0xE7DE84B9),
            UInt64.fromUint(mosaicId(nonce, convert.hexToUint8(account.publicKey))),
            MosaicProperties.create({
                supplyMutable: false,
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
            this.signedHash = signedTransaction.hash;

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

    public monitorAction(): any
    {
        const listener = new Listener(this.endpointUrl);
        listener.open().then(() => {

            // Monitor new blocks
            const newBlockSubscription = listener.newBlock()
                .subscribe(block => {
                    console.log("New block created:" + block.height.compact());
                },
                error => {
                    console.error(error);
                    listener.terminate();
                });

            // Monitor transaction errors
            listener.status(Address.createFromRawAddress(this.accountAddress))
                .subscribe(error => {
                    console.log("Error:", error);
                    newBlockSubscription.unsubscribe();
                    listener.close();
                },
                error => console.error(error));
        });
    }
}
