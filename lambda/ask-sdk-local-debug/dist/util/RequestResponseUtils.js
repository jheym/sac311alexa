"use strict";
/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License').
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the 'license' file accompanying this file. This file is distributed
 * on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSkillResponse = exports.getDynamicEndpointsRequest = void 0;
const DynamicEndpointsRequest_1 = require("../request/DynamicEndpointsRequest");
function getDynamicEndpointsRequest(skillRequest) {
    return Object.assign({ DynamicEndpointsRequest: DynamicEndpointsRequest_1.DynamicEndpointsRequest }, JSON.parse(skillRequest));
}
exports.getDynamicEndpointsRequest = getDynamicEndpointsRequest;
const ERROR_CODE = '500';
const SKILL_RESPONSE_SUCCESS_MESSAGE_TYPE = 'SkillResponseSuccessMessage';
const SKILL_RESPONSE_FAILURE_MESSAGE_TYPE = 'SkillResponseFailureMessage';
function getSkillResponse(dynamicEndpointsRequest, skillInvokerConfig, callback) {
    skillInvokerConfig.handler(JSON.parse(dynamicEndpointsRequest.requestPayload), null, (_invokeErr, response) => {
        let responseString;
        if (_invokeErr == null) {
            const successResponse = {
                type: SKILL_RESPONSE_SUCCESS_MESSAGE_TYPE,
                originalRequestId: dynamicEndpointsRequest.requestId,
                version: dynamicEndpointsRequest.version,
                responsePayload: JSON.stringify(response),
            };
            responseString = JSON.stringify(successResponse, null, 2);
        }
        else {
            const failureResponse = {
                type: SKILL_RESPONSE_FAILURE_MESSAGE_TYPE,
                version: dynamicEndpointsRequest.version,
                originalRequestId: dynamicEndpointsRequest.requestId,
                errorCode: ERROR_CODE,
                errorMessage: _invokeErr.message,
            };
            responseString = JSON.stringify(failureResponse, null, 2);
        }
        // console.log('Skill response', '\n', responseString);
        // console.log('----------------------');
        callback(responseString);
    });
}
exports.getSkillResponse = getSkillResponse;
//# sourceMappingURL=RequestResponseUtils.js.map