const Alexa = require("ask-sdk-core")
const index = require("./index.js")

const ConfirmAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "ConfirmAbandonedVehicleIntent"
    )
  },
  handle(handlerInput) {
    // Storing the current intent in the session handler https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/guide/Dialog-Management-Guide.pdf?aliId=29905953
    let currentIntent = handlerInput.requestEnvelope.request.intent
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes['ConfirmAbandonedVehicleIntent'] = currentIntent
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

    const speakOutput = "Just to confirm, are you reporting an abandoned vehicle?"
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect')
    return (
      handlerInput.responseBuilder
        .addDelegateDirective()
        .withShouldEndSession(false)
        .speak(speakOutput)
        .getResponse()
    )
  },
}

const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
    )
  },
  handle(handlerInput) {
    if (Alexa.getDialogState(handlerInput.requestEnvelope) !== "COMPLETED") {
      return (
        handlerInput.responseBuilder
          .addDelegateDirective()
          .getResponse()
      )
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {
      var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make')
      var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model')
      speakOutput = `Thank you for reporting the abandoned ${make} ${model}. We'll dispatch someone to the incident as soon as we can.`
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(true) // Replace this later to go back to welcome message optionally
          .getResponse()
      )
    }
  },
}

const YesAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'IsAbandonedTime')
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
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    tempSlots = sessionAttributes['ConfirmAbandonedVehicleIntent'].slots
    return (
      handlerInput.responseBuilder
        .addDelegateDirective({ // This is what intent chaining looks like https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2019/03/intent-chaining-for-alexa-skill
          name: 'AbandonedVehicleIntent',
          confirmationStatus: 'NONE',
          slots: { // Adding slots that may have been collected by ConfirmAbandonedVehicleIntent
            make: {
              name: 'make',
              value: tempSlots.make.value,
              confirmationStatus: 'NONE'
            },
            model: {
              name: 'model',
              value: tempSlots.model.value,
              confirmationStatus: 'NONE'
            },
            color: {
              name: 'color',
              value: tempSlots.color.value,
              confirmationStatus: 'NONE'
            }
          }
        })
        .getResponse()
    )
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
  ConfirmAbandonedVehicleIntentHandler,
  AbandonedVehicleIntentHandler,
  YesAbandonedVehicleIntentHandler,
  YesAbandonedVehicleTimeIntentHandler,
  NoAbandonedVehicleIntentHandler,
  NoAbandonedVehicleTimeIntentHandler
}
