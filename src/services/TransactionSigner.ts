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
import { 
    Account,
    AggregateTransaction,
    Deadline,
    NetworkType,
    Transaction,
} from 'symbol-sdk';
import { TransactionURI } from 'nem2-uri-scheme';

// internal dependencies
import { Service } from './Service';
import { CATDataReader } from './CATDataReader';

export const DEFAULT_CAT_URL = 'http://localhost:3000';
export const DEFAULT_CAT_NETWORK_ID = NetworkType.MIJIN_TEST;
export const DEFAULT_GENERATION_HASH = '167FF7C1CC4C2D536EDB7497608001C3A7E9B91D90FAB2A4ECFE6424A489D58E';

export class TransactionSigner extends Service {

    constructor(
        public readonly catapultReader: CATDataReader,
        public readonly signerAccount: Account,
        public readonly transactions: Transaction[],
    ) {
        super();
    }

    public getAggregateTransaction(): AggregateTransaction {
        return AggregateTransaction.createComplete(
            Deadline.create(),
            this.transactions.map((transaction) => {
                return transaction.toAggregate(this.signerAccount.publicAccount)
            }),
            this.catapultReader.NETWORK_ID,
            []
        );
    }

    public getSignedTransactions(
        asAggregate: boolean = false
    ): string[] {

        let uris: string[] = [];

        // aggregate transactions if necessary
        let transactions = this.transactions;
        if (asAggregate === true) {
            transactions = [this.getAggregateTransaction()];
        }

        // for each transaction create a signed payload and URI
        transactions.map((transaction) => {

            // sign transaction
            const payload = this.signerAccount.sign(
                transaction,
                this.catapultReader.GENERATION_HASH
            );

            // create URI
            const uri = new TransactionURI(
                payload.payload,
                this.catapultReader.GENERATION_HASH,
                this.catapultReader.URL
            );
            uris.push(uri.build());
        });

        // return the signed transaction payloads (as URIs)
        return uris;
    }
}
