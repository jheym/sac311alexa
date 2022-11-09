const Alexa = require('ask-sdk-core');

const petcomplaintHandler = {
    canHandle(handlerInput){
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "petcomplaintIntent"
            
        );
            
            
        },
        handle(handlerInput){
      
        
            const speechText =  'Thank you for reporting the pet complaint';
            return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Thank you for reporting the petcomlaint.', speechText)
            .getResponse();
            
            
    }
    
};

module.exports = { petcomplaintHandler }