const Alexa = require("ask-sdk-core")
const index = require("./index.js")


const HomelessCampIntentHandler = {
    canHandle(handlerInput){
        return(Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" 
        && Alexa.getIntentName(handlerInput.requestEnvelope) === "HomelessCampIntent")
    },
    handle(handlerInput){
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        sessionAttributes[currentIntent.name] = currentIntent
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        
     /*   if(Alexa.getDialogState(handlerInput.requestEnvelope) !== "COMPLETED"){
            return(handlerInput.responseBuilder
                        .addDelegateDirective(currentIntent)
                        .getResponse()
                
                )

        }
    if(Alexa.getDialogState(handlerInput.requestEnvelope) !== "COMPLETED"){
        var homelessCamp = Alexa.getSlotValue(handlerInput.requestEnvelope, 'homelessCamp')
        var propertyType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'propertyType')
        speakOutput = `Thank you for reporting the ${homelessCamp} on ${propertyType}.`
        return (
            handlerInput.responseBuilder   
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse()
        )
    }*/
    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED") {
        // sessionAttributes[currentIntent.name] = currentIntent
        // sessionAttributes.reasonForCalling = 'AbandonedVehicleIntent'
        // handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
  
        const speakOutput = "Just to confirm, are you reporting an Homeless Encampment?"
        index.setQuestion(handlerInput, null)
        index.setQuestion(handlerInput, 'IsHomelessCampCorrect')
        return (
          handlerInput.responseBuilder
            // .addDelegateDirective()
            .withShouldEndSession(false)
            .speak(speakOutput)
            .getResponse()
        )
      }
  
  
      if (Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS") {
        return (
          handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse()
        )
      }
      if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {
        var homelessCamp = Alexa.getSlotValue(handlerInput.requestEnvelope, 'homelessCamp')
        var propertyType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'propertyType')
        var numPeople    = Alexa.getSlotValue(handlerInput.requestEnvelope, 'numPeople')
        
        speakOutput = `Thank you for reporting the ${homelessCamp} on ${propertyType}. The number of people ${numPeople}.`
        //
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false) // Replace this later to go back to welcome message optionally
            .getResponse()
        )
      }
    },
}
  const YesHomelessCampIntentHandler = {
    canHandle(handlerInput){
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
            && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsHomelessCampCorrect')
            
            
    },
    handle(handlerInput){
        
        index.setQuestion(handlerInput,null)
        index.setQuestion(handlerInput,'I')
        return(handlerInput.responseBuilder
                .addDelegateDirective({
                  name: 'HomelessCampIntent',
                  confirmationStatus: 'NONE',
                  slots: {}
                })
                .withShouldEndSession(false)
                .getResponse()

            
            )
    }
 
    
  }
  const NoHomelessCampIntentHandler = {
    canHandle(handlerInput){
        return(  Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
        && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsHomelessCampCorrect')

    },
    handle(handlerInput){
        index.setQuestion(handlerInput, null)
        index.setQuestion(handlerInput, 'TryAgain')
        return(
            handlerInput.responseBuilder    
            .addDelegateDirective({
              name: 'HomelessCampIntent',
              confirmationStatus: 'NONE',
              slots: {}
            })
            .withShouldEndSession(false) // This prevents the skill from ending the session
            .getResponse()
        )
    }
        
}
  module.exports = {HomelessCampIntentHandler, YesHomelessCampIntentHandler, NoHomelessCampIntentHandler}
