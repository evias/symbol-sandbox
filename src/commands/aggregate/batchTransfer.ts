
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
    MosaicId,
    AccountHttp,
    NamespaceHttp,
    Address,
    Deadline,
    Mosaic,
    NamespaceId,
    TransactionHttp,
    TransferTransaction,
    PublicAccount,
    Transaction,
    EmptyMessage,
    AggregateTransaction,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';
import fs = require('fs');

interface DistributionRow {
    address: Address,
    amount: UInt64,
    mosaicId: MosaicId | NamespaceId
}

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'f',
        description: 'File containing list of addresses for the transfer (CSV)',
    })
    file: string;

    @option({
        flag: 'a',
        description: 'Comma-separated list of addresses',
    })
    addresses: string;

    @option({
        flag: 'm',
        description: 'Amount to send',
    })
    amount: string;

    @option({
        flag: 'i',
        description: 'Mosaic Name or Mosaic Id',
    })
    mosaicId: string;
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
        await this.setupConfig();
        let file;
        let amount;
        let mosaic;

        const accountHttp = new AccountHttp(this.endpointUrl);
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        // read parameters

        console.log('');
        const doImportFile = readlineSync.keyInYN(
            'Would you like to import a CSV file? ');
        console.log('');

        let distributionRows: DistributionRow[] = []

        if (doImportFile === true) {
            file = OptionsResolver(options, 'file', () => { return ''; }, 'Enter the absolute path to a CSV file with addresses: ');

            if (! fs.existsSync(file)) {
                console.error('Invalid file path');
                return;
            }

            distributionRows = this.extractDistributionConfig(file)
        }
        else {
            // no CSV file, get data from terminal
            let amountToSend = OptionsResolver(options, 'amount', () => { return ''; }, 'Enter the absolute amount to send: ');
            if (!amountToSend || isNaN(amountToSend)) {
                console.error('Invalid amount')
                return ;
            }

            let mosaicIdentifier: string = OptionsResolver(options, 'mosaicId', () => { return ''; }, 'Enter a mosaic id or a mosaic name: ');
            let mosaicId: MosaicId|NamespaceId = mosaicIdentifier.indexOf('[') === 0 ? 
                                                 new MosaicId(JSON.parse(mosaicIdentifier)) 
                                               : new NamespaceId(mosaicIdentifier);

            let distributeTo = OptionsResolver(options, 'addresses', () => { return ''; }, 'Enter a comma-separated list of addresses or public keys: ');
            distributeTo.split(',').map((stakeholder: string) => {
                const clean = stakeholder.replace(/^\s*/, '').replace(/\s$/, '').toUpperCase()
                let address: Address

                if (clean.length === 40) {
                    address = Address.createFromRawAddress(clean)
                }
                else {
                    address = Address.createFromPublicKey(clean, this.networkType)
                }

                distributionRows.push({
                    address: address,
                    amount: UInt64.fromUint(amountToSend),
                    mosaicId: mosaicId
                })
            })
        }

        // read sender account information
        const account = this.getAccount("nemesis1");
        const accountInfo = await accountHttp.getAccountInfo(this.getAddress("nemesis1")).toPromise();
        
        // create transactions
        let transferTxes = [];
        distributionRows.forEach((row) => {
            transferTxes.push(this.getTransferTransaction(
                accountInfo.publicAccount,
                row.address,
                row.amount,
                row.mosaicId
            ));
        });

        // start monitoring network
        this.monitorBlocks();
        this.monitorAddress(this.getAddress("nemesis1").plain());

        console.log("Sending " + transferTxes.length + " transfer(s) as one aggregate transaction.");
        return await this.broadcastBatchTransfers(account, transferTxes);
    }

    public extractDistributionConfig(
        file: string
    ): DistributionRow[] {

        // read file content, should contain following columns:
        // - Address
        // - Amount
        // - Mosaic Name / Mosaic Id
        const data = this.readCSV(file);
        let distributionRows: DistributionRow[] = []

        // iterate rows and create distribution rows
        data.forEach((row) => {

            let mosaicId: MosaicId|NamespaceId = row.mosaic.indexOf('[') === 0 ? 
                                                 new MosaicId(JSON.parse(row.mosaic)) 
                                               : new NamespaceId(row.mosaic);

            let address: Address
            if (row.address.length === 40) {
                address = Address.createFromRawAddress(row.address)
            }
            else {
                address = Address.createFromPublicKey(row.address, this.networkType)
            }

            distributionRows.push({
                address: Address.createFromRawAddress(row.address),
                amount: UInt64.fromUint(parseInt(row.amount)),
                mosaicId: mosaicId
            })
        });

        return distributionRows
    }

    public async broadcastBatchTransfers(
        account: Account,
        transferTransactions: Transaction[]
    ): Promise<Object> 
    {
        const aggregateTx = AggregateTransaction.createComplete(
            Deadline.create(),
            transferTransactions,
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
            text += 'broadcastBatchTransfers() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public getTransferTransaction(
        publicAccount: PublicAccount,
        recipientAddress: Address,
        mosaicAmount: UInt64,
        mosaicIdentifier: MosaicId|NamespaceId
    ): Transaction
    {
        const transferTx = TransferTransaction.create(
            Deadline.create(),
            recipientAddress,
            [new Mosaic(mosaicIdentifier, mosaicAmount)],
            EmptyMessage,
            this.networkType,
            UInt64.fromUint(1000000)
        );

        return transferTx.toAggregate(publicAccount);
    }

    protected readCSV(
        filePath: string
    ): Array<{address: string, amount: string, mosaic: string}>
    {
        let data: Array<{address: string, amount: string, mosaic: string}> = [];

        // read file content and process rows
        const fileCSV = fs.readFileSync(filePath, 'utf8');
        const rowsCSV = fileCSV.split('\n');

        if (rowsCSV.length > 1000) {
            throw new Error("File contains more than 1000 rows.");
        }

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
