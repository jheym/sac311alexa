const Alexa = require('ask-sdk-core');

const strayAnimalHandler = {
    canHandle(handlerInput){
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "strayAnimalIntent"
            
        );
            
            
        },
        handle(handlerInput){
      
        
            const speechText =  'Thank you for reporting the stray animal';
            return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Thank you for reporting the stray animal.', speechText)
            .getResponse();
            
            
    }
    
};

module.exports = { strayAnimalHandler }