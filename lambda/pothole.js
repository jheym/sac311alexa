const Alexa = require('ask-sdk-core');

const PotHoleRequestHandler = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "PotHoleIntent"

        );


    },
    handle(handlerInput) {


        const speechText = 'Thank you for reporting the pothole';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Thank you for reporting the pothole.', speechText)
            .getResponse();


    }

};

module.exports = { PotHoleRequestHandler }