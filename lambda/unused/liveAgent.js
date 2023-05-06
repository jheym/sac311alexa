const Alexa = require("ask-sdk-core")
const index = require("./index.js")
const axios = require('axios');
const { v4: uuid } = require('uuid');

// This file provides an example of how to use the Alexa Communications API to
// initiate a phone call session from the Skill. AWS Chime SDK is required.
// Refer to the following article for additional details:
// https://docs.aws.amazon.com/chime-sdk/latest/dg/alexa-calling.html

const LiveAgentIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "LiveAgentIntent"
    )
  },
  async handle(handlerInput) {
    let speakOutput;
    try {
      await startCommunicationSession(handlerInput);
      speakOutput = handlerInput.t('LIVEAGENT_CONFIRM');
    } catch (error) {
      speakOutput = handlerInput.t('LIVEAGENT_PROBLEM');
    }

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
}

async function startCommunicationSession(handlerInput) {
  const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
  const endpointId = handlerInput.requestEnvelope.context.System.device.deviceId;
  const sourcePhoneNumber = '+12095686272'
  const destinationPhoneNumber = '+19162090756'
  const request = {
    participants: [
      {
        id: {
          type: 'PHONE_NUMBER',
          value: `${sourcePhoneNumber}`,
        },
        endpointId: `${endpointId}`,
        isOriginator: true,
      },
      {
        id: {
          type: 'PHONE_NUMBER',
          value: `${destinationPhoneNumber}`,
        },
        communicationProviderId: 'amzn1.alexa.csp.id.82bb98bc-384a-11ed-a261-0242ac120002',
      },
    ],
    clientContext: {
      clientSessionId: uuid(),
    },
  };

  try {
    const response = await axios.post(
      'https://api.amazonalexa.com/v1/communications/session',
      JSON.stringify(request),
      {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Successfully started a call. ResponseCode: ${response.status}, ResponseData: ${JSON.stringify(response.data)}`);
  } catch (error) {
    if (error.response.status === 403) {
      console.error('The user does not have calling permissions enabled.')
    }
    console.error(`Failed to start a call. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
    throw error;
  }
}




module.exports = {
  LiveAgentIntentHandler,
  startCommunicationSession
}