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
    RegisterNamespaceTransaction,
    Transaction,
    UInt64,
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

    public getNamespaceTransactions(namespaces: any[]): RegisterNamespaceTransaction[] {

        // shortcuts
        const ONE_YEAR_BLOCKS = (365 * 24 * 60 * 60) / 15; //XXX read block_target_seconds

        const rootNamespacesTxes: RegisterNamespaceTransaction[] = [];
        const subNamespacesTxes: RegisterNamespaceTransaction[] = [];
        namespaces.map((namespace: any) => {
            if (namespace.fqn.indexOf('.') !== -1) {
                // currently processing ROOT namespace

                rootNamespacesTxes.push(RegisterNamespaceTransaction.createRootNamespace(
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

                subNamespacesTxes.push(RegisterNamespaceTransaction.createSubNamespace(
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

    public getMosaicTransactions(mosaics: any[]): Transaction[] {
        //XXX each MosaicDefinitionTransaction
        //XXX each MosaicSupplyChangeTransaction

        return [];
    }

    public getMultisigTransactions(cosignatories: any[]): Transaction[] {
        //XXX AggregateTransaction.createBonded with `cosignatories`

        return [];
    }

}