
const Alexa = require("ask-sdk-core")
const index = require("./index.js")


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
      const speakOutput = handlerInput.t("ABANDONED_VEHICLE_CONFIRMATION")
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

      // if (currentIntent.confirmationStatus === 'NONE') {
      //   return responseBuilder
      //     .addConfirmIntentDirective()
      //     .speak('Do you want to confirm this intent?')
      //     .getResponse()
      // }

      // If the user denies the slots, we need to clear the slots and start over
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
        speakOutput = handlerInput.t('ABANDONED_VEHICLE_THANKS',{color: `${color}`, make: `${make}`, model: `${model}`, location: `${location}`})

        index.clearSlots(handlerInput, requestEnvelope.request.intent) //clear the slots
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
        .speak(handlerInput.t('ABANDONED_VEHICLE_72Q'))
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
        slots: {}
      })
      .getResponse()
  }
}

const NoAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect?'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('UNKNOWN_MSG'))
        .reprompt(handlerInput.t('UNKNOWN_MSG_REPROMPT'))
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
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime?'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('ABANDONED_VEHICLE_72A'))
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
