
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
    ModifyMultisigAccountTransaction,
    MultisigCosignatoryModification,
    MultisigCosignatoryModificationType,
    SignedTransaction,
    TransactionMapping,
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
 * DEX Proposal Solution #6
 *
 * A business flow for this proposal solution is available at
 * following URL:
 *
 *     https://www.lucidchart.com/invitations/accept/615cf759-e642-4a6e-baed-12582b764a9b
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'DEX Proposal Solution #6: Maker prepares Settlement Offline for 1of1 Multisig owned by Taker',
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
        const sdexxAccount = Account.generateNewAccount(NetworkType.MIJIN_TEST);
        const sdexxAddress = Address.createFromPublicKey(sdexxAccount.publicAccount.publicKey, NetworkType.MIJIN_TEST);

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
        this.monitorAddress(makerAddress.plain());
        this.monitorAddress(takerAddress.plain());
        this.monitorAddress(sdexxAddress.plain());

        // read account information
        // const accountHttp = new AccountHttp(this.endpointUrl);
        // const accountInfo = await accountHttp.getAccountInfo(this.getAddress("tester1")).toPromise();

        // build transactions

        // ----------------------------------------
        // Step 3: Prepare Maker Order Book Fill
        // ----------------------------------------
        const makerFillTx = this.getMakerOrderBookFillTransaction(
            makerAccount.publicAccount,
            sdexxAddress
        );

        // ----------------------------------------
        // Step 4: Prepare Maker Settlement
        // ----------------------------------------
        const makerSettlementTx = this.getMakerSettlementTransaction(
            makerAccount.publicAccount,
            makerAddress
        );

        // // -----------------------------------------------
        // // Step 5: Aggregate prepared txes to transactionA
        // // -----------------------------------------------
        // const aggregateTxA = AggregateTransaction.createComplete(
        //     Deadline.create(),
        //     [].concat(
        //         [makerFillTx.toAggregate(makerAccount.publicAccount)], // ETx1 signed by Maker
        //         [makerSettlementTx.toAggregate(sdexxAccount.publicAccount)] // ETx2 signed by SDEXX
        //     ),
        //     NetworkType.MIJIN_TEST,
        //     []
        // );

        // -------------------------------------------------
        // Step 5: Sign transactionA embedded transactions
        // -------------------------------------------------
        const signedMakerFillTx = makerAccount.sign(makerFillTx, this.generationHash);
        const signedMakerSettleTx = sdexxAccount.sign(makerSettlementTx, this.generationHash);

        // /!\
        // /!\ DO NOT BROADCAST aggregateTxA before aggregateTxB (invalid!)
        // /!\ instead of broadcast, above payloads must be communicated to Taker.
        // /!\

        // ---------------------------------------------------
        // Step 6: Prepare Taker Order Book Fill
        // ---------------------------------------------------
        const takerFillTx = this.getTakerOrderBookFillTransaction(
            takerAccount.publicAccount,
            sdexxAddress
        );

        // -----------------------------------------------
        // Step 7: Aggregate prepared txes to transactionB
        // -----------------------------------------------
        const aggregateTxB = AggregateTransaction.createComplete(
            Deadline.create(),
            [].concat(
                [takerFillTx.toAggregate(takerAccount.publicAccount)], // ETx3 signed by Taker
            ),
            NetworkType.MIJIN_TEST,
            []
        );

        //??? co-sign txB (optin multisig) ???
        //??? (Optional) remove from multisig

        // -----------------------------------------------
        // Step 8: Broadcast transactionB (settle trade)
        // -----------------------------------------------
        return await this.broadcastTradeSettlement(
            takerAccount,
            sdexxAccount,
            makerAccount.publicAccount,
            aggregateTxB,
            signedMakerFillTx,
            signedMakerSettleTx
        );
    }

    public async broadcastTradeSettlement(
        takerAccount: Account,
        sdexxAccount: Account,
        makerPublicAccount: PublicAccount,
        aggregateTxB: AggregateTransaction,
        signedMakerFillTx: SignedTransaction,
        signedMakerSettleTx: SignedTransaction,
    ): Promise<Object> 
    {
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        // -----------------------------------------------
        // Step 8: Broadcast transactionB (Taker fills)
        // -----------------------------------------------
        const signedTransactionB = takerAccount.sign(aggregateTxB, this.generationHash);
        return transactionHttp.announce(signedTransactionB).subscribe(() => {

            // re-build signed transactions
            const makerFillTx = TransactionMapping.createFromPayload(signedMakerFillTx.payload);
            const makerSettlementTx = TransactionMapping.createFromPayload(signedMakerSettleTx.payload);

            // -----------------------------------------------
            // Step 9: Prepare Taker Settlement
            // -----------------------------------------------
            const takerSettlementTx = this.getTakerSettlementTransaction(
                takerAccount.publicAccount,
                takerAccount.publicAccount.address
            );

            const aggregateTxA = AggregateTransaction.createComplete(
                Deadline.create(),
                [].concat(
                    [makerFillTx.toAggregate(makerPublicAccount)], // ETx1 signed by Maker
                    [makerSettlementTx.toAggregate(sdexxAccount.publicAccount)], // ETx2 signed by SDEXX
                    [takerSettlementTx.toAggregate(sdexxAccount.publicAccount)], // ETx3 signed by SDEXX
                ),
                NetworkType.MIJIN_TEST,
                []
            );

            const signedParent = sdexxAccount.sign(aggregateTxA, this.generationHash);
            const signedTransactionA = sdexxAccount.sign(aggregateTxA, this.generationHash)
            // const signedTransactionA = sdexxAccount.signTransactionGivenSignatures(
            //     aggregateTxA, [
            //         new CosignatureSignedTransaction(
            //             signedParent.hash,
            //             signedMakerFillTx.payload.slice(8, 128 + 8),
            //             makerPublicAccount.publicKey
            //         ),
            //         new CosignatureSignedTransaction(
            //             signedParent.hash,
            //             signedMakerSettleTx.payload.slice(8, 128 + 8),
            //             sdexxAccount.publicAccount.publicKey
            //         ),
            //     ],
            //     this.generationHash
            // );

            // announce/broadcast signedTransactionA
            return transactionHttp.announce(signedTransactionA).subscribe(() => {
                console.log('broadcastTradeSettlement: transactionA announced correctly');
                console.log('Hash:   ', signedTransactionA.hash);
                console.log('Signer: ', signedTransactionA.signer);
            }, (err) => {
                let text = '';
                text += 'broadcastTradeSettlement() - Error with transactionA (Maker Fill)';
                console.log(text, err.response !== undefined ? err.response.text : err);
            });
        });
    }

    public getMakerOrderBookFillTransaction(
        publicAccount: PublicAccount,
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.currency'), UInt64.fromUint(10)));

        console.log('getMakerOrderBookFillTransaction: Creating TransferTransaction for cat.currency from Maker to SDEXX.');
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
        publicAccount: PublicAccount,
        makerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.harvest'), UInt64.fromUint(10)));

        console.log('getMakerSettlementTransaction: Creating TransferTransaction for cat.harvest (Maker)');
        console.log('getMakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const makerSettlementTx = TransferTransaction.create(
            Deadline.create(),
            makerAddress,
            mosaics,
            PlainMessage.create('Settlement of 10 cat.harvest for Maker'),
            NetworkType.MIJIN_TEST
        );

        return makerSettlementTx;
    }

    public getTakerOwnershipTransfer(
        takerAccount: PublicAccount,
        orderBookAddress: Address,
    ): ModifyMultisigAccountTransaction
    {
        const modifications = [
            new MultisigCosignatoryModification(
                MultisigCosignatoryModificationType.Add,
                takerAccount,
            ),
        ];

        console.log('getTakerOwnershipTransfer: Creating ModifyMultisigAccountTransaction for SDEXX ownership transfer to Taker.');
        console.log('getTakerOwnershipTransfer: Modifications: ' + JSON.stringify(modifications));

        const takerOwnershipTx = ModifyMultisigAccountTransaction.create(
            Deadline.create(),
            1, // 1of1
            1, // 1of1
            modifications,
            NetworkType.MIJIN_TEST
        );

        return takerOwnershipTx;
    }

    public getTakerOrderBookFillTransaction(
        publicAccount: PublicAccount,
        orderBookAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.harvest'), UInt64.fromUint(10)));

        console.log('getMakerOrderBookFillTransaction: Creating TransferTransaction for cat.harvest from Taker to SDEXX.');
        console.log('getMakerOrderBookFillTransaction: Mosaics: ' + JSON.stringify(mosaics));

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
        publicAccount: PublicAccount,
        takerAddress: Address,
    ): TransferTransaction
    {
        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(new NamespaceId('cat.currency'), UInt64.fromUint(10)));

        console.log('getTakerSettlementTransaction: Creating TransferTransaction for cat.currency (Taker)');
        console.log('getTakerSettlementTransaction: Mosaics: ' + JSON.stringify(mosaics));

        const takerSettlementTx = TransferTransaction.create(
            Deadline.create(),
            takerAddress,
            mosaics,
            PlainMessage.create('Settlement of 10 cat.currency for Taker'),
            NetworkType.MIJIN_TEST
        );

        return takerSettlementTx;
    }
}
