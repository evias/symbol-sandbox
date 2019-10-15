
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

// internal dependencies
import { Service } from './Service';

export const NIS_SDK = require('nem-sdk').default;
export const DEFAULT_NIS_URL = 'http://hugetestalice.nem.ninja:7890';
export const DEFAULT_NIS_NETWORK_ID = NIS_SDK.model.network.data.testnet.id;

export interface MosaicDefinitionWithSupply {
    definition: any,
    supply: number
}

export class NISDataReader extends Service {

    protected endpoint: any;

    constructor(
        public readonly URL: string = DEFAULT_NIS_URL,
        public readonly PORT: number = 7890,
        public readonly NETWORK_ID: number = DEFAULT_NIS_NETWORK_ID,
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

    public async getCreatedNamespaces(address: string) {

        //XXX must query multiple pages

        const response = await NIS_SDK.com.requests.account.namespaces.owned(this.endpoint, address);
        return response.data;
    }

    public async getCreatedMosaics(address: string): Promise<MosaicDefinitionWithSupply[]> {

        //XXX must query multiple pages

        const output: MosaicDefinitionWithSupply[] = []
        try {

            const response = await NIS_SDK.com.requests.account.mosaics.definitions(this.endpoint, address);
            const mosaics = response.data

            if (! mosaics.length) {
                return []
            }

            // add non-mutable mosaics first
            const fixSupply = mosaics.filter((mosaicDef) => mosaicDef.properties[2].value === 'false')
            fixSupply.map((mosaicDef) => {
                output.push({
                    definition: mosaicDef,
                    supply: parseInt(mosaicDef.properties[1].value)})
                })

            // query supply for supplyMutable mosaics
            const mutableSupply = mosaics.filter((mosaicDef) => mosaicDef.properties[2].value === 'true')
            mutableSupply.map(async (mosaicDef) => {
                const mosaicId = mosaicDef.id.namespaceId + ':' + mosaicDef.id.name
                const supplyMutable = mosaicDef.properties[2].value === 'true'
                const initialSupply = parseInt(mosaicDef.properties[1].value)

                try {
                    // read current supply from network if necessary
                    const supplyResponse = await NIS_SDK.com.requests.mosaic.supply(this.endpoint, mosaicId);
                    const currentSupply = parseInt(supplyResponse.supply)

                    output.push({definition: mosaicDef, supply: currentSupply})
                }
                catch(e) {}
            })

            return output
        }
        catch(e) {
            return []
        }

        return output;
    }

    public async getMultisigInfo(address: string) {

        const accountInfo = await NIS_SDK.com.requests.account.data(this.endpoint, address);
        const multisigInfo = accountInfo.account.multisigInfo;
        const cosignatories = accountInfo.meta.cosignatories;

        if (! multisigInfo || ! multisigInfo.hasOwnProperty('cosignatoriesCount')) {
            return false;
        }

        return {
            cosignatoriesCount: parseInt(multisigInfo.cosignatoriesCount),
            minCosignatories: parseInt(multisigInfo.minCosignatories),
            cosignatories: cosignatories
        };
    }
}
