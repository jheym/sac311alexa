const Alexa = require('ask-sdk-core');

const PotHoleRequestHandler = {
    canHandle(handlerInput){
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "PotHoleIntent"
        )
        },
        handle(handlerInput){
            const speechText =  "Thank you for reporting the incident"
            return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard("Thank you for reporting the pot hole.")
            
        
        .getResponse()
    },
    
}

module.exports = { PotHoleRequestHandler }