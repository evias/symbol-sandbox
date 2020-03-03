
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
import {command, ExpectedError, metadata, option} from 'clime';
import { first } from 'rxjs/operators';
import {
    UInt64,
    Account,
    NetworkType,
    Address,
    Deadline,
    Mosaic,
    NamespaceId,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    PublicAccount,
    AggregateTransaction,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'u',
        description: 'Endpoint URL (Ex.: "http://localhost:3000")',
    })
    peerUrl: string;
}

/**
 * DEX Proposal Solution #1
 *
 * A business flow for this proposal solution is available at
 * following URL:
 *
 *     https://www.lucidchart.com/invitations/accept/b04e8050-bce6-44da-a097-acb5b3218855
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'DEX Proposal Solution #1: DEX Owned order book account',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) 
    {
        await this.setupConfig();
        let peerUrl = this.endpointUrl;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');
        } catch (err) {
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        // ----------------------------------------
        // Step 1: Setup Maker/Taker user accounts
        // ----------------------------------------
        const makerAccount = this.getAccount("tester1");
        const makerAddress = this.getAddress("tester1");
        const takerAccount = this.getAccount("harvester");
        const takerAddress = this.getAddress("harvester");

        // ----------------------------------------
        // Step 2: Generate ephemeral SDEXX account
        // ----------------------------------------
        const sdexxAccount = Account.generateNewAccount(this.networkType);
        const sdexxAddress = sdexxAccount.address;

        console.log('');
        console.log("SDEXX Private Key: ", sdexxAccount.privateKey.toString());
        console.log("SDEXX Public Key: ", sdexxAccount.publicKey.toString());
        console.log("SDEXX Address: ", sdexxAddress.plain());
        console.log("Maker Address: ", makerAddress.plain());
        console.log("Maker Public Key: ", makerAccount.publicKey.toString());
        console.log("Taker Address: ", takerAddress.plain());
        console.log("Taker Public Key: ", takerAccount.publicKey.toString());
        console.log('');

        // monitor blocks/addresses
        this.monitorBlocks();
        // this.monitorAddress(makerAddress.plain());
        // this.monitorAddress(takerAddress.plain());
        this.monitorAddress(sdexxAddress.plain());

        // ----------------------------------------
        // Step 3: Prepare Maker Order Book Fill
        // ----------------------------------------
        const makerFillTx = this.getMakerOrderBookFillTransaction(
            makerAccount.publicAccount,
            sdexxAddress
        );

        // ------------------------------------------------------
        // Step 4: Sign & Broadcast Maker Fill Transaction
        // ------------------------------------------------------
        const signedMakerTx = makerAccount.sign(makerFillTx, this.generationHash);

        // synchronous transaction broadcast
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return await transactionHttp.announce(signedMakerTx).subscribe(async () => {
            console.log('Announced Maker Fill Transaction');
            console.log('Hash:   ', signedMakerTx.hash);
            console.log('Signer: ', signedMakerTx.signerPublicKey);

            // ---------------------------------------------------
            // Step 5: Prepare Taker Order Book Fill
            // ---------------------------------------------------
            const takerFillTx = this.getTakerOrderBookFillTransaction(
                takerAccount.publicAccount,
                sdexxAddress
            );

            // ------------------------------------------------------
            // Step 6: Sign & Broadcast Taker Fill Transaction
            // ------------------------------------------------------
            const signedTakerTx = takerAccount.sign(takerFillTx, this.generationHash);
            return transactionHttp.announce(signedTakerTx).subscribe(async () => {
                console.log('Announced Taker Fill Transaction');
                console.log('Hash:   ', signedTakerTx.hash);
                console.log('Signer: ', signedTakerTx.signerPublicKey);

                // -----------------------------------------------
                // Step 7: Wait for Order Book Fill CONFIRMATION
                // -----------------------------------------------
                return await this.listenerBlocks.newBlock().pipe(first()).subscribe(async (block) => {
                    console.log("[SIGNER] New block created:" + block.height.compact());
                    console.log("[INFO] Now announcing SETTLEMENT");

                    // -----------------------------------------------
                    // Step 8: Aggregate settlement transactions
                    // -----------------------------------------------
                    const makerSettleTx = this.getMakerSettlementTransaction(makerAddress);
                    const takerSettleTx = this.getTakerSettlementTransaction(takerAddress);
                    const aggregateSettlementTx = AggregateTransaction.createComplete(
                        Deadline.create(),
                        [].concat(
                            [makerSettleTx.toAggregate(sdexxAccount.publicAccount)],
                            [takerSettleTx.toAggregate(sdexxAccount.publicAccount)],
                        ),
                        this.networkType,
                        []
                    );

                    // -----------------------------------------------
                    // Step 9: Broadcast transactionB
                    // -----------------------------------------------
                    return await this.broadcastTradeSettlement(
                        sdexxAccount,
                        aggregateSettlementTx,
                    );
                },
                error => {
                    console.error(error);
                    this.listenerBlocks.terminate();
                });
            }, (err) => {
                let text = '';
                text += 'takerFillTx - Error';
                console.log(text, err.response !== undefined ? err.response.text : err);
            });
        }, (err) => {
            let text = '';
            text += 'makerFillTx - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public async broadcastTradeSettlement(
        sdexxAccount: Account,
        settlementTx: AggregateTransaction,
    ): Promise<Object> 
    {
        const signedSettlementTx = sdexxAccount.sign(
            settlementTx, this.generationHash
        );

        // announce/broadcast transactionB
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedSettlementTx).subscribe(() => {
            console.log('Announced Settlement Aggregate Transaction');
            console.log('Hash:   ', signedSettlementTx.hash);
            console.log('Signer: ', signedSettlementTx.signerPublicKey);
        }, (err) => {
            let text = '';
            text += 'broadcastTradeSettlement() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public getMakerOrderBookFillTransaction(
        publicAccount: PublicAccount,
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId(this.networkConfig.currencyMosaic), UInt64.fromUint(10)));

        console.log('getMakerOrderBookFillTransaction: Creating TransferTransaction for cat.currency from Maker to SDEXX.');
        console.log('getMakerOrderBookFillTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const orderBookFillTx = TransferTransaction.create(
            Deadline.create(),
            orderBookAddress,
            mosaics,
            PlainMessage.create('Sell Order 10 cat.currency for 10 cat.harvest'),
            this.networkType
        );

        return orderBookFillTx;
    }

    public getMakerSettlementTransaction(
        makerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId(this.networkConfig.harvestMosaic), UInt64.fromUint(10)));

        console.log('getMakerSettlementTransaction: Creating TransferTransaction for cat.currency from SDEXX to Maker.');
        console.log('getMakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const makerSettleTx = TransferTransaction.create(
            Deadline.create(),
            makerAddress,
            mosaics,
            PlainMessage.create('Settle Trade with 10 cat.harvest for Maker'),
            this.networkType
        );

        return makerSettleTx;
    }

    public getTakerOrderBookFillTransaction(
        publicAccount: PublicAccount,
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId(this.networkConfig.harvestMosaic), UInt64.fromUint(10)));

        console.log('getTakerOrderBookFillTransaction: Creating TransferTransaction for cat.harvest from Taker to SDEXX.');
        console.log('getTakerOrderBookFillTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const orderBookFillTx = TransferTransaction.create(
            Deadline.create(),
            orderBookAddress,
            mosaics,
            PlainMessage.create('Buy Order 10 cat.currency for 10 cat.harvest'),
            this.networkType
        );

        return orderBookFillTx;
    }

    public getTakerSettlementTransaction(
        takerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId(this.networkConfig.currencyMosaic), UInt64.fromUint(10)));

        console.log('getTakerSettlementTransaction: Creating TransferTransaction for cat.currency from SDEXX to Taker.');
        console.log('getTakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const takerSettleTx = TransferTransaction.create(
            Deadline.create(),
            takerAddress,
            mosaics,
            PlainMessage.create('Settle Trade with 10 cat.currency for Taker'),
            this.networkType
        );

        return takerSettleTx;
    }
}
