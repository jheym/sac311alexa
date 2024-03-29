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
exports.LocalDebugClient = void 0;
const RequestResponseUtils_1 = require("../util/RequestResponseUtils");
const PING_FREQUENCY_IN_MILLISECONDS = 5 * 60 * 1000;
class LocalDebugClient {
    constructor(webSocketClient, skillInvokerConfig) {
        this._skillInvokerConfig = skillInvokerConfig;
        this._webSocketClient = webSocketClient;
        this.configureClientEvents();
        this.heartbeat = setInterval(() => {
            if (this._webSocketClient.readyState === 1) {
                this._webSocketClient.ping('heartbeat');
            }
        }, PING_FREQUENCY_IN_MILLISECONDS);
    }
    configureClientEvents() {
        this._webSocketClient.onopen = (event) => {
            this.connectedEvent();
        };
        this._webSocketClient.onmessage = (event) => {
            this.messageEvent(event.data);
        };
        this._webSocketClient.onerror = (event) => {
            this.errorEvent(event);
        };
        this._webSocketClient.onclose = (event) => {
            this.closeEvent(event);
        };
    }
    connectedEvent() {
        console.log('\n****************************************************DINOSAUR GANG*******************************************', '\n');
        console.log(`%c
                        . - ~ ~ ~ - .
      ..     _      .-~               ~-.
     //|     \\ \`..~                      \`.
    || |      }  }              /       \  \\
(\\   \\\\ \\~^..'                 |         }  \\
 \\\`.-~  o      /       }       |        /    \\
 (__          |       /        |       /      \`.
  \`- - ~ ~ -._|      /_ - ~ ~ ^|      /- _      \`.
              |     /          |     /     ~-.     ~- _
              |_____|          |_____|         ~ - . _ _~_-_
`, `font-family: monospace`);
        console.log('Now Debugging! Console.log() your stuff to test your code!')
        console.log('************************************************************************************************************', '\n');
    }
    messageEvent(data) {
        // console.log('Skill request', '\n', JSON.stringify(JSON.parse(data.toString()), null, 2), '\n');
        const dynamicEndpointsRequest = RequestResponseUtils_1.getDynamicEndpointsRequest(data.toString());
        RequestResponseUtils_1.getSkillResponse(dynamicEndpointsRequest, this._skillInvokerConfig, (responseString) => {
            this.sendResponse(responseString);
        });
    }
    sendResponse(responseString) {
        this._webSocketClient.send(responseString);
    }
    errorEvent(event) {
        console.error('WebSocket error:', event.message);
    }
    closeEvent(event) {
        console.log('WebSocket is closed:', event);
        clearInterval(this.heartbeat);
    }
}
exports.LocalDebugClient = LocalDebugClient;
//# sourceMappingURL=LocalDebugClient.js.map