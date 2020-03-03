
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
import axios from 'axios';
import {
    SignedTransaction,
    PublicAccount,
    AggregateTransaction,
    TransactionMapping,
    AggregateTransactionCosignature,
    TransactionType,
    Convert,
    Transaction,
} from 'symbol-sdk'

// internal dependencies
import { Service } from './Service';
import { TransactionSigner } from './TransactionSigner';
import { CATDataReader } from './CATDataReader';

export const NIS_SDK = require('nem-sdk').default;
export const DEFAULT_NIS_URL = 'http://hugetestalice.nem.ninja:7890';
export const DEFAULT_NIS_NETWORK_ID = NIS_SDK.model.network.data.testnet.id;

/**
 * Optin Datasets
 */
export enum OptinDTOType {
    SIMPLE_OPTIN_DTO     = 1,
    MS_SIGNAL_OPTIN_DTO  = 2,
    MS_CONVERT_OPTIN_DTO = 3,
    MS_COSIG_OPTIN_DTO   = 4,
    NAMESPACE_OPTIN_DTO  = 5
}

export interface SimpleOptinDTO {
    type: number,
    destination: string, // destination account public key
}

export interface SignalOptinDTO {
    type: number,
    destination: string, // destination account public key
    multisig: string,    // origin multisig account public key
}

export interface ConvertOptinDTO {
    type: number,
    d: string,           // destination account public key
    p: string,           // signed transaction payload (AggregateComplete with MultisigModifyAccountTransaction)
    h: string,           // aggregate transaction hash
}

export interface CosigOptinDTO {
    type: number,
    multisig: string,    // origin multisig account public key
    signature: string,   // Co-signature for ConvertOptinDTO.payload
}

export interface NamespaceOptinDTO {
    type: number,
    destination: string, // destination account public key
    payload: string,     // signed transaction payload (NamespaceRegistrationTransaction)
}

export interface OptinRequest {
    origin: string, // origin NIS account public key
    data: SimpleOptinDTO |
          SignalOptinDTO |
          ConvertOptinDTO |
          CosigOptinDTO |
          NamespaceOptinDTO
}
/**
 * End of Optin Datasets
 */

/**
 * NIS Datasets
 */
export interface NISTransactionMetaData {
    height: number,
    id: number,
    hash: any
}

export interface NISTransactionMetaDataPair {
    meta: NISTransactionMetaData,
    transaction: any
}

export interface NISAccountWithSnapshotBalance {
    address: string,
    destination: string,
    balance: number
}
/**
 * End of NIS Datasets
 */

