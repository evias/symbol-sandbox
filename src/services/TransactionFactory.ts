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
    Deadline,
    NamespaceRegistrationTransaction,
    Transaction,
    UInt64,
    MosaicDefinitionTransaction,
    MosaicFlags,
    MosaicId,
    MosaicNonce,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
    PublicAccount,
} from 'nem2-sdk';

// internal dependencies
import { CATDataReader } from './CATDataReader';
import { Service } from './Service';

export class TransactionFactory extends Service {

    constructor(
        public readonly catapultReader: CATDataReader,
    ) {
        super();
    }

    public getNamespaceTransactions(namespaces: any[]): NamespaceRegistrationTransaction[] {

        // shortcuts
        const ONE_YEAR_BLOCKS = (365 * 24 * 60 * 60) / 15; //XXX read block_target_seconds

        const rootNamespacesTxes: NamespaceRegistrationTransaction[] = [];
        const subNamespacesTxes: NamespaceRegistrationTransaction[] = [];
        namespaces.map((namespace: any) => {
            if (namespace.fqn.indexOf('.') !== -1) {
                // currently processing ROOT namespace

                rootNamespacesTxes.push(NamespaceRegistrationTransaction.createRootNamespace(
                    Deadline.create(),
                    namespace.fqn,
                    UInt64.fromUint(ONE_YEAR_BLOCKS),
                    this.catapultReader.NETWORK_ID
                ));
            }
            else {
                // currently processing SUB namespace

                //XXX fix regexp
                const subName = namespace.fqn.replace(/(.*)+\.([a-zA-Z0-9-_]+)$/, '$2');
                const parentName = namespace.fqn.replace(/(.*)+\.([a-zA-Z0-9-_]+)$/, '$1');

                subNamespacesTxes.push(NamespaceRegistrationTransaction.createSubNamespace(
                    Deadline.create(),
                    subName,
                    parentName,
                    this.catapultReader.NETWORK_ID
                ));
            }
        });

        //XXX sub namespaces must be ordered to make sure level1 is created before level2

        return [].concat(rootNamespacesTxes, subNamespacesTxes);
    }

    public getMosaicTransactions(mosaicsWithSupply: any[]): Transaction[] {
        // shortcuts
        const ONE_YEAR_BLOCKS = (365 * 24 * 60 * 60) / 15; //XXX read block_target_seconds

        let mosaicConfigurationTxes: Transaction[] = [];
        let catapultMosaicLabels: object = {};
        mosaicsWithSupply.map((mosaicWithSupply) => {
            const {fqn, definition, supply} = mosaicWithSupply

            const ownerPublicKey = definition.creator.toUpperCase()
            const ownerPubAccount = PublicAccount.createFromPublicKey(
                ownerPublicKey,
                this.catapultReader.NETWORK_ID
            )

            // prepare mosaic flags / properties
            const isMutableSupply = definition.properties[2].value === 'true'
            const isTransferable = definition.properties[3].value === 'true'
            const mosaicFlags = MosaicFlags.create(
                isMutableSupply, // supplyMutable
                isTransferable, // transferable
                false // restrictable
            )
            const divisibility = parseInt(definition.properties[0].value)
            const mosaicSupply = supply

            // create nonce and id
            const mosaicNonce = MosaicNonce.createRandom();
            const mosaicId = MosaicId.createFromNonce(mosaicNonce, ownerPubAccount);
            const catLabel = this.catapultReader.formatMosaicName(fqn)

            catapultMosaicLabels[catLabel] = mosaicId

            // create mosaic definition
            const definitionTx =  MosaicDefinitionTransaction.create(
                Deadline.create(),
                mosaicNonce,
                mosaicId,
                mosaicFlags,
                divisibility,
                UInt64.fromUint(ONE_YEAR_BLOCKS), // 100'000 blocks
                this.catapultReader.NETWORK_ID,
                UInt64.fromUint(1000000), // 1 XEM fee
            );

            // create mosaic supply
            const supplyTx = MosaicSupplyChangeTransaction.create(
                Deadline.create(),
                mosaicId,
                MosaicSupplyChangeAction.Increase,
                UInt64.fromUint(mosaicSupply),
                this.catapultReader.NETWORK_ID,
                UInt64.fromUint(1000000), // 1 XEM fee
            );

            mosaicConfigurationTxes.push(definitionTx)
            mosaicConfigurationTxes.push(supplyTx)
        })

        // XXX should also register namespaces & create aliases

        return mosaicConfigurationTxes;
    }

    public getMultisigTransactions(cosignatories: any[]): Transaction[] {
        //XXX AggregateTransaction.createBonded with `cosignatories`

        return [];
    }

}