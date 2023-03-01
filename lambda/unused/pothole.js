const Alexa = require('ask-sdk-core');
const PotHoleRequestHandler = {
    canHandle(handlerInput){
        //const attributesManager = handlerInput.attributesManager;
        //const sessionAttributes = attributesManager.getSessionAttributes() || {};

        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "PotHoleIntent");
        },
    
        handle(handlerInput){
      
            //const currentIntent = handlerInput.requestEnvelope.request.intent;
            const speechText =  'Thank you for reporting the pothole';
            return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();


    }

};
const StartedPotholeHandler = {
    canHandle(handlerInput){
        
    return (Alexa.getRequestType(handlerInput.requestEnvelope)== "IntentRequest" && Alexa.getIntentName(handler.requestEnvelope) === "PotHoleIntent" && Alexa.getDialogState(handler.requestEnvelope)=== "STARTED");
    },
    handle(handlerInput){
        const currentIntent = handlerInput.requestEnvelope.request.intent;
      //  let address= currentIntent.slots.address
    //Create a condition to check whether address is empty
        //if(!address.value){
        //    currentIntent.slots.address.value = "100 Antler Dr.";

      //  }
        return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();

    }
    };

const InProgressPotholeHandler = {
    canHandle(handlerInput){
        const request  = handlerInput.requestEnvelope.request;
        return (Alexa.getRequestType(handlerInput.requestEnvelope)== "IntentRequest" && Alexa.getIntentName(handler.requestEnvelope) === "PotHoleIntent" && Alexa.getDialogState(handler.requestEnvelope)=== "IN_PROGRESS");
    },
    handle(handlerInput){
       // const currentIntent = handlerInput.requestEnvelope.request.intent;

    //Create a condition to check whether address is empty
       
        return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();

    }
    }; 
const CompletedPotholeHander = {
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        return (Alexa.getRequestType(handlerInput.requestEnvelope)== "IntentRequest" && Alexa.getIntentName(handler.requestEnvelope) === "PotHoleIntent" && Alexa.getDialogState(handler.requestEnvelope)=== "COMPLETE");
    },
    handle(handlerInput){
        const speechText =  'Thank you for reporting the pothole';
        const updatedIntent = handlerInput.requestEnvelope.request.intent;
        return handlerInput.responseBuilder
        .addDelegateDirective(updatedIntent)
        .getResponse();

    }
};

module.exports = { PotHoleRequestHandler, StartedPotholeHandler,InProgressPotholeHandler,CompletedPotholeHander }