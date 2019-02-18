/*
 * Copyright 2018 NEM
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

import { expect } from "chai";
import {
  UInt64,
  MosaicId,
  MosaicService,
  AccountHttp,
  MosaicHttp,
  NamespaceHttp,
  MosaicView,
  MosaicInfo
} from "nem2-sdk";

import "mocha";

describe('SDK_Version_Auditor', () => {
  it('should create MosaicInfo with MosaicInfo.nonce field', () => {
    const mosaicId = new MosaicId([3294802500, 2243684972]); // XEM
    const mosaicService = new MosaicService(
        new AccountHttp("http://localhost:3000"), new MosaicHttp("http://localhost:3000"), new NamespaceHttp("http://localhost:3000"));
    return mosaicService.mosaicsView([mosaicId]).subscribe((mosaicsView: MosaicView[]) => {
        const mosaicView = mosaicsView[0];
        expect(mosaicView.mosaicInfo).to.be.an.instanceof(MosaicInfo);
        expect(mosaicView.mosaicInfo.nonce).to.not.be.empty;
    });
  });
});
