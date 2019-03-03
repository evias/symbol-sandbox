
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
    InnerTransaction,
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    nacl_catapult,
    uint64 as uint64_t
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';
import fs = require('fs');

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'f',
        description: 'File containing list of addresses for the transfer (CSV)',
    })

    @option({
        flag: 'a',
        description: 'Amount to send',
    })

    @option({
        flag: 'm',
        description: 'Mosaic Name or Mosaic Id',
    })
    file: string;
    amount: string;
    mosaic: string;
}

@command({
    description: 'Send a batch of transfers as one aggregate transaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) 
    {
        let file;
        let amount;
        let mosaic;

        const accountHttp = new AccountHttp(this.endpointUrl);
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        // read parameters

        try {
            file = OptionsResolver(options, 'file', () => { return ''; }, 'Enter the absolute path to a CSV file with addresses: ');

            if (! fs.existsSync(file)) {
                throw new Error('Invalid file path');
            }
        } catch (err) { throw new ExpectedError('Please enter a valid file path'); }

        // read sender account information
        const account = this.getAccount("tester1");
        const accountInfo = await accountHttp.getAccountInfo(this.getAddress("tester1")).toPromise();

        // read file content, should contain following columns:
        // - Address
        // - Amount
        // - Mosaic Name / Mosaic Id
        const data = this.readCSV(file);
        
        // create transactions
        let transferTxes = [];
        data.forEach((row) => {
            transferTxes.push(this.getTransferTransaction(
                accountInfo.publicAccount,
                row.address,
                row.amount,
                row.mosaic
            ));
        });

        // start monitoring network
        this.monitorBlocks();
        this.monitorAddress(this.getAddress("tester1").plain());

        console.log("Sending " + transferTxes.length + " transfer(s) as one aggregate transaction.");
        return await this.broadcastBatchTransfers(account, transferTxes);
    }

    public async broadcastBatchTransfers(
        account: Account,
        transferTransactions: Transaction[]
    ): Promise<Object> 
    {
        const aggregateTx = AggregateTransaction.createComplete(
            Deadline.create(),
            transferTransactions,
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
            text += 'broadcastBatchTransfers() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public getTransferTransaction(
        publicAccount: PublicAccount,
        recipientAddress: string,
        mosaicAmount: string,
        mosaicIdentifier: string
    ): InnerTransaction
    {
        // amount can be passed as uint array or number
        const amountFormat = mosaicAmount.indexOf('[') === 0 ? 
            new UInt64(JSON.parse(mosaicAmount)) 
            : UInt64.fromUint(parseInt(mosaicAmount));

        // mosaic can be passed as mosaicId or namespace name
        const mosaicId = mosaicIdentifier.indexOf('[') === 0 ?
            new MosaicId(JSON.parse(mosaicAmount))
            : new NamespaceId(mosaicIdentifier);

        const transferTx = TransferTransaction.create(
            Deadline.create(),
            Address.createFromRawAddress(recipientAddress),
            [new Mosaic(mosaicId, amountFormat)],
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        return transferTx.toAggregate(publicAccount);
    }

    private readCSV(
        filePath: string
    ): Array<{address: string, amount: string, mosaic: string}>
    {
        let data: Array<{address: string, amount: string, mosaic: string}> = [];

        // read file content and process rows
        const fileCSV = fs.readFileSync(filePath, 'utf8');
        const rowsCSV = fileCSV.split('\n');
        while (rowsCSV.length) {
            const row = rowsCSV.shift();

            if (! row.length || ! /[^,]+,[^,]+,[^,]+/.test(row)) {
                // invalid row
                continue;
            }

            let [address, amount, mosaic] = row.split(',');
            address = address.replace(/[ \"\-]/g, '');
            amount = amount.replace(/[ \"]/g, '');
            mosaic = mosaic.replace(/[ \"]/g, '');
            data.push({address, amount, mosaic});
        }

        return data;
    }
}
