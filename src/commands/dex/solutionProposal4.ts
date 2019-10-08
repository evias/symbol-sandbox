
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
    PublicAccount,
    AggregateTransaction,
    TransferTransaction,
} from 'nem2-sdk';

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
 * DEX Proposal Solution #4
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
    description: 'DEX Proposal Solution #4: DEX Owned order entries account',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions)
    {
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
        const sdexCurrencyAccount = Account.generateNewAccount(NetworkType.MIJIN_TEST);
        const sdexHarvestAccount = Account.generateNewAccount(NetworkType.MIJIN_TEST);

        console.log('');
        console.log("SDEXX_XEM Private Key: ", sdexCurrencyAccount.privateKey.toString());
        console.log("SDEXX_XEM Public Key: ", sdexCurrencyAccount.publicKey.toString());
        console.log("SDEXX_XEM Address: ", sdexCurrencyAccount.address.plain());
        console.log("SDEXX_CAT Private Key: ", sdexHarvestAccount.privateKey.toString());
        console.log("SDEXX_CAT Public Key: ", sdexHarvestAccount.publicKey.toString());
        console.log("SDEXX_CAT Address: ", sdexHarvestAccount.address.plain());
        console.log("Maker Address: ", makerAddress.plain());
        console.log("Maker Public Key: ", makerAccount.publicKey.toString());
        console.log("Taker Address: ", takerAddress.plain());
        console.log("Taker Public Key: ", takerAccount.publicKey.toString());
        console.log('');

        // monitor blocks/addresses
        this.monitorBlocks();
        // this.monitorAddress(makerAddress.plain());
        // this.monitorAddress(takerAddress.plain());
        this.monitorAddress(sdexCurrencyAccount.address.plain());
        this.monitorAddress(sdexHarvestAccount.address.plain());

        // ----------------------------------------
        // Step 3: Prepare Maker Order Book Fill
        // ----------------------------------------
        const makerFillTx = this.getMakerOrderBookFillTransaction(
            sdexCurrencyAccount.address
        );

        // ------------------------------------------------------
        // Step 4: Sign & Broadcast Maker Fill Transaction
        // ------------------------------------------------------
        const signedMakerTx = makerAccount.sign(makerFillTx, this.generationHash);

        // synchronous transaction broadcast
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return await transactionHttp.announce(signedMakerTx).subscribe(async () => {
            console.log('STEP 1: Announced Maker Fill Transaction');
            console.log('Hash:   ', signedMakerTx.hash);
            console.log('Signer: ', signedMakerTx.signerPublicKey);

            // ---------------------------------------------------
            // Step 5: Prepare Taker Order Book Fill
            // ---------------------------------------------------
            const takerFillTx = this.getTakerOrderBookFillTransaction(
                sdexHarvestAccount.address
            );

            // ------------------------------------------------------
            // Step 6: Sign & Broadcast Taker Fill Transaction
            // ------------------------------------------------------
            const signedTakerTx = takerAccount.sign(takerFillTx, this.generationHash);
            return transactionHttp.announce(signedTakerTx).subscribe(async () => {
                console.log('STEP 2: Announced Taker Fill Transaction');
                console.log('Hash:   ', signedTakerTx.hash);
                console.log('Signer: ', signedTakerTx.signerPublicKey);

                // -----------------------------------------------
                // Step 7: Wait for Order Book Fill CONFIRMATION
                // -----------------------------------------------
                return await this.listenerBlocks.newBlock().pipe(first()).subscribe(async (block) => {
                    console.log("[INFO] Now announcing SETTLEMENT");

                    // -----------------------------------------------
                    // Step 8: Aggregate settlement transactions
                    // -----------------------------------------------
                    const makerSettleTx = this.getMakerSettlementTransaction(makerAddress);
                    const takerSettleTx = this.getTakerSettlementTransaction(takerAddress);
                    const aggregateSettlementTx = AggregateTransaction.createComplete(
                        Deadline.create(),
                        [].concat(
                            [makerSettleTx.toAggregate(sdexHarvestAccount.publicAccount)],
                            [takerSettleTx.toAggregate(sdexCurrencyAccount.publicAccount)],
                        ),
                        NetworkType.MIJIN_TEST,
                        []
                    );

                    // -----------------------------------------------
                    // Step 9: Broadcast settlement
                    // -----------------------------------------------
                    return await this.broadcastTradeSettlement(
                        sdexCurrencyAccount,
                        sdexHarvestAccount,
                        aggregateSettlementTx,
                    );
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
        sdexxSellAccount: Account,
        sdexxBuyAccount: Account,
        settlementTx: AggregateTransaction,
    ): Promise<Object> 
    {
        const signedSettlementTx = sdexxSellAccount.signTransactionWithCosignatories(
            settlementTx, [sdexxBuyAccount], this.generationHash
        );

        // announce/broadcast transactionB
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedSettlementTx).subscribe(() => {
            console.log('STEP 3: Announced Settlement Aggregate Transaction');
            console.log('Hash:   ', signedSettlementTx.hash);
            console.log('Signer: ', signedSettlementTx.signerPublicKey);
        }, (err) => {
            let text = '';
            text += 'broadcastTradeSettlement() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    public getMakerOrderBookFillTransaction(
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.currency'), UInt64.fromUint(10)));

        console.log('getMakerOrderBookFillTransaction: Creating TransferTransaction for cat.currency from Maker to SDEXX_XEM.');
        console.log('getMakerOrderBookFillTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const orderBookFillTx = TransferTransaction.create(
            Deadline.create(),
            orderBookAddress,
            mosaics,
            PlainMessage.create('Sell Order 10 cat.currency for 10 cat.harvest'),
            NetworkType.MIJIN_TEST
        );

        return orderBookFillTx;
    }

    public getMakerSettlementTransaction(
        makerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.harvest'), UInt64.fromUint(10)));

        console.log('getMakerSettlementTransaction: Creating TransferTransaction for cat.harvest from SDEXX_CAT to Maker.');
        console.log('getMakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const makerSettleTx = TransferTransaction.create(
            Deadline.create(),
            makerAddress,
            mosaics,
            PlainMessage.create('Settle Trade with 10 cat.harvest for Maker'),
            NetworkType.MIJIN_TEST
        );

        return makerSettleTx;
    }

    public getTakerOrderBookFillTransaction(
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.harvest'), UInt64.fromUint(10)));

        console.log('getTakerOrderBookFillTransaction: Creating TransferTransaction for cat.harvest from Taker to SDEXX_CAT.');
        console.log('getTakerOrderBookFillTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const orderBookFillTx = TransferTransaction.create(
            Deadline.create(),
            orderBookAddress,
            mosaics,
            PlainMessage.create('Buy Order 10 cat.currency for 10 cat.harvest'),
            NetworkType.MIJIN_TEST
        );

        return orderBookFillTx;
    }

    public getTakerSettlementTransaction(
        takerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.currency'), UInt64.fromUint(10)));

        console.log('getTakerSettlementTransaction: Creating TransferTransaction for cat.currency from SDEXX_XEM to Taker.');
        console.log('getTakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const takerSettleTx = TransferTransaction.create(
            Deadline.create(),
            takerAddress,
            mosaics,
            PlainMessage.create('Settle Trade with 10 cat.currency for Taker'),
            NetworkType.MIJIN_TEST
        );

        return takerSettleTx;
    }
}
