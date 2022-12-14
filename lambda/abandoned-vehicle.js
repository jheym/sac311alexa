
const Alexa = require("ask-sdk-core")
const index = require("./index.js")
const liveAgent = require("./liveAgent")


const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
    )
  },

  handle(handlerInput) {
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput
    const currentIntent = requestEnvelope.request.intent;
    const sessionAttributes = attributesManager.getSessionAttributes()

    if (Alexa.getDialogState(requestEnvelope) === "STARTED") {
      index.setQuestion(handlerInput, null);
      index.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect?')
      const speakOutput = "Just to confirm, are you reporting an abandoned vehicle?"
      return responseBuilder
        .withShouldEndSession(false)
        .speak(speakOutput)
        .getResponse();
    }

    // if (Alexa.getDialogState(requestEnvelope) === 'COMPLETED') {
    //   if (currentIntent.confirmationStatus !== 'DENIED') {
    //     return responseBuilder
    //       // .addConfirmIntentDirective()
    //       // .speak('Is this what you wanted?')

    //       .getResponse();
    //   } else {
    //     console.log('Intent confirmation is DENIED')
    //   }
    // }

    // if (requestEnvelope.request.intent.confirmationStatus === "DENIED") {
    //   console.log("Abandoned vehicle intent confirmation was DENIED")
    //   let updatedIntent = currentIntent;
    //   // for (key in updatedIntent.slots) {
    //   //   // updatedIntent.slots[key].value = null;
    //   //   delete updatedIntent.slots[key].value;
    //   // }

    //   updatedIntent.confirmationStatus = 'NONE';

    //   return responseBuilder
    //     .addDelegateDirective(updatedIntent)
    //     .withShouldEndSession(false)
    //     .getResponse();
    // }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS") {
      if (currentIntent.confirmationStatus === 'DENIED') {
        console.log("Abandoned vehicle intent confirmation was DENIED")
        let updatedIntent = currentIntent;
        for (key in updatedIntent.slots) {
          delete updatedIntent.slots[key].value;
        }

        updatedIntent.confirmationStatus = 'NONE';

        return responseBuilder
          .addDelegateDirective(updatedIntent)
          .withShouldEndSession(false)
          .getResponse();
      } else {
        return responseBuilder
          .addDelegateDirective(currentIntent)
          .getResponse();
      }
    }



    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {

      if (currentIntent.confirmationStatus === 'NONE') {
        return responseBuilder
          .addConfirmIntentDirective()
          .speak('Do you want to confirm this intent?')
          .getResponse()
      }

      if (currentIntent.confirmationStatus === 'DENIED') {
        console.log("Abandoned vehicle intent confirmation was DENIED")
        let updatedIntent = currentIntent;
        for (key in updatedIntent.slots) {
          delete updatedIntent.slots[key].value;
        }

        updatedIntent.confirmationStatus = 'NONE';

        return responseBuilder
          .addDelegateDirective(updatedIntent)
          .withShouldEndSession(false)
          .getResponse();
      }



      {
        var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make');
        var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model');
        var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
        var location = sessionAttributes.confirmedLocation;
        speakOutput = `Thank you for reporting the abandoned ${color} ${make} ${model} located near ${location}. We'll dispatch someone to the incident as soon as we can. Is there anything else I can help you with?`
        //TODO: Set question for "anything else?" 
        return responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false) // TODO: go back to welcome message optionally if there's anything else?
          .getResponse();
      }
    }
  },
}

const YesAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect?'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'IsAbandonedTime?')
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes.reasonForCalling = 'AbandonedVehicleIntent' // So GetLocationIntent knows where to delegate back to after confirming the address
    return (
      handlerInput.responseBuilder
        .speak('Has the vehicle been abandoned for more than seventy-two hours?')
        .withShouldEndSession(false)
        .getResponse()
    )
  }
}

const YesAbandonedVehicleTimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime?'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()

    return responseBuilder
      .addDelegateDirective({
        name: 'GetLocationIntent',
        confirmationStatus: 'NONE',
        slots: {
          location: {
            name: 'location',
            value: sessionAttributes['AbandonedVehicleIntent'].slots.abandonedVehicleLocation.value,
            confirmationStatus: 'NONE'
          }
        }
      })
      .getResponse()
  }
}

const NoAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak("Sorry about that. If you try phrasing your issue differently, I may be able to understand. I'll wait.")
        .reprompt("I'm still here. Do you want to try reporting your issue again?")
        .withShouldEndSession(false) // This prevents the skill from ending the session
        .getResponse()
    )
  }
}

const NoAbandonedVehicleTimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak("Unfortunately we cannot take action until the vehicle has been abandoned for more than 72 hours. \
        Is there anything else I can help you with?")
        .withShouldEndSession(false) // This prevents the skill from ending the session
        .getResponse()
    )
  }
}

module.exports = {
  AbandonedVehicleIntentHandler,
  YesAbandonedVehicleIntentHandler,
  YesAbandonedVehicleTimeIntentHandler,
  NoAbandonedVehicleIntentHandler,
  NoAbandonedVehicleTimeIntentHandler
}
