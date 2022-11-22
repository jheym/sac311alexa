const Alexa = require('ask-sdk-core');
//next is to incorporate address
//slot type for all sacramento parks?


const dirtyBathroomHandler = {
    canHandle(handlerInput){
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "dirtyParkBathroomIntent"
            
        );
            
            
        },
        handle(handlerInput){
      
        
            const speechText =  'Thank you for reporting the dirty bathroom';
            return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Thank you for reporting the dirty bathroom.', speechText)
            .getResponse();
            
            
    }
    
};

module.exports = { dirtyBathroomHandler }