/**
 * Catapult Opt-In Migration Reader
 *
 * @description This migration service serves the collection of NIS1 opt-in
 *              requests. Collected data includes signed transaction payloads
 *              with multi-signature account modification transactions and
 *              namespace registration transactions.
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
export class OptinDataReader extends Service {

    protected endpoint: any;

    constructor(
        public readonly catapultReader: CATDataReader,
        public readonly URL: string = DEFAULT_NIS_URL,
        public readonly PORT: number = 7890,
        public readonly NETWORK_ID: number = DEFAULT_NIS_NETWORK_ID
    ) {
        super();

        this.endpoint = NIS_SDK.model.objects.create('endpoint')(
            this.URL.replace(/:[0-9]+/, ''), 
            this.PORT
        );
    }

    public static async getNetworkId(url: string) {
        const response: any = await axios.get(url.replace(/\/$/, '') + '/node/info');
        if (!response || !response.data || !response.data.metaData) {
            return DEFAULT_NIS_NETWORK_ID;
        }

        // parse network id from endpoint
        return parseInt(response.data.metaData.networkId);
    }

    public async getOptinRequests(
        optinAccount: string
    ): Promise<OptinRequest[]> {

        let lastTxRead: number = null
        let requests: OptinRequest[] = []
        let transactionsPage: NISTransactionMetaDataPair[] = []
        let transactionsRead: any = {}
        let pageCount: number = 1

        while (lastTxRead === null || 25 === transactionsPage.length) {
            // read batch of transactions (25)
            const response = await NIS_SDK.com.requests.account.transactions.incoming(
                this.endpoint,
                optinAccount,
                null,
                lastTxRead
            )

            transactionsPage = response.data
            if (! transactionsPage.length) {
                // no more transactions returned
                return requests
            }

            // 1) check whether the list of transactions was read before
            // 2) register read transactions
            let hasKnownTransaction: boolean
            for (let i = 0, m = transactionsPage.length; i < m; i++) {
                const txHash = transactionsPage[i].meta.hash.data

                if (transactionsRead.hasOwnProperty(txHash)) {
                    hasKnownTransaction = true
                    break;
                }

                transactionsRead[txHash] = true 
            }

            if (hasKnownTransaction === true) {
                // transactions in page were read before
                break;
            }

            // 3) interpret transaction page opt-in requests
            const cntItems = transactionsPage.length
            lastTxRead = transactionsPage[cntItems-1].meta.id
            requests = [].concat(requests, this.interpretTransactionAsOptinRequest(transactionsPage))
            pageCount++
        }

        return requests
    }

    public interpretTransactionAsOptinRequest(
        transactionsPage: NISTransactionMetaDataPair[]
    ): OptinRequest[] {

        let requests: OptinRequest[] = []
        transactionsPage.map((transaction: NISTransactionMetaDataPair) => {
            let meta = transaction.meta
            let content = transaction.transaction
            let txData  = content
            if (content.type === NIS_SDK.model.transactionTypes.multisigTransaction) {
                // multisig, data will be in otherTrans
                txData = content.otherTrans
            }

            if (!txData.message || !txData.message.payload) {
                // no message => ignore
                return ;
            }

            let payload = txData.message.payload;
            let plain = NIS_SDK.utils.convert.hex2a(payload);

            // 3) read opt-in request data if available
            try {
                let json = JSON.parse(plain)

                if (json.type === undefined) {
                    throw new Error("ignore")
                }

                // store opt-in request
                const request: OptinRequest = {
                    origin: content.signer,
                    data: Object.assign({}, json)
                }

                requests.push(request)
            }
            catch (e) {}
        })
        return requests
    }

    public async extractAccountsWithSnapshotBalance(
        requests: OptinRequest[]
    ): Promise<NISAccountWithSnapshotBalance[]> {

        let accounts: NISAccountWithSnapshotBalance[] = []
        for (let i = 0, m = requests.length; i < m; i++) {
            const request = requests[i].data
            let destPubKey: string
            let origPubKey: string

            if (request.type === OptinDTOType.SIMPLE_OPTIN_DTO) {
                // found simple optin DTO
                destPubKey = (request as SimpleOptinDTO).destination
                origPubKey = requests[i].origin
            }
            else if (request.type === OptinDTOType.MS_SIGNAL_OPTIN_DTO) {
                // found multisig signal optin DTO
                destPubKey = (request as SignalOptinDTO).destination
                origPubKey = (request as SignalOptinDTO).multisig
            }
            else {
                // current opt-in request is irrelevant for funds distribution
                // opt-in request types that will match here are: 3, 4, 5
                continue;
            }

            const destinationAccount = PublicAccount.createFromPublicKey(destPubKey, this.catapultReader.NETWORK_ID)
            const originAddress = NIS_SDK.model.address.toAddress(origPubKey, this.NETWORK_ID)

            // read account balance
            //XXX should read balance at block X
            const response = await NIS_SDK.com.requests.account.mosaics.owned(this.endpoint, originAddress)
            const mosaics = response.data

            if (!mosaics || !mosaics.length) {
                // account is empty => ignore
                continue;
            }

            const originBalance = mosaics.find((mosaic) => {
                return mosaic.mosaicId.namespaceId === 'nem' && mosaic.mosaicId.name === 'xem'
            })

            accounts.push({
                address: originAddress,
                destination: destinationAccount.publicKey,
                balance: originBalance.quantity,
            })
        }

        return accounts
    }

    public collectMultisigOptinRequests(
        accounts: NISAccountWithSnapshotBalance[],
        requests: OptinRequest[]
    ): SignedTransaction[] {

        let signedTxes: SignedTransaction[] = []

        const cosigOptinRequests = requests.filter((request: OptinRequest) => {
            return request.data.type === OptinDTOType.MS_COSIG_OPTIN_DTO
        })

        // 1) first map cosignatures to correct destination multisig
        const cosignatures = {}
        for (let i = 0, m = cosigOptinRequests.length; i < m; i++) {
            const cosigRequest: CosigOptinDTO = cosigOptinRequests[i].data as CosigOptinDTO
            const msigAddress = NIS_SDK.model.address.toAddress(cosigRequest.multisig, this.NETWORK_ID)
            const msigAccount: NISAccountWithSnapshotBalance = accounts.find((account: NISAccountWithSnapshotBalance) => {
                return account.address === msigAddress
            })

            if (!cosignatures.hasOwnProperty(msigAccount.destination)) {
                cosignatures[msigAccount.destination] = []
            }

            cosignatures[msigAccount.destination].push({
                signer: cosigOptinRequests[i].origin,
                signature: cosigRequest.signature})
        }

        // 2) now fill MultisigAccountModificationTransaction aggregate complete with cosignatures
        const convertOptinRequests = requests.filter((request: OptinRequest) => {
            return request.data.type === OptinDTOType.MS_CONVERT_OPTIN_DTO
        })

        for (let i = 0, m = convertOptinRequests.length; i < m; i++) {
            const convertRequest: ConvertOptinDTO = convertOptinRequests[i].data as ConvertOptinDTO

            // fields are abbreviated in ConvertOptinDTO (room save)
            const destination: string = convertRequest.d
            const aggregatePayload: string = convertRequest.p
            const aggregateHash: string = convertRequest.h

            if (!cosignatures.hasOwnProperty(destination)) {
                // missing cosignatures for current convert request
                console.log('Missing cosignatures for opt-in request: ', convertRequest)
                continue;
            }

            const convertCosignatures = cosignatures[destination]
            const aggregateCosignatures: AggregateTransactionCosignature[] = convertCosignatures.map((cosigDetails) => {
                return new AggregateTransactionCosignature(
                    cosigDetails.signature,
                    cosigDetails.signer
                )
            })

            // found convert optin DTO
            let signedAggregateTransaction = new SignedTransaction(
                aggregatePayload,
                aggregateHash,
                destination,
                TransactionType.AGGREGATE_COMPLETE,
                this.catapultReader.NETWORK_ID
            )

            //XXX
            //aggregateTransaction.addCosignatures(aggregateCosignatures)
            //XXX   

            signedTxes.push(signedAggregateTransaction)
        }

        return signedTxes
    }

    public collectNamespaceOptinRequests(
        requests: OptinRequest[]
    ): SignedTransaction[] {

        let signedTxes: SignedTransaction[] = []

        const namespaceOptinRequests = requests.filter((request: OptinRequest) => {
            return request.data.type === OptinDTOType.NAMESPACE_OPTIN_DTO
        })

        for (let i = 0, m = namespaceOptinRequests.length; i < m; i++) {
            const namespaceRequest: NamespaceOptinDTO = namespaceOptinRequests[i].data as NamespaceOptinDTO

            const destination: string = namespaceRequest.destination
            const namespaceTxPayload: string = namespaceRequest.payload

            const generationHashBytes = Array.from(Convert.hexToUint8(this.catapultReader.GENERATION_HASH));
            const transactionHash = Transaction.createTransactionHash(
                namespaceTxPayload,
                generationHashBytes,
                this.catapultReader.NETWORK_ID
            )

            let signedNamespaceTransaction = new SignedTransaction(
                namespaceTxPayload,
                transactionHash,
                destination,
                TransactionType.NAMESPACE_REGISTRATION,
                this.catapultReader.NETWORK_ID
            )


            signedTxes.push(signedNamespaceTransaction)
        }

        return signedTxes
    }
}
